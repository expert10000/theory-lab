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
    meanRadius: number; radialRadii: number[]; radialProbability: number[];
    radialNodes?: number[]; cubeProbabilityBounds?: [number, number] };
  provenance: SpectrumResult["provenance"];
}
export interface OscillatorModel {
  type: "harmonic_oscillator";
  parameters: { omega: number; cutoff: number; levels: number; state: number; extent: number; points: number };
}
export interface OscillatorJob {
  schema: "quantum-job/v1"; jobId: string; operation: "oscillator"; engine: EngineName; model: OscillatorModel;
}
export interface OscillatorResult {
  schema: "quantum-result/v1"; jobId: string; runId: string; status: "completed";
  operation: "oscillator"; engine: { name: EngineName; version: string }; model: OscillatorModel;
  spectrum: { energies: number[]; units: "normalized"; hbar: 1 };
  state: { q: number[]; amplitude: number[]; density: number[] };
  analysis: { ladderError: number; cutoffDrift: number; qVariance: number; pVariance: number; boundaryOccupation: number; gridProbability: number };
  provenance: SpectrumResult["provenance"];
}
export interface OscillatorEvolutionModel {
  type:"harmonic_oscillator"; parameters:{omega:number;cutoff:number;extent:number;points:number};
}
export type OscillatorInitialState = {type:"fock";index:number}|{type:"coherent";alphaRe:number;alphaIm:number};
export interface OscillatorEvolutionJob {
  schema:"quantum-job/v1";jobId:string;operation:"oscillator_evolve";engine:EngineName;
  model:OscillatorEvolutionModel;initialState:OscillatorInitialState;solver:EvolutionSolver;
}
export interface OscillatorEvolutionResult {
  schema:"quantum-result/v1";jobId:string;runId:string;status:"completed";operation:"oscillator_evolve";
  model:OscillatorEvolutionModel;initialState:OscillatorInitialState;solver:EvolutionSolver;
  engine:{name:EngineName;version:string};
  data:{schema:"quantum-oscillator-data/v1";format:"f64le";path:string;rows:number;columns:string[];bytes:number;sha256:string};
  analysis:{projectionProbability:number;omittedProbability:number;maxNormDrift:number;maxBoundaryOccupation:number;maxQError:number;maxPError:number;maxEnergyDrift:number};
  provenance:SpectrumResult["provenance"];
}
export interface DrivenOscillatorModel {
  type:"driven_harmonic_oscillator";
  parameters:OscillatorEvolutionModel["parameters"] & {epsilonRe:number;epsilonIm:number;driveFrequency:number};
}
export interface DrivenOscillatorJob {
  schema:"quantum-job/v1";jobId:string;operation:"oscillator_drive";engine:EngineName;
  model:DrivenOscillatorModel;initialState:OscillatorInitialState;solver:EvolutionSolver;
}
export interface DrivenOscillatorResult {
  schema:"quantum-result/v1";jobId:string;runId:string;status:"completed";operation:"oscillator_drive";
  model:DrivenOscillatorModel;initialState:OscillatorInitialState;solver:EvolutionSolver;
  engine:{name:EngineName;version:string};
  data:Omit<OscillatorEvolutionResult["data"],"schema"> & {schema:"quantum-driven-oscillator-data/v1"};
  analysis:Omit<OscillatorEvolutionResult["analysis"],"maxEnergyDrift"> & {maxNumberError:number;maxWorkBalanceError:number;energyOffset:number};
  provenance:SpectrumResult["provenance"];
}
export interface PulsedOscillatorModel {
  type:"driven_harmonic_oscillator";
  parameters:DrivenOscillatorModel["parameters"] & {envelope:"gaussian";pulseWidth:number;pulseCenter:number};
}
export interface PulsedOscillatorJob {
  schema:"quantum-job/v1";jobId:string;operation:"oscillator_pulse";engine:EngineName;
  model:PulsedOscillatorModel;initialState:OscillatorInitialState;solver:EvolutionSolver & {maxStep:number};
}
export interface PulsedOscillatorResult {
  schema:"quantum-result/v1";jobId:string;runId:string;status:"completed";operation:"oscillator_pulse";
  model:PulsedOscillatorModel;initialState:OscillatorInitialState;solver:PulsedOscillatorJob["solver"];
  engine:DrivenOscillatorResult["engine"];
  data:Omit<DrivenOscillatorResult["data"],"schema"> & {schema:"quantum-pulsed-oscillator-data/v1"};
  analysis:DrivenOscillatorResult["analysis"] & {startEnvelope:number;endEnvelope:number};
  integration:{method:"qutip-vern9"|"scipy-dop853";rtol:1e-10;atol:1e-12;evaluations:number};
  provenance:SpectrumResult["provenance"];
}
export interface DampedOscillatorJob {
  schema:"quantum-job/v1";jobId:string;operation:"oscillator_damped";engine:EngineName;
  model:{type:"damped_harmonic_oscillator";parameters:{omega:number;cutoff:number;loss:number;thermalOccupation:number}};
  initialState:OscillatorInitialState;
  solver:{type:"master";tStart:number;tStop:number;samples:number};
}
export interface DampedOscillatorResult {
  schema:"quantum-result/v1";jobId:string;runId:string;status:"completed";operation:"oscillator_damped";
  model:DampedOscillatorJob["model"];initialState:OscillatorInitialState;solver:DampedOscillatorJob["solver"];
  engine:{name:EngineName;version:string};
  data:{schema:"quantum-damped-oscillator-data/v1";format:"f64le";path:string;rows:number;columns:string[];bytes:number;sha256:string};
  analysis:{projectionProbability:number;maxTraceError:number;minimumEigenvalue:number;maxBoundaryOccupation:number;maxNumberReferenceError:number};
  provenance:SpectrumResult["provenance"];
}
export interface ParametricOscillatorJob {
  schema:"quantum-job/v1";jobId:string;operation:"oscillator_parametric";engine:EngineName;
  model:{type:"parametric_oscillator";parameters:{omega:number;lambdaRe:number;lambdaIm:number;cutoff:number}};
  initialState:{type:"vacuum"};solver:{type:"schrodinger";tStart:number;tStop:number;samples:number};
}
export interface ParametricOscillatorResult {
  schema:"quantum-result/v1";jobId:string;runId:string;status:"completed";operation:"oscillator_parametric";
  model:ParametricOscillatorJob["model"];initialState:ParametricOscillatorJob["initialState"];solver:ParametricOscillatorJob["solver"];
  engine:{name:EngineName;version:string};
  data:{schema:"quantum-parametric-oscillator-data/v1";format:"f64le";path:string;rows:number;columns:string[];bytes:number;sha256:string};
  analysis:{maxNormDrift:number;maxBoundaryOccupation:number;maxParityDrift:number;maxNumberReferenceError:number;maxQVarianceReferenceError:number;maxPVarianceReferenceError:number;bogoliubovFrequency:number;energyOffset:number};
  provenance:SpectrumResult["provenance"];
}
export interface AnharmonicOscillatorJob {
  schema:"quantum-job/v1";jobId:string;operation:"oscillator_anharmonic";engine:EngineName;
  model:{type:"anharmonic_oscillator";parameters:{mass:1;omega:number;lambda:number;cutoff:number;levels:number}};
}
export interface AnharmonicOscillatorResult {
  schema:"quantum-result/v1";jobId:string;runId:string;status:"completed";operation:"oscillator_anharmonic";
  model:AnharmonicOscillatorJob["model"];engine:{name:EngineName;version:string};
  spectrum:{energies:number[];units:"normalized";hbar:1};
  states:{coefficients:number[][]};
  analysis:{groundX2:number;groundX4:number;groundParity:number;harmonicGround:number};
  provenance:SpectrumResult["provenance"];
}
export type QuantumJob = SpectrumJob | EvolutionJob | CavityJob | LindbladJob | SweepJob | ManyBodyJob | CircuitJob | TopologyJob | OrbitalJob | OscillatorJob | OscillatorEvolutionJob | DrivenOscillatorJob | PulsedOscillatorJob | DampedOscillatorJob | ParametricOscillatorJob | AnharmonicOscillatorJob;
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
  bandKValues?: number[]; lowerBand?: number[]; upperBand?: number[];
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
  /** Optional so spectra saved before UI-3 remain valid and energy-only. */
  stateAnalysis?:
    | { status: "degenerate"; gap: number; threshold: number }
    | { status: "resolved"; gap: number; threshold: number; states: [TwoLevelEigenstate, TwoLevelEigenstate] };
  provenance: {
    pythonVersion: string;
    workerVersion: string;
    computedAt: string;
    durationMs: number;
  };
}
export interface TwoLevelEigenstate {
  /** Real amplitudes in the computational |0>, |1> basis, with a fixed sign convention. */
  amplitudes: [number, number];
  populations: [number, number];
  bloch: { x: number; y: number; z: number };
  residualNorm: number;
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
export type QuantumResult = SpectrumResult | EvolutionResult | CavityResult | LindbladResult | SweepResult | ManyBodyResult | CircuitResult | TopologyResult | OrbitalResult | OscillatorResult | OscillatorEvolutionResult | DrivenOscillatorResult | PulsedOscillatorResult | DampedOscillatorResult | ParametricOscillatorResult | AnharmonicOscillatorResult;
/** Desktop-only verified saved-run readout; no new worker protocol or result schema. */
export interface VerifiedSavedRun {job:QuantumJob;result:QuantumResult;data:Uint8Array|null}
export interface RunComparisonPins {a:string|null;b:string|null}
export interface SavedRunInspection {
  summary: import("./workspace").RunSummary;
  job: QuantumJob;
  engine: QuantumResult["engine"];
  provenance: QuantumResult["provenance"];
  hashes: {job:string;result:string;artifact:string|null};
  lineage: {parentRunId:string;parentJobSha256:string;parentResultSha256:string}|null;
  lineageStatus: "verified-parent"|"detached-parent"|null;
  preflight: {ready:boolean;reason:string|null;differences:string[];fingerprint:string|null};
}
export type OscillatorFamilyResult=OscillatorResult|OscillatorEvolutionResult|DrivenOscillatorResult|PulsedOscillatorResult|DampedOscillatorResult|ParametricOscillatorResult|AnharmonicOscillatorResult;
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
  operations: ("diagonalize" | "evolve" | "cavity" | "lindblad" | "sweep" | "many_body" | "circuit" | "topology" | "orbital" | "oscillator" | "oscillator_evolve" | "oscillator_drive" | "oscillator_pulse" | "oscillator_damped" | "oscillator_parametric" | "oscillator_anharmonic")[];
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
  oscillator(job: OscillatorJob): Promise<OscillatorResult>;
  oscillatorEvolve(job: OscillatorEvolutionJob): Promise<OscillatorEvolutionResult>;
  oscillatorDrive(job: DrivenOscillatorJob): Promise<DrivenOscillatorResult>;
  oscillatorPulse(job: PulsedOscillatorJob): Promise<PulsedOscillatorResult>;
  oscillatorDamped(job: DampedOscillatorJob): Promise<DampedOscillatorResult>;
  oscillatorParametric(job: ParametricOscillatorJob): Promise<ParametricOscillatorResult>;
  oscillatorAnharmonic(job: AnharmonicOscillatorJob): Promise<AnharmonicOscillatorResult>;
  topology(job: TopologyJob): Promise<TopologyResult>;
  orbital(job: OrbitalJob): Promise<OrbitalResult>;
  openAtlasSource(id: string): Promise<void>;
  cancel(jobId: string): Promise<boolean>;
  readData(jobId: string): Promise<Uint8Array>;
  onProgress(listener: (progress: EvolutionProgress) => void): () => void;
  saveWorkspace(snapshot: import("./workspace").WorkspaceSnapshot): Promise<void>;
  loadWorkspace(): Promise<import("./workspace").WorkspaceSnapshot | null>;
  listRuns(): Promise<import("./workspace").RunSummary[]>;
  getVerifiedRun(runId:string):Promise<VerifiedSavedRun>;
  inspectSavedRun(runId:string):Promise<SavedRunInspection>;
  rerunSaved(runId:string,fingerprint:string):Promise<import("./workspace").RunSummary>;
  getRunComparisonPins():Promise<RunComparisonPins>;
  setRunComparisonPins(pins:RunComparisonPins):Promise<RunComparisonPins>;
  getSpectrumRun(runId:string):Promise<SpectrumResult>;
  getRabiRun(runId:string):Promise<{result:EvolutionResult;data:Uint8Array}>;
  getEvolutionRun(runId:string):Promise<{result:EvolutionResult;data:Uint8Array}>;
  getCavityRun(runId:string):Promise<{result:CavityResult;data:Uint8Array}>;
  getLindbladRun(runId:string):Promise<{result:LindbladResult;data:Uint8Array}>;
  getCircuitRun(runId:string):Promise<CircuitResult>;
  getManyBodyRun(runId:string):Promise<ManyBodyResult>;
  getIsingState(runId:string):Promise<import("./ising-state").IsingStateArtifact>;
  getSweepRun(runId:string):Promise<{result:SweepResult;data:Uint8Array}>;
  getTopologyRun(runId:string):Promise<TopologyResult>;
  getOrbitalRun(runId:string):Promise<{result:OrbitalResult;data:Uint8Array}>;
  getOscillatorRun(runId:string):Promise<{result:OscillatorFamilyResult;data:Uint8Array|null}>;
  saveSpectrumStudy(result:import("./spectrum-study").SpectrumStudyResult|import("./spectrum-omega-study").SpectrumOmegaStudyResult):Promise<import("./spectrum-study").SpectrumStudyResult|import("./spectrum-omega-study").SpectrumOmegaStudyResult>;
  getSpectrumStudy(studyId:string):Promise<import("./spectrum-study").SpectrumStudyResult|import("./spectrum-omega-study").SpectrumOmegaStudyResult>;
  listSpectrumStudies():Promise<(import("./spectrum-study").SpectrumStudySummary|import("./spectrum-omega-study").SpectrumOmegaStudySummary)[]>;
  saveIsingStudy(result:import("./ising-study").IsingStudyResult):Promise<import("./ising-study").IsingStudyResult>;
  getIsingStudy(studyId:string):Promise<import("./ising-study").IsingStudyResult>;
  listIsingStudies():Promise<import("./ising-study").IsingStudySummary[]>;
  getScene(runId: string, view?: "standard" | "bands"): Promise<import("../quantum-scene").ScenePayload>;
  exportScene(runId: string, view?: "standard" | "bands", format?: "regular"|"stream"): Promise<string | null>;
  importSceneStream(): Promise<{id:string;manifest:import("../quantum-scene/stream").SceneStream}|null>;
  readSceneChunk(id:string,path:string): Promise<Uint8Array>;
  releaseSceneStream(id:string): Promise<void>;
  importScene(): Promise<import("../quantum-scene").ScenePayload | null>;
  getSceneExample(request: import("../quantum-scene/examples").SceneExampleRequest): Promise<import("../quantum-scene").ScenePayload>;
  exportSceneExample(request: import("../quantum-scene/examples").SceneExampleRequest): Promise<string | null>;
  exportRun(runId: string, format: import("./workspace").RunExportFormat): Promise<string | null>;
  exportRunBundle(runId:string):Promise<string|null>;
  importRunBundle():Promise<import("./workspace").RunSummary|null>;
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
  if (value.operation === "oscillator") {
    const p = value.model.parameters;
    if (p.levels > p.cutoff || p.state >= p.cutoff - 1 || p.points % 2 !== 1)
      throw new Error("Oscillator needs levels<=cutoff, state<cutoff-1 and an odd grid");
  }
  if(value.operation==="oscillator_evolve"){
    const p=value.model.parameters,s=value.solver,i=value.initialState;
    if(p.points%2!==1 || s.tStop<=s.tStart || p.omega*(s.tStop-s.tStart)>100 ||
       (i.type==="fock" ? i.index>=p.cutoff-1 : i.alphaRe**2+i.alphaIm**2>4))
      throw new Error("Oscillator evolution requires an odd grid, 0<omega*duration<=100 and bounded initial state");
  }
  if(value.operation==="oscillator_drive"){
    const p=value.model.parameters,s=value.solver,i=value.initialState,dt=s.tStop-s.tStart;
    const alpha=i.type==="coherent"?Math.hypot(i.alphaRe,i.alphaIm):0;
    if(p.points%2!==1 || dt<=0 || dt>20 || p.omega*dt>50 || Math.hypot(p.epsilonRe,p.epsilonIm)>0.5 ||
       alpha>2 || alpha+Math.hypot(p.epsilonRe,p.epsilonIm)*dt>4 || (i.type==="fock"&&i.index>=p.cutoff-1))
      throw new Error("Unsupported bounded monochromatic oscillator drive");
  }
  if(value.operation==="oscillator_pulse"){
    const p=value.model.parameters,s=value.solver,i=value.initialState,dt=s.tStop-s.tStart;
    const alpha=i.type==="coherent"?Math.hypot(i.alphaRe,i.alphaIm):0;
    if(p.points%2!==1 || dt<=0 || dt>20 || p.omega*dt>50 || Math.hypot(p.epsilonRe,p.epsilonIm)>0.5 ||
       alpha>2 || alpha+Math.hypot(p.epsilonRe,p.epsilonIm)*Math.min(dt,Math.sqrt(2*Math.PI)*p.pulseWidth)>4 ||
       p.pulseCenter<0 || p.pulseCenter>dt || s.maxStep>p.pulseWidth/8 || dt/s.maxStep>20000 ||
       (i.type==="fock"&&i.index>=p.cutoff-1))
      throw new Error("Gaussian pulse requires bounded width/center, maxStep<=width/8 and <=20000 integration intervals");
  }
  if(value.operation==="oscillator_damped"){
    const p=value.model.parameters,s=value.solver,i=value.initialState,dt=s.tStop-s.tStart;
    if(dt<=0 || dt>20 || p.omega*dt>60 || p.loss*dt>12 ||
       (i.type==="fock"?i.index>=p.cutoff-1:i.alphaRe**2+i.alphaIm**2>4))
      throw new Error("Unsupported bounded damped oscillator");
  }
  if(value.operation==="oscillator_parametric"){
    const p=value.model.parameters,s=value.solver,dt=s.tStop-s.tStart;
    if(dt<=0||dt>20||p.omega*dt>50||Math.hypot(p.lambdaRe,p.lambdaIm)>=.9*p.omega||
       Math.hypot(p.lambdaRe,p.lambdaIm)*dt>8)
      throw new Error("Parametric oscillator requires bounded stable coupling, duration and cutoff");
  }
  if(value.operation==="oscillator_anharmonic" && value.model.parameters.levels>value.model.parameters.cutoff-2)
    throw new Error("Anharmonic levels must leave at least two Fock boundary states");
}
