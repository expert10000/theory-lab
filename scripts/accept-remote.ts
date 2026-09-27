import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { WorkerSupervisor } from "../apps/desktop/main/worker";
import { EvolutionCoordinator } from "../apps/desktop/main/evolution";
import { defaultsFor, evolutionJob, spectrumJob } from "../packages/models";
import { remoteConfig } from "../apps/desktop/main/remote";

if (!remoteConfig(process.env))
  throw new Error("Set QLAB_REMOTE_SSH_TARGET and QLAB_REMOTE_ROOT before remote acceptance");

const root = resolve(import.meta.dirname, "..");
const local = await mkdtemp(join(tmpdir(), "qlab-live-ssh-"));
const worker = new WorkerSupervisor(root);
let progressJob = "";
let sawProgress: (value: void) => void = () => {};
const progressed = new Promise<void>(resolveProgress => { sawProgress = resolveProgress; });
const coordinator = new EvolutionCoordinator(worker, local, progress => {
  if (progress.jobId === progressJob && progress.completed > 0) sawProgress();
});
try {
  const status = await worker.start();
  assert.equal(status.state, "READY", status.detail);
  assert.equal(status.transport, "ssh");
  assert.ok(status.capabilities?.engines.native.available);

  const spectrum = spectrumJob(randomUUID(), { delta: "1", omega: "0.8" }, "native");
  const diagonal = await worker.request("quantum.run", spectrum);
  assert.ok(diagonal && typeof diagonal === "object" && "spectrum" in diagonal);
  const energies = (diagonal as { spectrum: { eigenvalues: [number, number] } }).spectrum.eigenvalues;
  assert.ok(Math.abs(energies[0] + Math.hypot(1, .8) / 2) < 1e-9);

  const job = evolutionJob("driven_two_level", randomUUID(), defaultsFor("driven_two_level"),
    0, 0, 5, 101, "native");
  const result = await coordinator.run(job);
  assert.equal(result.operation, "evolve");
  const bytes = await coordinator.readData(job.jobId);
  assert.equal(bytes.byteLength, result.data.bytes);
  const copied = join(local, `${job.jobId}.f64`);
  const damaged = Buffer.from(await readFile(copied));
  damaged[0] ^= 0x01;
  await writeFile(copied, damaged);
  await assert.rejects(coordinator.readData(job.jobId), /integrity check/);

  progressJob = randomUUID();
  const longJob = evolutionJob("driven_two_level", progressJob, defaultsFor("driven_two_level"),
    0, 0, 1000, 50000, "native");
  const running = coordinator.run(longJob);
  const outcome = running.then(() => "completed", error => String(error));
  let progressTimer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([progressed, new Promise<never>((_, reject) => {
      progressTimer = setTimeout(() => reject(new Error("Remote job emitted no progress")), 30000);
    })]);
  } finally { if (progressTimer) clearTimeout(progressTimer); }
  assert.equal(await coordinator.cancel(longJob.jobId), true);
  assert.match(await outcome, /cancelled/i);
  assert.deepEqual(await worker.request("health"), { status: "ok" });
  assert.equal((await worker.restart()).state, "READY");
  console.log("PASS: live SSH handshake, native spectrum, binary artifact, integrity rejection, cancellation, health and restart");
} finally {
  await worker.stop();
  await rm(local, { recursive: true, force: true });
}
