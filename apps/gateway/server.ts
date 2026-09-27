import { createHash, timingSafeEqual } from "node:crypto";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { WorkerSupervisor } from "../desktop/main/worker";
import { EvolutionCoordinator } from "../desktop/main/evolution";
import { RunStore } from "../desktop/main/runs";
import { assertJob, isQuantumResult, type EvolutionJob, type QuantumJob, type QuantumResult } from "../../packages/contracts";
import { consistentTopologyResult } from "../../packages/models/topology";

export interface GatewayOptions {
  root: string;
  dataDir: string;
  webDir: string;
  token: string;
  host?: string;
  port?: number;
  origin?: string;
  tls?: { key: Buffer; cert: Buffer };
}

function json(response: ServerResponse, status: number, value: unknown) {
  const bytes = Buffer.from(JSON.stringify(value));
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8",
    "Content-Length": bytes.length, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(bytes);
}
async function body(request: IncomingMessage): Promise<unknown> {
  if (request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json")
    throw new Error("Content-Type must be application/json");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 65536) throw new Error("Job request exceeds 64 KiB");
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("Invalid JSON body"); }
}
function authorized(request: IncomingMessage, digest: Buffer): boolean {
  const value = request.headers.authorization;
  if (!value || value.length > 512 || !value.startsWith("Bearer ")) return false;
  const presented = createHash("sha256").update(value.slice(7)).digest();
  return timingSafeEqual(presented, digest);
}
function security(response: ServerResponse) {
  response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
}
export async function startGateway(options: GatewayOptions) {
  if (!/^[\x21-\x7e]{32,256}$/.test(options.token))
    throw new Error("QLAB_GATEWAY_TOKEN must be 32–256 printable ASCII characters");
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8765;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid gateway port");
  if (host !== "127.0.0.1" && host !== "::1" && !options.tls)
    throw new Error("Non-loopback gateway binding requires TLS");
  if (host !== "127.0.0.1" && host !== "::1" && !options.origin)
    throw new Error("Non-loopback gateway binding requires QLAB_GATEWAY_ORIGIN");
  if (options.origin) {
    const origin = new URL(options.origin);
    if (origin.origin !== options.origin || origin.protocol !== (options.tls ? "https:" : "http:"))
      throw new Error("Gateway origin must be an exact HTTP(S) origin matching TLS mode");
  }
  const worker = new WorkerSupervisor(options.root);
  const status = await worker.start();
  if (status.state !== "READY") throw new Error(status.detail);
  const artifacts = join(options.dataDir, "artifacts");
  const runs = new RunStore(join(options.dataDir, "runs"), artifacts);
  const coordinator = new EvolutionCoordinator(worker, artifacts, () => {});
  const digest = createHash("sha256").update(options.token).digest();
  let busy = false;
  let allowedOrigin = options.origin ?? "";
  let totalCalls = 0;
  const recentCalls: { at: string; method: string; route: string; status: number; durationMs: number }[] = [];
  const handler = async (request: IncomingMessage, response: ServerResponse) => {
    security(response);
    const method = request.method ?? "";
    const path = request.url?.split("?")[0] ?? "";
    if (request.headers.host !== new URL(allowedOrigin).host ||
        (request.headers.origin && request.headers.origin !== allowedOrigin)) {
      json(response, 403, { error: "Origin rejected" }); return;
    }
    if ((path === "/" || path === "/web.js" || path === "/web.css" || path === "/dashboard.css" || path === "/atlas.css" || path === "/topology.css") && method === "GET") {
      const file = path === "/" ? "index.html" : path.slice(1);
      try {
        const bytes = await readFile(join(options.webDir, file));
        response.writeHead(200, { "Content-Type": path === "/" ? "text/html; charset=utf-8" :
          path.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/css; charset=utf-8",
          "Content-Length": bytes.length, "Cache-Control": "no-store" });
        response.end(bytes);
      } catch { json(response, 404, { error: "Web client not built" }); }
      return;
    }
    if (!path.startsWith("/api/")) { json(response, 404, { error: "Not found" }); return; }
    if (!authorized(request, digest)) {
      response.setHeader("WWW-Authenticate", "Bearer realm=\"quantum-lab\"");
      json(response, 401, { error: "Authentication required" }); return;
    }
    if (!new Set(["/api/status", "/api/resources", "/api/activity"]).has(path)) {
      const started = performance.now();
      const route = path === "/api/jobs" || path === "/api/runs" ? path :
        /^\/api\/artifacts\/[^/]+$/.test(path) ? "/api/artifacts/:jobId" :
        /^\/api\/jobs\/[^/]+\/cancel$/.test(path) ? "/api/jobs/:jobId/cancel" : "/api/other";
      response.once("finish", () => {
        totalCalls++;
        recentCalls.unshift({ at: new Date().toISOString(), method, route, status: response.statusCode,
          durationMs: Math.round(performance.now() - started) });
        recentCalls.length = Math.min(recentCalls.length, 20);
      });
    }
    if (method === "GET" && path === "/api/status") { json(response, 200, worker.status); return; }
    if (method === "GET" && path === "/api/resources") {
      try { json(response, 200, await worker.resources()); }
      catch { json(response, 503, { error: "Worker resources unavailable" }); }
      return;
    }
    if (method === "GET" && path === "/api/activity") {
      json(response, 200, { schema: "gateway-activity/v1", totalCalls, recent: recentCalls }); return;
    }
    if (method === "GET" && path === "/api/runs") { json(response, 200, await runs.list()); return; }
    const artifactMatch = /^\/api\/artifacts\/([A-Za-z0-9_-]{1,100})$/.exec(path);
    if (method === "GET" && artifactMatch) {
      try {
        const bytes = await coordinator.readData(artifactMatch[1]);
        response.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": bytes.length,
          "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="${artifactMatch[1]}.f64"` });
        response.end(Buffer.from(bytes));
      } catch { json(response, 404, { error: "Verified artifact unavailable" }); }
      return;
    }
    const cancelMatch = /^\/api\/jobs\/([A-Za-z0-9_-]{1,100})\/cancel$/.exec(path);
    if (method === "POST" && cancelMatch) {
      json(response, 200, { accepted: await coordinator.cancel(cancelMatch[1]) }); return;
    }
    if (method !== "POST" || path !== "/api/jobs") { json(response, 404, { error: "Not found" }); return; }
    if (busy) { json(response, 409, { error: "Another job is running" }); return; }
    let job: QuantumJob;
    try {
      const raw = await body(request);
      assertJob(raw);
      if (!["diagonalize", "evolve", "circuit", "topology"].includes(raw.operation))
        throw new Error("Web gateway currently supports spectrum, evolution, circuit and topology jobs");
      job = raw;
    } catch (error) { json(response, 400, { error: error instanceof Error ? error.message : "Invalid job" }); return; }
    if (!worker.status.capabilities?.operations.includes(job.operation) ||
        !worker.status.capabilities.engines[job.engine]?.available) {
      json(response, 422, { error: "Selected engine unavailable" }); return;
    }
    busy = true;
    try {
      let result: QuantumResult;
      if (job.operation === "evolve") result = await coordinator.run(job as EvolutionJob);
      else {
        const value = await worker.request("quantum.run", job, 60000);
        if (!isQuantumResult(value) || value.operation !== job.operation ||
            value.jobId !== job.jobId || value.engine.name !== job.engine ||
            JSON.stringify(value.model) !== JSON.stringify(job.model) ||
            (job.operation === "topology" &&
              (value.operation !== "topology" || !consistentTopologyResult(job, value))))
          throw new Error("Worker returned a mismatched result");
        result = value;
      }
      await runs.record(job, result);
      json(response, 200, result);
    } catch (error) {
      json(response, 422, { error: error instanceof Error ? error.message : "Job failed" });
    } finally { busy = false; }
  };
  const serve = (req: IncomingMessage, res: ServerResponse) => void handler(req, res).catch(() => {
    if (!res.headersSent) json(res, 500, { error: "Gateway failed" });
    else res.destroy();
  });
  const server = options.tls ? createHttpsServer(options.tls, serve) : createHttpServer(serve);
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.maxConnections = 64;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, () => { server.off("error", reject); resolve(); });
    });
  } catch (error) { await worker.stop(); throw error; }
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Gateway address unavailable");
  allowedOrigin = options.origin ?? `${options.tls ? "https" : "http"}://${host === "::1" ? "[::1]" : host}:${address.port}`;
  return { origin: allowedOrigin, server, worker, close: async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await worker.stop();
  } };
}
