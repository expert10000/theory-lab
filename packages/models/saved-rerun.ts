import type { QuantumJob, QuantumResult, WorkerStatus } from "../contracts";

/** Pure preflight. The caller must re-evaluate it immediately before dispatch. */
export function savedRerunPreflight(job: QuantumJob,
  result: {provenance:QuantumResult["provenance"];engine:{version:string;device?:string}}, status: WorkerStatus) {
  const capabilities = status.capabilities;
  const engine = capabilities?.engines[job.engine];
  const differences: string[] = [];
  if (capabilities) {
    if (result.provenance.workerVersion !== capabilities.worker.version)
      differences.push(`Worker: saved ${result.provenance.workerVersion}; current ${capabilities.worker.version}`);
    if (result.provenance.pythonVersion !== capabilities.python.version)
      differences.push(`Python: saved ${result.provenance.pythonVersion}; current ${capabilities.python.version}`);
    if (result.engine.version !== engine?.version)
      differences.push(`${job.engine}: saved ${result.engine.version}; current ${engine?.version ?? "unavailable"}`);
    const currentDevice="device" in (engine??{})?(engine as {device?:string|null}).device:undefined;
    if (result.engine.device !== undefined && result.engine.device !== currentDevice)
      differences.push(`Device: saved ${result.engine.device}; current ${currentDevice ?? "unspecified"}`);
  }
  const reason = job.schema !== "quantum-job/v1" ? "Saved job contract is not supported by this app"
    : status.state !== "READY" || !capabilities ? "Worker is not ready"
    : !capabilities.operations.includes(job.operation) ? `Current worker does not support ${job.operation}`
    : !engine?.available ? `Saved ${job.engine} engine is unavailable; no substitute will be selected`
    : null;
  return {ready:reason===null,reason,differences};
}

/** Preserve the complete stored input JSON, changing only the identity of the new job. */
export function cloneSavedJob(job: QuantumJob, jobId: string): QuantumJob {
  return {...structuredClone(job), jobId};
}
