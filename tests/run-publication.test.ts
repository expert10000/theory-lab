import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jobFixture from "../packages/contracts/fixtures/two-level.job.json";
import type { SpectrumJob, SpectrumResult } from "../packages/contracts";
import { RunStore } from "../apps/desktop/main/runs";
import { SharedArtifactStore } from "../apps/desktop/main/shared-artifact-store";

test("saved run becomes visible only after final publication and pins its exact bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "qi16-run-"));
  try {
    const job = jobFixture as SpectrumJob;
    const gap = Math.hypot(job.model.parameters.delta, job.model.parameters.omega);
    const result: SpectrumResult = { schema: "quantum-result/v1", jobId: job.jobId,
      runId: "final-run", status: "completed", operation: "diagonalize", model: job.model,
      engine: { name: job.engine, version: "5.3" },
      spectrum: { eigenvalues: [-gap / 2, gap / 2], units: "normalized", hbar: 1 },
      provenance: { pythonVersion: "3.12", workerVersion: "1.0",
        computedAt: "2026-11-05T00:00:00Z", durationMs: 2 } };
    const notifications: string[] = [];
    const shared = new SharedArtifactStore(join(root, "shared"));
    const runs = new RunStore(join(root, "runs"), join(root, "artifacts"),
      (saved, hash) => notifications.push(`${saved.runId}:${hash}`), shared);
    const competing = await Promise.allSettled([runs.record(job, result), runs.record(job, result)]);
    assert.deepEqual(competing.map(outcome => outcome.status).sort(), ["fulfilled", "rejected"]);
    const inspected = await runs.inspect("final-run");
    assert.deepEqual(notifications, [`final-run:${inspected.hashes.result}`]);
    assert.deepEqual((await readdir(join(root, "runs"))).sort(), ["final-run"]);
    assert.deepEqual((await shared.collect()).hashes, []);
    await assert.rejects(runs.record(job, result), /already exists/);
    assert.equal((await runs.list()).length, 1);
    assert.deepEqual((await readdir(join(root, "runs"))).sort(), ["final-run"]);
    assert.equal(notifications.length, 1);
    assert.equal(inspected.hashes.result,
      createHash("sha256").update(JSON.stringify(result, null, 2) + "\n").digest("hex"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
