import type { SavedRunInspection } from "../../../packages/contracts";

/** A small cross-app join record from a verified saved run; no parameters, paths or arrays. */
export function runSupportBundle(inspection: SavedRunInspection) {
  return { schema: "theory-lab.quantum-run-support/v1", correlation: {
    jobId: inspection.job.jobId, runId: inspection.summary.runId,
    jobSha256: inspection.hashes.job, resultSha256: inspection.hashes.result,
    artifactSha256: inspection.hashes.artifact,
    sceneFingerprint: null,
  }, runtime: { workerVersion: inspection.provenance.workerVersion,
    pythonVersion: inspection.provenance.pythonVersion,
    engine: inspection.summary.engine, engineVersion: inspection.summary.engineVersion,
    durationMs: Math.round(inspection.provenance.durationMs),
  }, verification: { savedRun: true, parent: inspection.lineageStatus ?? "none" } };
}
