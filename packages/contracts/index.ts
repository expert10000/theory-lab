import Ajv from 'ajv';
import jobSchema from './schemas/quantum-job.v1.json';
import resultSchema from './schemas/quantum-result.v1.json';
import capabilitiesSchema from './schemas/worker-capabilities.v1.json';

export interface TwoLevelModel { type: 'two_level'; parameters: { delta: number; omega: number } }
export interface QuantumJob { schema: 'quantum-job/v1'; jobId: string; operation: 'diagonalize'; engine: 'qutip'; model: TwoLevelModel }
export interface QuantumResult {
  schema: 'quantum-result/v1'; jobId: string; runId: string; status: 'completed'; operation: 'diagonalize';
  model: TwoLevelModel; engine: { name: 'qutip'; version: string };
  spectrum: { eigenvalues: [number, number]; units: 'normalized'; hbar: 1 };
  provenance: { pythonVersion: string; workerVersion: string; computedAt: string; durationMs: number };
}
export interface WorkerCapabilities {
  schema: 'worker-capabilities/v1'; protocol: 1; worker: { version: string }; python: { version: string };
  engines: { qutip: { available: boolean; version: string | null } }; operations: 'diagonalize'[];
}
export interface WorkerStatus { state: 'STARTING' | 'READY' | 'ERROR' | 'STOPPED'; detail: string; capabilities: WorkerCapabilities | null }
export interface QuantumBridge {
  getStatus(): Promise<WorkerStatus>;
  getCapabilities(): Promise<WorkerCapabilities>;
  restart(): Promise<WorkerStatus>;
  run(job: QuantumJob): Promise<QuantumResult>;
}
const ajv = new Ajv({ allErrors: true, strict: true });
export const isQuantumJob = ajv.compile<QuantumJob>(jobSchema);
export const isQuantumResult = ajv.compile<QuantumResult>(resultSchema);
export const isWorkerCapabilities = ajv.compile<WorkerCapabilities>(capabilitiesSchema);
export function assertJob(value: unknown): asserts value is QuantumJob {
  if (!isQuantumJob(value)) throw new Error(`Invalid quantum-job/v1: ${ajv.errorsText(isQuantumJob.errors)}`);
}
