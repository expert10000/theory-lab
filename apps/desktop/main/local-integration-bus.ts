import { createServer, type Server, type Socket } from "node:net";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { lstat, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { homedir } from "node:os";
import type { RunStore } from "./runs";

const SCHEMA = "quantum-local-bus/v1";
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9_-]{1,100}$/;
type Notice = { type: "run-completed"; runId: string; resultSha256: string; model: string; at: string };
type ProgressNotice = { type: "job-progress"; jobId: string; completed: number; total: number; fraction: number };

export function integrationBusRoot(): string {
  const override = process.env.QUANTUM_INTEGRATION_BUS_HOME;
  if (override && (!isAbsolute(override) || resolve(override) !== override)) throw new Error("Invalid integration bus root");
  return override ?? join(homedir(), ".quantum-integration-bus");
}

export async function startLocalIntegrationBus(runs: RunStore, root: string, handoffRoot: string) {
  if (!isAbsolute(root) || resolve(root) !== root || !isAbsolute(handoffRoot) || resolve(handoffRoot) !== handoffRoot)
    throw new Error("Integration bus roots must be absolute");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const token = randomBytes(32).toString("hex");
  const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\quantum-local-${token.slice(0, 20)}` : join(root, `${token.slice(0, 20)}.sock`);
  const subscribers = new Set<Socket>();
  let latest: Notice | null = null;
  for (const saved of await runs.list()) {
    try {
      const verified = await runs.inspect(saved.runId);
      latest = { type: "run-completed", runId: saved.runId,
        resultSha256: verified.hashes.result, model: saved.model, at: saved.computedAt };
      break;
    } catch { /* Skip a saved run whose bytes no longer verify. */ }
  }
  let server: Server;
  const answer = (socket: Socket, value: unknown, keep = false) => {
    const encoded = JSON.stringify(value) + "\n";
    if (Buffer.byteLength(encoded) > 4096) throw new Error("Integration bus response exceeds limit");
    socket.write(encoded); if (!keep) socket.end();
  };
  server = createServer(socket => {
    socket.setTimeout(10_000, () => socket.destroy());
    let buffer = "", handled = false;
    socket.on("data", chunk => {
      if (handled) return;
      buffer += chunk.toString("utf8");
      if (Buffer.byteLength(buffer) > 4096) { socket.destroy(); return; }
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      handled = true;
      void (async () => {
        try {
          const request: unknown = JSON.parse(buffer.slice(0, newline));
          if (!request || typeof request !== "object" || Array.isArray(request)) throw new Error("Invalid bus request");
          const row = request as Record<string, unknown>;
          const supplied = typeof row.token === "string" && HASH.test(row.token) ? Buffer.from(row.token, "hex") : null;
          if (!supplied || !timingSafeEqual(supplied, Buffer.from(token, "hex"))) throw new Error("Bus authentication failed");
          if (row.type === "hello") answer(socket, { ok: true, schema: SCHEMA, application: "Quantum Hamiltonian Lab",
            capabilities: ["resolve-scene", "run-completed", "job-progress", "latest"] });
          else if (row.type === "latest") answer(socket, { ok: true, notice: latest });
          else if (row.type === "subscribe") {
            socket.setTimeout(0); subscribers.add(socket);
            answer(socket, { ok: true, schema: SCHEMA, subscribed: true, notice: latest }, true);
          } else if (row.type === "resolve-scene" && typeof row.runId === "string" && ID.test(row.runId) &&
              typeof row.resultSha256 === "string" && HASH.test(row.resultSha256) &&
              ["standard", "bands", "wilson", "invariant", "strip"].includes(String(row.view))) {
            const parent = join(handoffRoot, randomUUID());
            await mkdir(parent, { recursive: true });
            const receipt = await runs.prepareSceneHandoff(row.runId, parent,
              row.view as "standard" | "bands" | "wilson" | "invariant" | "strip", row.resultSha256);
            answer(socket, { ok: true, schema: SCHEMA, receipt: { directory: receipt.directory,
              runId: receipt.runId, resultSha256: receipt.resultSha256, sceneId: receipt.sceneId,
              sceneSchema: receipt.sceneSchema } });
          } else throw new Error("Unsupported bus action");
        } catch (error) { answer(socket, { ok: false, error: String((error as Error).message ?? error) }); }
      })();
    });
    socket.on("close", () => subscribers.delete(socket));
  });
  await new Promise<void>((ok, fail) => { server.once("error", fail); server.listen(endpoint, ok); });
  const discovery = join(root, "discovery.json"), temp = join(root, `discovery-${randomUUID()}.tmp`);
  try {
    await writeFile(temp, JSON.stringify({ schema: SCHEMA, application: "Quantum Hamiltonian Lab", endpoint, token,
      pid: process.pid }) + "\n", { flag: "wx", mode: 0o600 });
    await rename(temp, discovery);
  } finally { await unlink(temp).catch(() => {}); }
  return {
    endpoint,
    publishProgress(progress: { jobId: string; completed: number; total: number; fraction: number }) {
      if (!ID.test(progress.jobId) || !Number.isSafeInteger(progress.completed) ||
          !Number.isSafeInteger(progress.total) || progress.total < 1 ||
          progress.completed < 0 || progress.completed > progress.total ||
          !Number.isFinite(progress.fraction) ||
          Math.abs(progress.fraction - progress.completed / progress.total) > 1e-10)
        throw new Error("Invalid verified job progress");
      const notice: ProgressNotice = { type: "job-progress", ...progress };
      for (const socket of subscribers) {
        if (socket.writableLength > 64 * 1024) { socket.destroy(); continue; }
        socket.write(JSON.stringify({ ok: true, notice }) + "\n");
      }
    },
    publishRun(runId: string, resultSha256: string, model: string) {
      if (!ID.test(runId) || !HASH.test(resultSha256) || !ID.test(model)) throw new Error("Invalid verified run notice");
      latest = { type: "run-completed", runId, resultSha256, model, at: new Date().toISOString() };
      for (const socket of subscribers) {
        if (socket.writableLength > 64 * 1024) { socket.destroy(); continue; }
        socket.write(JSON.stringify({ ok: true, notice: latest }) + "\n");
      }
    },
    async close() {
      for (const socket of subscribers) socket.destroy();
      await new Promise<void>(ok => server.close(() => ok()));
      try { const info = await lstat(discovery);
        if (info.isFile() && !info.isSymbolicLink() && info.size <= 4096 &&
            JSON.parse(await readFile(discovery, "utf8")).token === token) await unlink(discovery);
      } catch { /* A newer instance may own discovery. */ }
      if (process.platform !== "win32") await unlink(endpoint).catch(() => {});
    },
  };
}
