import Ajv from "ajv";
import jobSchema from "./schemas/quantum-bdg-sector-job.v1.json";
import resultSchema from "./schemas/quantum-bdg-sector-result.v1.json";

export interface BdGSectorParameters { extent: number; delta: number; phaseRad: number; points: number }
export interface BdGSectorModel { type: "reduced_bdg_2x2"; parameters: BdGSectorParameters }
export interface BdGSectorJob { schema: "quantum-bdg-sector-job/v1"; jobId: string; model: BdGSectorModel }
export interface BdGSectorSample {
  xi: number; eMinus: number; ePlus: number;
  electronWeight: number | null; holeWeight: number | null;
  pairingPhaseRad: number | null; node: boolean;
}
export interface BdGSectorResult {
  schema: "quantum-bdg-sector-result/v1"; jobId: string; runId: string; status: "completed";
  model: BdGSectorModel; basis: "reduced two-component Nambu sector";
  samples: BdGSectorSample[]; minimumPositiveEnergy: number; gapClosed: boolean;
  units: { xi: "dimensionless"; energy: "dimensionless"; phase: "rad" };
  provenance: { pythonVersion: string; workerVersion: string; computedAt: string; durationMs: number };
}
export interface BdGSectorRunSummary {
  runId: string; computedAt: string; parameters: BdGSectorParameters;
  minimumPositiveEnergy: number; resultSha256: string;
}
export interface BdGSectorBridge {
  runBdGSector(job: BdGSectorJob): Promise<BdGSectorResult>;
  listBdGSectorRuns(): Promise<BdGSectorRunSummary[]>;
  getBdGSectorRun(runId: string): Promise<BdGSectorResult>;
}
const ajv = new Ajv({ allErrors: true, strict: true });
export const isBdGSectorJob = ajv.compile<BdGSectorJob>(jobSchema);
export const isBdGSectorResult = ajv.compile<BdGSectorResult>(resultSchema);
export function assertBdGSectorJob(value: unknown): asserts value is BdGSectorJob {
  if (!isBdGSectorJob(value) || (value as BdGSectorJob).model.parameters.points % 2 !== 1)
    throw new Error(`Invalid BdG sector job: ${ajv.errorsText(isBdGSectorJob.errors)}`);
}
