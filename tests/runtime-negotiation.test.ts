import { test } from "node:test";
import assert from "node:assert/strict";
import { negotiateRuntime, runtimeNegotiation } from "../packages/contracts/runtime-negotiation";
import type { WorkerStatus } from "../packages/contracts";
import { WorkerSupervisor } from "../apps/desktop/main/worker";

const ready: WorkerStatus = { state: "READY", detail: "connected", transport: "local",
  capabilities: { schema: "worker-capabilities/v1", protocol: 1,
    worker: { version: "0.1.0" }, python: { version: "3.12" },
    engines: { qutip: { available: false, version: null }, native: { available: true, version: "1.15" },
      dynamiqs: { available: false, version: null, device: null } },
    operations: ["diagonalize", "evolve", "topology"] } };

test("negotiation explains missing engines and preserves an explicit fallback", () => {
  assert.deepEqual(negotiateRuntime(ready, "topology", "native").selected, "native");
  const qutip = negotiateRuntime(ready, "evolve", "qutip");
  assert.equal(qutip.available, false);
  assert.equal(qutip.fallback, "native");
  assert.match(qutip.reason, /unavailable/);
  assert.equal(negotiateRuntime(ready, "topology", "dynamiqs").fallback, "native");
  assert.match(negotiateRuntime(ready, "circuit", "native").reason, /not advertised/);
  const stopped = negotiateRuntime({ ...ready, state: "STOPPED" }, "topology", "native");
  assert.equal(stopped.available, false);
  assert.equal(runtimeNegotiation(ready).sceneFormats[1], "quantum-scene/v2");
  assert.match(negotiateRuntime({ ...ready, capabilities: { ...ready.capabilities!, worker: { version: "1.0.0" } } }, "evolve", "native").reason, /incompatible/);
});

test("supervisor rejects an unsupported engine before sending a job", async () => {
  const worker = new WorkerSupervisor(process.cwd());
  worker.status = ready;
  await assert.rejects(worker.request("quantum.run", { operation: "evolve", engine: "qutip" }), /unavailable/);
  await assert.rejects(worker.request("quantum.start", { job: { operation: "circuit", engine: "native" } }), /not advertised/);
  await assert.rejects(worker.request("quantum.run", { operation: "evolve", engine: "native" }), /Python worker is unavailable/);
});
