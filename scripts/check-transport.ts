import assert from "node:assert/strict";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { transportConfig } from "../apps/desktop/main/transport-adapters";

const selected = transportConfig(process.env);
if (!selected) throw new Error("Select SSH, WSL or Docker worker settings");
const worker = new WorkerSupervisor(process.cwd());
try {
  const status = await worker.start();
  assert.equal(status.state, "READY", status.detail);
  assert.equal(status.transport, selected.kind);
  assert.equal(status.connection?.target, selected.target);
  assert.deepEqual(await worker.request("health"), { status: "ok" });
  assert.equal((await worker.resources()).schema, "worker-resources/v1");
  console.log(`PASS: ${selected.kind} worker handshake, identity, capabilities, health and resources`);
} finally { await worker.stop(); }
