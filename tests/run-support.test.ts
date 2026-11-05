import assert from "node:assert/strict";
import test from "node:test";
import type { SavedRunInspection } from "../packages/contracts";
import { runSupportBundle } from "../apps/desktop/renderer/run-support";

test("verified run support bundle correlates job and result without paths or parameters", () => {
  const inspection = { summary: { runId: "run-1", engine: "native", engineVersion: "1.2" },
    job: { jobId: "job-1", model: { parameters: { secretPath: "C:\\private\\source" } } },
    hashes: { job: "a".repeat(64), result: "b".repeat(64), artifact: null },
    provenance: { workerVersion: "0.1", pythonVersion: "3.11", durationMs: 12.8 },
    lineageStatus: null } as unknown as SavedRunInspection;
  const bundle = runSupportBundle(inspection);
  assert.equal(bundle.correlation.jobId, "job-1");
  assert.equal(bundle.correlation.resultSha256, "b".repeat(64));
  assert.equal(bundle.runtime.durationMs, 13);
  assert.doesNotMatch(JSON.stringify(bundle), /secretPath|private|parameters|directory/i);
});
