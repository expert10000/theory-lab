import Ajv from "ajv";
import jobSchema from "./schemas/quantum-job.v1.json";
import resultSchema from "./schemas/quantum-result.v1.json";
import capabilitiesSchema from "./schemas/worker-capabilities.v1.json";

export interface TwoLevelModel {
  type: "two_level";
  parameters: { delta: number; omega: number };
  source?: LayerOneSource;
}
export interface LayerOneSource {
  sourceRepository?: string;
  sourceModule?: string;
  volume?: string;
  chapter?: string;
  exampleId?: string;
}
export interface DrivenTwoLevelModel {
  type: "driven_two_level" | "strong_drive";
  parameters: {
    delta: number;
    amplitude: number;
    frequency: number;
    phase: number;
  };
  source?: LayerOneSource;
}
export interface LandauZenerModel {
  type: "landau_zener";
  parameters: { sweepRate: number; gap: number; bias: number };
  source?: LayerOneSource;
}
export interface StuckelbergModel {
  type: "stuckelberg";
  parameters: {
    sweepRate: number;
    gap: number;
    bias: number;
    turnTime: number;
  };
  source?: LayerOneSource;
}
export type EvolutionModel =
  DrivenTwoLevelModel | LandauZenerModel | StuckelbergModel;
export interface BasisState {
  type: "basis";
  index: 0 | 1;
}
export interface EvolutionSolver {
  type: "schrodinger";
  tStart: number;
  tStop: number;
  samples: number;
}
export type Observable = "p0" | "p1" | "sigma_x" | "sigma_y" | "sigma_z";
export type EngineName = "qutip" | "native";
export interface SpectrumJob {
  schema: "quantum-job/v1";
  jobId: string;
  operation: "diagonalize";
  engine: EngineName;
  model: TwoLevelModel;
}
export interface EvolutionJob {
  schema: "quantum-job/v1";
  jobId: string;
  operation: "evolve";
  engine: EngineName;
  model: EvolutionModel;
  initialState: BasisState;
  solver: EvolutionSolver;
  observables: Observable[];
}
export interface CavityModel {
  type: "jaynes_cummings" | "quantum_rabi";
  parameters: {
    qubitFrequency: number;
    cavityFrequency: number;
    coupling: number;
    cutoff: number;
  };
  source?: LayerOneSource;
}
export interface CavityJob {
  schema: "quantum-job/v1";
  jobId: string;
  operation: "cavity";
  engine: EngineName;
  model: CavityModel;
  initialState: { qubit: "ground" | "excited"; photons: number };
  solver: EvolutionSolver;
}
export interface LindbladJob {
  schema: "quantum-job/v1";
  jobId: string;
  operation: "lindblad";
  engine: EngineName;
  model: {
    type: "open_jaynes_cummings";
    parameters: {
      qubitDetuning: number;
      cavityDetuning: number;
      coupling: number;
      driveAmplitude: number;
      relaxation: number;
      dephasing: number;
      cavityLoss: number;
      cutoff: number;
    };
    source?: LayerOneSource;
  };
  initialState: { qubit: "ground" | "excited" | "plus_x"; photons: number };
  solver: Omit<EvolutionSolver, "type"> & { type: "master" };
}
export type SweepParameter = "delta" | "amplitude" | "frequency" | "phase" | "sweepRate" | "gap" | "bias" | "turnTime";
export interface SweepAxis {
  parameter: SweepParameter;
  start: number;
  stop: number;
  points: number;
}
export interface SweepJob {
  schema: "quantum-job/v1";
  jobId: string;
  operation: "sweep";
  engine: EngineName;
  model: EvolutionModel;
  sweep: {
    x: SweepAxis;
    y: SweepAxis | null;
    metric: "final_p1";
    tStart: number;
    tStop: number;
    initialIndex: 0 | 1;
  };
}
export type QuantumJob = SpectrumJob | EvolutionJob | CavityJob | LindbladJob | SweepJob;
export interface SpectrumResult {
  schema: "quantum-result/v1";
  jobId: string;
  runId: string;
  status: "completed";
  operation: "diagonalize";
  model: TwoLevelModel;
  engine: { name: EngineName; version: string };
  spectrum: { eigenvalues: [number, number]; units: "normalized"; hbar: 1 };
  provenance: {
    pythonVersion: string;
    workerVersion: string;
    computedAt: string;
    durationMs: number;
  };
}
export const EVOLUTION_COLUMNS = [
  "time",
  "p0",
  "p1",
  "sigma_x",
  "sigma_y",
  "sigma_z",
  "c0_re",
  "c0_im",
  "c1_re",
  "c1_im",
] as const;
export interface EvolutionData {
  schema: "quantum-data/v1";
  format: "f64le";
  path: string;
  rows: number;
  columns: typeof EVOLUTION_COLUMNS;
  bytes: number;
  sha256: string;
}
export interface EvolutionResult {
  schema: "quantum-result/v1";
  jobId: string;
  runId: string;
  status: "completed";
  operation: "evolve";
  model: EvolutionModel;
  initialState: BasisState;
  solver: EvolutionSolver;
  observables: Observable[];
  engine: { name: EngineName; version: string };
  data: EvolutionData;
  analysis?: FloquetAnalysis;
  provenance: SpectrumResult["provenance"];
}
export interface FloquetAnalysis {
  kind: "floquet";
  period: number;
  quasienergies: [number, number];
  modes: [[{ re: number; im: number }, { re: number; im: number }], [{ re: number; im: number }, { re: number; im: number }]];
  quasienergyGap: number;
  blochSiegertEstimate: number | null;
  map: {
    frequencyValues: number[];
    amplitudeValues: number[];
    transitionProbabilities: number[];
    cycles: 5;
  };
}
export const CAVITY_COLUMNS = ["time", "p_excited", "mean_photon", "boundary_probability", "norm", "parity"] as const;
export interface CavityResult {
  schema: "quantum-result/v1";
  jobId: string;
  runId: string;
  status: "completed";
  operation: "cavity";
  model: CavityModel;
  initialState: CavityJob["initialState"];
  solver: EvolutionSolver;
  engine: { name: EngineName; version: string };
  dressedSpectrum: number[];
  data: {
    schema: "quantum-cavity-data/v1";
    format: "f64le";
    path: string;
    rows: number;
    columns: typeof CAVITY_COLUMNS;
    bytes: number;
    sha256: string;
  };
  provenance: SpectrumResult["provenance"];
}
export const LINDBLAD_COLUMNS = ["time", "p_excited", "mean_photon", "purity", "coherence", "boundary_probability", "trace"] as const;
export interface LindbladReadout {
  pExcited: number;
  meanPhoton: number;
  purity: number;
  coherence: number;
  boundaryProbability: number;
  trace: number;
}
export interface LindbladResult {
  schema: "quantum-result/v1";
  jobId: string;
  runId: string;
  status: "completed";
  operation: "lindblad";
  model: LindbladJob["model"];
  initialState: LindbladJob["initialState"];
  solver: LindbladJob["solver"];
  engine: { name: EngineName; version: string };
  steadyState: LindbladReadout | null;
  data: {
    schema: "quantum-lindblad-data/v1";
    format: "f64le";
    path: string;
    rows: number;
    columns: typeof LINDBLAD_COLUMNS;
    bytes: number;
    sha256: string;
  };
  provenance: SpectrumResult["provenance"];
}
export interface SweepResult {
  schema: "quantum-result/v1";
  jobId: string;
  runId: string;
  status: "completed";
  operation: "sweep";
  model: EvolutionModel;
  sweep: SweepJob["sweep"];
  engine: { name: EngineName; version: string };
  data: {
    schema: "quantum-sweep-data/v1";
    format: "f64le";
    path: string;
    shape: { x: number; y: number };
    bytes: number;
    sha256: string;
  };
  cache: { key: string; reusedPoints: number; computedPoints: number };
  provenance: SpectrumResult["provenance"];
}
export type QuantumResult = SpectrumResult | EvolutionResult | CavityResult | LindbladResult | SweepResult;
export interface EvolutionProgress {
  jobId: string;
  completed: number;
  total: number;
  fraction: number;
}
export interface WorkerCapabilities {
  schema: "worker-capabilities/v1";
  protocol: 1;
  worker: { version: string };
  python: { version: string };
  engines: {
    qutip: { available: boolean; version: string | null };
    native: { available: boolean; version: string | null };
  };
  operations: ("diagonalize" | "evolve" | "cavity" | "lindblad" | "sweep")[];
}
export interface WorkerStatus {
  state: "STARTING" | "READY" | "ERROR" | "STOPPED";
  detail: string;
  capabilities: WorkerCapabilities | null;
}
export interface QuantumBridge {
  getStatus(): Promise<WorkerStatus>;
  getCapabilities(): Promise<WorkerCapabilities>;
  restart(): Promise<WorkerStatus>;
  run(job: SpectrumJob): Promise<SpectrumResult>;
  evolve(job: EvolutionJob): Promise<EvolutionResult>;
  cavity(job: CavityJob): Promise<CavityResult>;
  lindblad(job: LindbladJob): Promise<LindbladResult>;
  sweep(job: SweepJob): Promise<SweepResult>;
  cancel(jobId: string): Promise<boolean>;
  readData(jobId: string): Promise<Uint8Array>;
  onProgress(listener: (progress: EvolutionProgress) => void): () => void;
}
const ajv = new Ajv({ allErrors: true, strict: true });
export const isQuantumJob = ajv.compile<QuantumJob>(jobSchema);
export const isQuantumResult = ajv.compile<QuantumResult>(resultSchema);
export const isWorkerCapabilities =
  ajv.compile<WorkerCapabilities>(capabilitiesSchema);
export function assertJob(value: unknown): asserts value is QuantumJob {
  if (!isQuantumJob(value))
    throw new Error(
      `Invalid quantum-job/v1: ${ajv.errorsText(isQuantumJob.errors)}`,
    );
}
