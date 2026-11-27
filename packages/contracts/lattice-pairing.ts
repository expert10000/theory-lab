import Ajv from "ajv";
import jobSchema from "./schemas/quantum-lattice-pairing-job.v1.json";
import resultSchema from "./schemas/quantum-lattice-pairing-result.v1.json";

export interface LatticePairingParameters { mu: number; amplitudeX: number; amplitudeY: number; relativePhaseRad: number; gridSize: number }
export interface LatticePairingModel { type: "square_lattice_px_py"; parameters: LatticePairingParameters }
export interface LatticePairingJob { schema: "quantum-lattice-pairing-job/v1"; jobId: string; model: LatticePairingModel }
export interface LatticePairingSample {
  kx: number; ky: number; xi: number; deltaRe: number; deltaIm: number;
  gapMagnitude: number; phaseRad: number|null; eMinus: number; ePlus: number;
  electronWeight: number|null; holeWeight: number|null; node: boolean;
}
export interface LatticePairingResult {
  schema: "quantum-lattice-pairing-result/v1"; jobId: string; runId: string; status: "completed";
  model: LatticePairingModel; basis: "spinless two-component Nambu lattice toy";
  grid: { order: "kx-major/ky-minor"; domain: "[-pi,pi)"; spacing: number };
  samples: LatticePairingSample[]; sampledMinimumEnergy: number; sampledGapClosed: boolean;
  units: { momentum: "rad/a"; energy: "t=1"; phase: "rad" };
  provenance: { pythonVersion: string; workerVersion: string; computedAt: string; durationMs: number };
}
export interface LatticePairingRunSummary {
  runId: string; computedAt: string; parameters: LatticePairingParameters;
  sampledMinimumEnergy: number; resultSha256: string;
}
export interface LatticePairingBridge {
  runLatticePairing(job: LatticePairingJob): Promise<LatticePairingResult>;
  listLatticePairingRuns(): Promise<LatticePairingRunSummary[]>;
  getLatticePairingRun(runId: string): Promise<LatticePairingResult>;
}
const ajv = new Ajv({allErrors:true, strict:true});
export const isLatticePairingJob = ajv.compile<LatticePairingJob>(jobSchema);
export const isLatticePairingResult = ajv.compile<LatticePairingResult>(resultSchema);
export function assertLatticePairingJob(value: unknown): asserts value is LatticePairingJob {
  if (!isLatticePairingJob(value)) throw new Error(`Invalid lattice pairing job: ${ajv.errorsText(isLatticePairingJob.errors)}`);
}
