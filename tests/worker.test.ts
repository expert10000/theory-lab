import { test } from "node:test";
import assert from "node:assert/strict";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import type { ChildProcess } from "node:child_process";
import fixture from "../packages/contracts/fixtures/two-level.job.json";
import { isQuantumResult } from "../packages/contracts";

test("supervised real Python handshake, errors, restart and shutdown", async () => {
  const worker = new WorkerSupervisor(process.cwd());
  try {
    assert.equal((await worker.start()).state, "READY");
    assert.equal(worker.status.capabilities?.engines.native.available, true);
    assert.deepEqual(await worker.request("health"), { status: "ok" });
    const result = await worker.request("quantum.run", fixture);
    assert.ok(
      isQuantumResult(result) && result.operation === "diagonalize",
      "Python result must match the TypeScript schema",
    );
    assert.ok(
      Math.abs(result.spectrum.eigenvalues[1] - Math.hypot(1, 0.8) / 2) < 1e-12,
    );
    const native = await worker.request("quantum.run", {
      ...fixture,
      jobId: "native-spectrum-test",
      engine: "native",
    });
    assert.ok(isQuantumResult(native) && native.operation === "diagonalize");
    assert.equal(native.engine.name, "native");
    assert.ok(
      Math.abs(
        native.spectrum.eigenvalues[1] - result.spectrum.eigenvalues[1],
      ) < 1e-12,
    );
    await assert.rejects(worker.request("unsupported"), /Method not found/);
    assert.equal(worker.status.state, "READY");
    const child = (worker as unknown as { child: ChildProcess }).child;
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await exited;
    assert.equal(worker.status.state, "ERROR");
    assert.equal((await worker.restart()).state, "READY");
  } finally {
    await worker.stop();
  }
  assert.equal(worker.status.state, "STOPPED");
});

test("missing Python interpreter produces an actionable error", async () => {
  const worker = new WorkerSupervisor(process.cwd() + "/missing-install");
  try {
    const result = await worker.start();
    assert.equal(result.state, "ERROR");
    assert.match(result.detail, /setup:python/);
  } finally {
    await worker.stop();
  }
});
