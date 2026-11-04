import test from "node:test";
import assert from "node:assert/strict";
import { connect, type Socket } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startLocalIntegrationBus } from "../apps/desktop/main/local-integration-bus";
import type { RunStore } from "../apps/desktop/main/runs";

function lines(socket: Socket) {
  let buffer = "";
  const waiting: Array<(row: Record<string, unknown>) => void> = [];
  const ready: Record<string, unknown>[] = [];
  socket.on("data", chunk => {
    buffer += chunk.toString("utf8");
    while (buffer.includes("\n")) {
      const index = buffer.indexOf("\n");
      const row = JSON.parse(buffer.slice(0, index)) as Record<string, unknown>;
      buffer = buffer.slice(index + 1);
      const next = waiting.shift();
      if (next) next(row); else ready.push(row);
    }
  });
  return () => ready.length ? Promise.resolve(ready.shift()!) :
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Bus response timed out")), 3000);
      waiting.push(row => { clearTimeout(timer); resolve(row); });
    });
}

test("authenticated bus publishes progress and exact completed-run scene receipts", async () => {
  const root = await mkdtemp(join(tmpdir(), "qi17-bus-"));
  const handoffs = join(root, "handoffs");
  const hash = "a".repeat(64);
  const calls: unknown[][] = [];
  const runs = { async list() { return []; }, async prepareSceneHandoff(...args: unknown[]) {
    calls.push(args);
    return { directory: join(String(args[1]), "verified.qscene"), runId: args[0],
      resultSha256: args[3], sceneId: "verified", sceneSchema: "quantum-scene/v1" };
  } } as unknown as RunStore;
  const bus = await startLocalIntegrationBus(runs, root, handoffs);
  let subscriber: Socket | undefined;
  try {
    const discovery = JSON.parse(await readFile(join(root, "discovery.json"), "utf8"));
    assert.equal(discovery.endpoint, bus.endpoint);
    const ask = async (payload: Record<string, unknown>) => {
      const socket = connect(bus.endpoint);
      const next = lines(socket);
      await new Promise<void>(resolve => socket.once("connect", resolve));
      socket.write(JSON.stringify(payload) + "\n");
      const answer = await next(); socket.destroy(); return answer;
    };
    assert.equal((await ask({ type: "hello", token: "0".repeat(64) })).ok, false);
    assert.equal((await ask({ type: "hello", token: discovery.token })).ok, true);
    assert.equal((await ask({ type: "latest", token: discovery.token })).notice, null);
    subscriber = connect(bus.endpoint);
    const next = lines(subscriber);
    await new Promise<void>(resolve => subscriber!.once("connect", resolve));
    subscriber.write(JSON.stringify({ type: "subscribe", token: discovery.token }) + "\n");
    assert.equal((await next()).subscribed, true);
    bus.publishProgress({ jobId: "job-1", completed: 2, total: 4, fraction: 0.5 });
    assert.deepEqual((await next()).notice, { type: "job-progress", jobId: "job-1",
      completed: 2, total: 4, fraction: 0.5 });
    bus.publishRun("run-1", hash, "qwz");
    const notice = (await next()).notice as Record<string, unknown>;
    assert.equal(notice.runId, "run-1");
    const latest = (await ask({ type: "latest", token: discovery.token })).notice as Record<string, unknown>;
    assert.equal(latest.resultSha256, hash);
    const answer = await ask({ type: "resolve-scene", token: discovery.token,
      runId: "run-1", resultSha256: hash, view: "standard" });
    assert.equal((answer.receipt as Record<string, unknown>).resultSha256, hash);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "run-1");
    assert.equal(calls[0][2], "standard");
    assert.equal(calls[0][3], hash);
    assert.equal((await ask({ type: "shell", token: discovery.token })).ok, false);
  } finally {
    subscriber?.destroy();
    await bus.close();
    await rm(root, { recursive: true, force: true });
  }
});
