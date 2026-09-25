import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import fixture from "../packages/contracts/fixtures/rabi-evolution.job.json";
import type { EvolutionJob } from "../packages/contracts";

test("supervised evolution streams progress and loads a verified binary artifact", async () => {
  const directory = await mkdtemp(join(tmpdir(), "qlab-test-"));
  const worker = new WorkerSupervisor(process.cwd());
  const progress: number[] = [];
  const coordinator = new EvolutionCoordinator(worker, directory, (event) =>
    progress.push(event.completed),
  );
  try {
    assert.equal((await worker.start()).state, "READY");
    const result = await coordinator.run(fixture as EvolutionJob);
    assert.equal(result.operation, "evolve");
    assert.equal(result.data.rows, 101);
    assert.equal(progress[0], 0);
    assert.equal(progress.at(-1), 101);
    const bytes = await coordinator.readData(result.jobId);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    assert.equal(bytes.byteLength, result.data.bytes);
    assert.equal(view.getFloat64(8, true), 1);
    assert.equal(view.getFloat64(16, true), 0);
    await assert.rejects(coordinator.readData("not-a-job"), /No completed/);
    const nextJob = structuredClone(fixture) as EvolutionJob;
    nextJob.jobId = `repeat-${Date.now()}`;
    assert.equal((await coordinator.run(nextJob)).operation, "evolve");
    await appendFile(join(directory, result.data.path), Buffer.from([0]));
    await assert.rejects(coordinator.readData(result.jobId), /integrity check/);
  } finally {
    await worker.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

test("cancellation stops a running QuTiP job and leaves the worker healthy", async () => {
  const directory = await mkdtemp(join(tmpdir(), "qlab-cancel-"));
  const worker = new WorkerSupervisor(process.cwd());
  let coordinator: EvolutionCoordinator;
  let cancellation: Promise<boolean> | undefined;
  coordinator = new EvolutionCoordinator(worker, directory, (event) => {
    if (event.completed >= 10 && !cancellation)
      cancellation = coordinator.cancel(event.jobId);
  });
  try {
    await worker.start();
    const job = structuredClone(fixture) as EvolutionJob;
    job.jobId = "cancel-" + Date.now();
    job.solver.samples = 50000;
    job.solver.tStop = 1000;
    await assert.rejects(coordinator.run(job), /Evolution cancelled/);
    assert.equal(await cancellation, true);
    assert.deepEqual(await worker.request("health"), { status: "ok" });
    await assert.rejects(coordinator.readData(job.jobId), /No completed/);
  } finally {
    await worker.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
