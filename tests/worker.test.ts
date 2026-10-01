import { test } from "node:test";
import assert from "node:assert/strict";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import type { ChildProcess } from "node:child_process";
import fixture from "../packages/contracts/fixtures/two-level.job.json";
import { isQuantumResult } from "../packages/contracts";
import {consistentTwoLevelSpectrum} from "../packages/models/two-level-spectrum";

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
    assert.ok(consistentTwoLevelSpectrum(fixture as import("../packages/contracts").SpectrumJob,result));
    assert.equal(result.stateAnalysis?.status,"resolved");
    if(result.stateAnalysis?.status==="resolved"){
      assert.ok(Math.abs(result.stateAnalysis.states[0].bloch.x+0.8/Math.hypot(1,0.8))<1e-12);
      assert.ok(result.stateAnalysis.states[0].residualNorm<1e-12);
    }
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
    assert.ok(consistentTwoLevelSpectrum({...fixture,engine:"native"} as import("../packages/contracts").SpectrumJob,native));
    assert.equal(native.stateAnalysis?.status,"resolved");
    const degenerateJob={...fixture,jobId:"degenerate-test",model:{type:"two_level",parameters:{delta:0,omega:0}}} as import("../packages/contracts").SpectrumJob;
    for(const engine of ["qutip","native"] as const){
      const degenerate=await worker.request("quantum.run",{...degenerateJob,engine});
      assert.ok(isQuantumResult(degenerate)&&degenerate.operation==="diagonalize");
      assert.equal(degenerate.stateAnalysis?.status,"degenerate");
      assert.ok(consistentTwoLevelSpectrum({...degenerateJob,engine},degenerate));
      const negativeJob={...degenerateJob,jobId:`negative-${engine}`,engine,
        model:{type:"two_level" as const,parameters:{delta:-3,omega:-4}}};
      const negative=await worker.request("quantum.run",negativeJob);
      assert.ok(isQuantumResult(negative)&&negative.operation==="diagonalize");
      assert.ok(consistentTwoLevelSpectrum(negativeJob,negative));
    }
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
