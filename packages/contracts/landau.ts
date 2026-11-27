import Ajv from "ajv";
import jobSchema from "./schemas/quantum-landau-job.v1.json";
import resultSchema from "./schemas/quantum-landau-result.v1.json";

export type LandauPhase = "normal" | "sc1" | "sc2" | "mixed";
export interface LandauParameters { a1: number; a2: number; b1: number; b2: number; g: number }
export interface LandauModel { type: "two_order_landau"; parameters: LandauParameters }
export interface LandauJob { schema: "quantum-landau-job/v1"; jobId: string; model: LandauModel }
export interface LandauCandidate { phase: LandauPhase; x: number; y: number; freeEnergy: number; locallyStable: boolean }
export interface LandauResult {
  schema: "quantum-landau-result/v1"; jobId: string; runId: string; status: "completed";
  model: LandauModel; candidates: LandauCandidate[]; globalMinima: LandauPhase[];
  quarticDeterminant: number; marginalQuartic: boolean;
  units: { orderAmplitude: "dimensionless"; freeEnergy: "dimensionless" };
  provenance: { pythonVersion: string; workerVersion: string; computedAt: string; durationMs: number };
}
export interface LandauRunSummary { runId: string; computedAt: string; parameters: LandauParameters; globalMinima: LandauPhase[]; resultSha256: string }
export interface LandauBridge {
  runLandau(job: LandauJob): Promise<LandauResult>;
  listLandauRuns(): Promise<LandauRunSummary[]>;
  getLandauRun(runId: string): Promise<LandauResult>;
}
const ajv = new Ajv({ allErrors: true, strict: true });
export const isLandauJob = ajv.compile<LandauJob>(jobSchema);
export const isLandauResult = ajv.compile<LandauResult>(resultSchema);
export function assertLandauJob(value: unknown): asserts value is LandauJob {
  if (!isLandauJob(value)) throw new Error(`Invalid Landau job: ${ajv.errorsText(isLandauJob.errors)}`);
}
