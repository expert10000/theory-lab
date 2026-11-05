import type { SavedRunInspection } from "../../../packages/contracts";
const safeId = (value: string) => /^[A-Za-z0-9_.-]{1,160}$/.test(value) ? value : "redacted";
const safeHash = (value: string | null) => value === null ? null : /^[a-f0-9]{64}$/.test(value) ? value : "redacted";
const safeVersion = (value: string) => /^[A-Za-z0-9._+-]{1,64}$/.test(value) ? value : "redacted";

/** A small cross-app join record from a verified saved run; no parameters, paths or arrays. */
export function runSupportBundle(inspection: SavedRunInspection) {
  return { schema: "theory-lab.quantum-run-support/v1", correlation: {
    jobId: safeId(inspection.job.jobId), runId: safeId(inspection.summary.runId),
    jobSha256: safeHash(inspection.hashes.job), resultSha256: safeHash(inspection.hashes.result),
    artifactSha256: safeHash(inspection.hashes.artifact),
    sceneFingerprint: null,
  }, runtime: { workerVersion: safeVersion(inspection.provenance.workerVersion),
    pythonVersion: safeVersion(inspection.provenance.pythonVersion),
    engine: safeId(inspection.summary.engine), engineVersion: safeVersion(inspection.summary.engineVersion),
    durationMs: Math.round(inspection.provenance.durationMs),
  }, verification: { savedRun: true, parent: inspection.lineageStatus ?? "none" } };
}
