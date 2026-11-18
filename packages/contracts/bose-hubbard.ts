import Ajv from "ajv";
import jobSchema from "./schemas/quantum-bose-hubbard-job.v1.json";
import resultSchema from "./schemas/quantum-bose-hubbard-result.v1.json";
import type { ScenePayload } from "../quantum-scene";

/** Additive contract: the frozen quantum-job/result v1 schemas stay unchanged. */
export interface BoseHubbardModel {
  type: "bose_hubbard_dimer";
  parameters: { particles: number; interactionRatio: number; hopping: 1; boundary: "open" };
}
export interface BoseHubbardJob {
  schema: "quantum-bose-hubbard-job/v1"; jobId: string;
  engine: "native"; model: BoseHubbardModel;
}
export interface BoseHubbardResult {
  schema: "quantum-bose-hubbard-result/v1"; jobId: string; runId: string;
  status: "completed"; model: BoseHubbardModel;
  engine: { name: "native"; version: string };
  basis: { leftOccupations: number[]; ordering: "|n,N-n> ascending n" };
  spectrum: { energies: number[]; gap: number; energyUnits: "J" };
  states: { index: number; amplitudes: number[]; occupation: [number, number];
    numberVariance: [number, number]; oneBodyCoherence: number;
    residual: number; normalizationError: number }[];
  units: { occupation: "bosons per site"; numberVariance: "bosons^2";
    oneBodyCoherence: "bosons" };
  provenance: { pythonVersion: string; workerVersion: string;
    computedAt: string; durationMs: number };
}
export interface BoseHubbardRunSummary {
  runId: string; computedAt: string; particles: number;
  interactionRatio: number; resultSha256: string;
}
export interface BoseHubbardBridge {
  runBoseHubbard(job: BoseHubbardJob): Promise<BoseHubbardResult>;
  listBoseHubbardRuns(): Promise<BoseHubbardRunSummary[]>;
  getBoseHubbardRun(runId: string): Promise<BoseHubbardResult>;
  getBoseHubbardScene(runId: string, stateIndex: number): Promise<ScenePayload>;
  exportBoseHubbardScene(runId: string, stateIndex: number, expectedResultHash: string): Promise<string | null>;
  openBoseHubbardInMath3D(runId: string, stateIndex: number, expectedResultHash: string): Promise<string | null>;
}

const ajv = new Ajv({ allErrors: true, strict: true });
export const isBoseHubbardJob = ajv.compile<BoseHubbardJob>(jobSchema);
export const isBoseHubbardResult = ajv.compile<BoseHubbardResult>(resultSchema);
export function assertBoseHubbardJob(value: unknown): asserts value is BoseHubbardJob {
  if (!isBoseHubbardJob(value))
    throw new Error(`Invalid Bose-Hubbard job: ${ajv.errorsText(isBoseHubbardJob.errors)}`);
}
