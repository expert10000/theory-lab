import Ajv from "ajv";
import type { CavityModel, EngineName, EvolutionEngineName, ManyBodyEngineName, SweepEngineName, SweepAxis } from "./index";

export type WorkspaceTab = "spectrum" | "hamiltonian" | "dynamics" | "cavity" | "open" | "sweep" | "many_body" | "circuit" | "presets" | "runs" | "roadmap" | "backend" | "atlas" | "topology" | "scenes" | "orbital" | "oscillator";
export type ManyBodyWorkspaceEngine = ManyBodyEngineName | "compare";
export type CircuitWorkspaceEngine = import("./index").CircuitEngineName | "compare";
export type WorkspaceEngine = EngineName | "compare";
export type DynamicsWorkspaceEngine = EvolutionEngineName | "compare";
export interface WorkspaceSnapshot {
  schema: "quantum-workspace/v1";
  savedAt: string;
  tab: WorkspaceTab;
  selectedPresetId: string | null;
  spectrum: { parameters: Record<string, string>; engine: WorkspaceEngine };
  dynamics: { modelId: "driven_two_level" | "landau_zener" | "stuckelberg" | "strong_drive";
    parameters: Record<string, string>; start: string; stop: string; samples: string;
    basis: 0 | 1; engine: DynamicsWorkspaceEngine };
  cavity: { modelId: CavityModel["type"]; parameters: Record<string, string>;
    qubit: "ground" | "excited"; photons: string; start: string; stop: string;
    samples: string; engine: EngineName };
  open: { parameters: Record<string, string>; qubit: "ground" | "excited" | "plus_x";
    photons: string; start: string; stop: string; samples: string; engine: EngineName };
  sweep: { modelId: "driven_two_level" | "landau_zener" | "stuckelberg" | "strong_drive";
    parameters: Record<string, string>; x: SweepAxis; y: SweepAxis; twoD: boolean;
    start: string; stop: string; initialIndex: 0 | 1; engine: SweepEngineName };
  manyBody?: { sites: string; interaction: string; transverse: string; longitudinal: string;
    boundary: "open" | "periodic"; engine: ManyBodyWorkspaceEngine };
  circuit?: { EJ: string; EC: string; ng: string; ncut: string; levels: string;
    engine: CircuitWorkspaceEngine };
  topology?: { modelId: "ssh" | "qwz"; t1: string; t2: string; cells: string; kPoints: string; mass: string; grid: string };
  orbital?: { n: string; l: string; m: string; basis: "complex" | "real_cos" | "real_sin"; Z: string; radius: string; grid: string };
  oscillator?: import("../models/oscillator").OscillatorDraft;
  oscillatorDynamics?: import("../models/oscillator-dynamics").OscillatorDynamicsDraft;
  oscillatorDriven?: import("../models/oscillator-drive").DrivenOscillatorDraft;
  oscillatorPulse?: import("../models/oscillator-pulse").PulsedOscillatorDraft;
  oscillatorMode?: "static" | "dynamics" | "driven" | "pulse";
}
export interface RunSummary {
  schema: "quantum-run-manifest/v1";
  runId: string;
  jobId: string;
  operation: "diagonalize" | "evolve" | "cavity" | "lindblad" | "sweep" | "many_body" | "circuit" | "topology" | "orbital" | "oscillator" | "oscillator_evolve" | "oscillator_drive" | "oscillator_pulse";
  model: string;
  engine: EvolutionEngineName | ManyBodyEngineName | import("./index").CircuitEngineName;
  engineVersion: string;
  computedAt: string;
  durationMs: number;
  artifactSha256: string | null;
}
export type RunExportFormat = "csv" | "svg" | "manifest";

const shortText = { type: "string", maxLength: 100 };
const values = { type: "object", maxProperties: 20, propertyNames: { pattern: "^[A-Za-z][A-Za-z0-9]{0,40}$" },
  additionalProperties: shortText };
const block = (required: string[], properties: Record<string, unknown>) =>
  ({ type: "object", additionalProperties: false, required, properties });
const engine = { enum: ["qutip", "native"] };
const evolutionModel = { enum: ["driven_two_level", "landau_zener", "stuckelberg", "strong_drive"] };
const axis = block(["parameter", "start", "stop", "points"], {
  parameter: { enum: ["delta", "amplitude", "frequency", "phase", "sweepRate", "gap", "bias", "turnTime"] },
  start: { type: "number" }, stop: { type: "number" }, points: { type: "integer", minimum: 2, maximum: 101 },
});
const workspaceSchema = block(["schema", "savedAt", "tab", "selectedPresetId", "spectrum", "dynamics", "cavity", "open", "sweep"], {
  schema: { const: "quantum-workspace/v1" },
  savedAt: { type: "string", minLength: 1, maxLength: 50 },
  tab: { enum: ["spectrum", "hamiltonian", "dynamics", "cavity", "open", "sweep", "many_body", "circuit", "presets", "runs", "roadmap", "backend", "atlas", "topology", "scenes", "orbital", "oscillator"] },
  selectedPresetId: { anyOf: [{ type: "string", maxLength: 100 }, { type: "null" }] },
  spectrum: block(["parameters", "engine"], { parameters: values, engine: { enum: ["qutip", "native", "compare"] } }),
  dynamics: block(["modelId", "parameters", "start", "stop", "samples", "basis", "engine"], {
    modelId: evolutionModel, parameters: values, start: shortText, stop: shortText, samples: shortText,
    basis: { enum: [0, 1] }, engine: { enum: ["qutip", "native", "dynamiqs", "compare"] },
  }),
  cavity: block(["modelId", "parameters", "qubit", "photons", "start", "stop", "samples", "engine"], {
    modelId: { enum: ["jaynes_cummings", "quantum_rabi"] }, parameters: values,
    qubit: { enum: ["ground", "excited"] }, photons: shortText, start: shortText, stop: shortText,
    samples: shortText, engine,
  }),
  open: block(["parameters", "qubit", "photons", "start", "stop", "samples", "engine"], {
    parameters: values, qubit: { enum: ["ground", "excited", "plus_x"] }, photons: shortText,
    start: shortText, stop: shortText, samples: shortText, engine,
  }),
  sweep: block(["modelId", "parameters", "x", "y", "twoD", "start", "stop", "initialIndex", "engine"], {
    modelId: evolutionModel, parameters: values, x: axis, y: axis, twoD: { type: "boolean" },
    start: shortText, stop: shortText, initialIndex: { enum: [0, 1] }, engine: { enum: ["qutip", "native", "dynamiqs"] },
  }),
  manyBody: block(["sites", "interaction", "transverse", "longitudinal", "boundary", "engine"], {
    sites: shortText, interaction: shortText, transverse: shortText, longitudinal: shortText,
    boundary: { enum: ["open", "periodic"] }, engine: { enum: ["quspin", "native", "compare"] },
  }),
  circuit: block(["EJ", "EC", "ng", "ncut", "levels", "engine"], {
    EJ: shortText, EC: shortText, ng: shortText, ncut: shortText, levels: shortText,
    engine: { enum: ["scqubits", "native", "compare"] },
  }),
  topology: block(["modelId", "t1", "t2", "cells", "kPoints", "mass", "grid"], {
    modelId: { enum: ["ssh", "qwz"] }, t1: shortText, t2: shortText,
    cells: shortText, kPoints: shortText, mass: shortText, grid: shortText,
  }),
  orbital: block(["n", "l", "m", "basis", "Z", "radius", "grid"], {
    n: shortText, l: shortText, m: shortText, basis: { enum: ["complex", "real_cos", "real_sin"] },
    Z: shortText, radius: shortText, grid: shortText,
  }),
  oscillator: block(["omega", "cutoff", "levels", "state", "extent", "points", "engine"], {
    omega: shortText, cutoff: shortText, levels: shortText, state: shortText, extent: shortText, points: shortText,
    engine: { enum: ["qutip", "native", "compare"] },
  }),
  oscillatorMode: { enum: ["static", "dynamics", "driven", "pulse"] },
  oscillatorPulse: block(["omega", "cutoff", "extent", "points", "initial", "index", "alphaRe", "alphaIm", "start", "stop", "samples", "engine", "epsilonRe", "epsilonIm", "driveFrequency", "pulseWidth", "pulseCenter", "maxStep"], {
    omega: shortText, cutoff: shortText, extent: shortText, points: shortText,
    initial: { enum: ["fock", "coherent"] }, index: shortText, alphaRe: shortText, alphaIm: shortText,
    start: shortText, stop: shortText, samples: shortText, epsilonRe: shortText, epsilonIm: shortText, driveFrequency: shortText,
    pulseWidth: shortText, pulseCenter: shortText, maxStep: shortText,
    engine: { enum: ["qutip", "native", "compare"] },
  }),
  oscillatorDriven: block(["omega", "cutoff", "extent", "points", "initial", "index", "alphaRe", "alphaIm", "start", "stop", "samples", "engine", "epsilonRe", "epsilonIm", "driveFrequency"], {
    omega: shortText, cutoff: shortText, extent: shortText, points: shortText,
    initial: { enum: ["fock", "coherent"] }, index: shortText, alphaRe: shortText, alphaIm: shortText,
    start: shortText, stop: shortText, samples: shortText, epsilonRe: shortText, epsilonIm: shortText, driveFrequency: shortText,
    engine: { enum: ["qutip", "native", "compare"] },
  }),
  oscillatorDynamics: block(["omega", "cutoff", "extent", "points", "initial", "index", "alphaRe", "alphaIm", "start", "stop", "samples", "engine"], {
    omega: shortText, cutoff: shortText, extent: shortText, points: shortText,
    initial: { enum: ["fock", "coherent"] }, index: shortText, alphaRe: shortText, alphaIm: shortText,
    start: shortText, stop: shortText, samples: shortText,
    engine: { enum: ["qutip", "native", "compare"] },
  }),
});
const ajv = new Ajv({ strict: true, allErrors: true });
export const isWorkspaceSnapshot = ajv.compile<WorkspaceSnapshot>(workspaceSchema);
export function assertWorkspaceSnapshot(value: unknown): asserts value is WorkspaceSnapshot {
  if (!isWorkspaceSnapshot(value)) throw new Error(`Invalid quantum-workspace/v1: ${ajv.errorsText(isWorkspaceSnapshot.errors)}`);
}
