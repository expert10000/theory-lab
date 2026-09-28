import Ajv from "ajv";
import jobSchema from "./schemas/quantum-job.v1.json";
import resultSchema from "./schemas/quantum-result.v1.json";
import capabilitiesSchema from "./schemas/worker-capabilities.v1.json";
import resourcesSchema from "./schemas/worker-resources.v1.json";
export { assertWorkspaceSnapshot, isWorkspaceSnapshot } from "./workspace";
export type { WorkspaceSnapshot, WorkspaceTab, RunSummary, RunExportFormat } from "./workspace";

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
export type EvolutionEngineName = EngineName | "dynamiqs";
export type SweepEngineName = EvolutionEngineName;
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
  engine: EvolutionEngineName;
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
  engine: SweepEngineName;
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
export interface OrbitalModel {
  type: "hydrogenic";
  parameters: { n: number; l: number; m: number; basis: "complex" | "real_cos" | "real_sin";
    Z: number; radius: number; grid: number };
}
export interface OrbitalJob {
  schema: "quantum-job/v1"; jobId: string; operation: "orbital"; engine: "native"; model: OrbitalModel;
}
export interface OrbitalResult {
  schema: "quantum-result/v1"; jobId: string; runId: string; status: "completed";
  operation: "orbital"; model: OrbitalModel;
  engine: { name: "native"; version: string };
  data: { schema: "quantum-data/v1"; format: "f64le"; path: string; rows: number;
    columns: ["psi_re", "psi_im"]; bytes: number; sha256: string };
  analysis: { energyHartree: number; gridProbability: number; radialNormalization: number;
    meanRadius: number; radialRadii: number[]; radialProbability: number[] };
  provenance: SpectrumResult["provenance"];
}
export type QuantumJob = SpectrumJob | EvolutionJob | CavityJob | LindbladJob | SweepJob | ManyBodyJob | CircuitJob | TopologyJob | OrbitalJob;
export type CircuitEngineName = "scqubits" | "native";
export interface CircuitModel {
  type: "transmon";
  parameters: { EJ: number; EC: number; ng: number; ncut: number; levels: number };
}
export interface CircuitJob {
  schema: "quantum-job/v1"; jobId: string; operation: "circuit";
  engine: CircuitEngineName; model: CircuitModel;
}
export interface CircuitResult {
  schema: "quantum-result/v1"; jobId: string; runId: string; status: "completed";
  operation: "circuit"; model: CircuitModel;
  engine: { name: CircuitEngineName; version: string };
  spectrum: { energies: number[]; e01: number; e12: number; anharmonicity: number;
    chargeMatrixElement01: number; cutoffDriftE01: number; units: "GHz" };
  provenance: SpectrumResult["provenance"];
}
export type ManyBodyEngineName = "quspin" | "native";
export interface ManyBodyModel {
  type: "ising_chain";
  parameters: {
    sites: number; interaction: number; transverse: number; longitudinal: number;
    boundary: "open" | "periodic";
  };
}
export interface ManyBodyJob {
  schema: "quantum-job/v1";
  jobId: string;
  operation: "many_body";
  engine: ManyBodyEngineName;
  model: ManyBodyModel;
}
export interface ManyBodyResult {
  schema: "quantum-result/v1";
  jobId: string;
  runId: string;
  status: "completed";
  operation: "many_body";
  model: ManyBodyModel;
  engine: { name: ManyBodyEngineName; version: string };
  spectrum: { lowEnergies: number[]; gap: number; units: "normalized"; hbar: 1 };
  groundState: { siteMagnetization: number[]; halfChainEntropy: number };
  provenance: SpectrumResult["provenance"];
}
export interface SSHModel { type: "ssh"; parameters: { t1: number; t2: number; cells: number; kPoints: number }; source?: LayerOneSource }
export interface QWZModel { type: "qwz"; parameters: { mass: number; grid: number }; source?: LayerOneSource }
export interface TopologyJob { schema: "quantum-job/v1"; jobId: string; operation: "topology"; engine: "native"; model: SSHModel | QWZModel }
export interface SSHAnalysis {
  kind: "ssh"; bulkGap: number; winding: number | null; kValues: number[];
  lowerBand: number[]; upperBand: number[]; edgeEnergies: [number, number];
  edgeDensity: number[]; edgeWeight: number;
}
export interface QWZAnalysis {
  kind: "qwz"; bulkGap: number; sampledGap: number; gapClosed: boolean;
  chern: number | null; latticeChern: number | null; analyticChern: number | null;
  meshResolved: boolean; chernIntegral: number | null; berryCurvature: number[];
}
export interface TopologyResult {
  schema: "quantum-result/v1"; jobId: string; runId: string; status: "completed";
  operation: "topology"; model: SSHModel | QWZModel;
  engine: { name: "native"; version: string }; analysis: SSHAnalysis | QWZAnalysis;
  provenance: SpectrumResult["provenance"];
}
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
  engine: { name: EvolutionEngineName; version: string; device?: string };
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
  engine: { name: SweepEngineName; version: string; device?: string };
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
export type QuantumResult = SpectrumResult | EvolutionResult | CavityResult | LindbladResult | SweepResult | ManyBodyResult | CircuitResult | TopologyResult | OrbitalResult;
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
    dynamiqs?: { available: boolean; version: string | null; device: string | null };
    quspin?: { available: boolean; version: string | null };
    scqubits?: { available: boolean; version: string | null };
  };
  operations: ("diagonalize" | "evolve" | "cavity" | "lindblad" | "sweep" | "many_body" | "circuit" | "topology" | "orbital")[];
}
export interface WorkerStatus {
  state: "STARTING" | "READY" | "ERROR" | "STOPPED";
  detail: string;
  capabilities: WorkerCapabilities | null;
  transport?: "local" | "ssh";
  connection?: { target: string; root: string; python: string; artifacts: string };
}
export interface WorkerResources {
  schema: "worker-resources/v1";
  platform: { system: string; machine: string };
  cpu: { logicalCores: number };
  memory: { totalBytes: number | null };
  job: { activeId: string | null };
}
export interface QuantumBridge {
  getStatus(): Promise<WorkerStatus>;
  getCapabilities(): Promise<WorkerCapabilities>;
  getResources(): Promise<WorkerResources>;
  restart(): Promise<WorkerStatus>;
  run(job: SpectrumJob): Promise<SpectrumResult>;
  evolve(job: EvolutionJob): Promise<EvolutionResult>;
  cavity(job: CavityJob): Promise<CavityResult>;
  lindblad(job: LindbladJob): Promise<LindbladResult>;
  sweep(job: SweepJob): Promise<SweepResult>;
  manyBody(job: ManyBodyJob): Promise<ManyBodyResult>;
  circuit(job: CircuitJob): Promise<CircuitResult>;
  topology(job: TopologyJob): Promise<TopologyResult>;
  orbital(job: OrbitalJob): Promise<OrbitalResult>;
  openAtlasSource(id: string): Promise<void>;
  cancel(jobId: string): Promise<boolean>;
  readData(jobId: string): Promise<Uint8Array>;
  onProgress(listener: (progress: EvolutionProgress) => void): () => void;
  saveWorkspace(snapshot: import("./workspace").WorkspaceSnapshot): Promise<void>;
  loadWorkspace(): Promise<import("./workspace").WorkspaceSnapshot | null>;
  listRuns(): Promise<import("./workspace").RunSummary[]>;
  getScene(runId: string): Promise<import("../quantum-scene").ScenePayload>;
  exportScene(runId: string): Promise<string | null>;
  importScene(): Promise<import("../quantum-scene").ScenePayload | null>;
  exportRun(runId: string, format: import("./workspace").RunExportFormat): Promise<string | null>;
}
const ajv = new Ajv({ allErrors: true, strict: true });
export const isQuantumJob = ajv.compile<QuantumJob>(jobSchema);
export const isQuantumResult = ajv.compile<QuantumResult>(resultSchema);
export const isWorkerCapabilities =
  ajv.compile<WorkerCapabilities>(capabilitiesSchema);
export const isWorkerResources = ajv.compile<WorkerResources>(resourcesSchema);
export function assertJob(value: unknown): asserts value is QuantumJob {
  if (!isQuantumJob(value))
    throw new Error(
      `Invalid quantum-job/v1: ${ajv.errorsText(isQuantumJob.errors)}`,
    );
  if (value.operation === "orbital") {
    const { n, l, m, basis } = value.model.parameters;
    if (l >= n || Math.abs(m) > l || (basis !== "complex" && m < 0) || (basis === "real_sin" && m === 0))
      throw new Error("Invalid orbital quantum numbers or real-harmonic convention");
  }
}
