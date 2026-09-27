import Ajv from "ajv";
import type { CavityModel, EngineName, SweepAxis } from "./index";

export type WorkspaceTab = "spectrum" | "hamiltonian" | "dynamics" | "cavity" | "open" | "sweep" | "presets" | "runs" | "roadmap" | "backend";
export type WorkspaceEngine = EngineName | "compare";
export interface WorkspaceSnapshot {
  schema: "quantum-workspace/v1";
  savedAt: string;
  tab: WorkspaceTab;
  selectedPresetId: string | null;
  spectrum: { parameters: Record<string, string>; engine: WorkspaceEngine };
  dynamics: { modelId: "driven_two_level" | "landau_zener" | "stuckelberg" | "strong_drive";
    parameters: Record<string, string>; start: string; stop: string; samples: string;
    basis: 0 | 1; engine: WorkspaceEngine };
  cavity: { modelId: CavityModel["type"]; parameters: Record<string, string>;
    qubit: "ground" | "excited"; photons: string; start: string; stop: string;
    samples: string; engine: EngineName };
  open: { parameters: Record<string, string>; qubit: "ground" | "excited" | "plus_x";
    photons: string; start: string; stop: string; samples: string; engine: EngineName };
  sweep: { modelId: "driven_two_level" | "landau_zener" | "stuckelberg" | "strong_drive";
    parameters: Record<string, string>; x: SweepAxis; y: SweepAxis; twoD: boolean;
    start: string; stop: string; initialIndex: 0 | 1; engine: EngineName };
}
export interface RunSummary {
  schema: "quantum-run-manifest/v1";
  runId: string;
  jobId: string;
  operation: "diagonalize" | "evolve" | "cavity" | "lindblad" | "sweep";
  model: string;
  engine: EngineName;
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
  tab: { enum: ["spectrum", "hamiltonian", "dynamics", "cavity", "open", "sweep", "presets", "runs", "roadmap", "backend"] },
  selectedPresetId: { anyOf: [{ type: "string", maxLength: 100 }, { type: "null" }] },
  spectrum: block(["parameters", "engine"], { parameters: values, engine: { enum: ["qutip", "native", "compare"] } }),
  dynamics: block(["modelId", "parameters", "start", "stop", "samples", "basis", "engine"], {
    modelId: evolutionModel, parameters: values, start: shortText, stop: shortText, samples: shortText,
    basis: { enum: [0, 1] }, engine: { enum: ["qutip", "native", "compare"] },
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
    start: shortText, stop: shortText, initialIndex: { enum: [0, 1] }, engine,
  }),
});
const ajv = new Ajv({ strict: true, allErrors: true });
export const isWorkspaceSnapshot = ajv.compile<WorkspaceSnapshot>(workspaceSchema);
export function assertWorkspaceSnapshot(value: unknown): asserts value is WorkspaceSnapshot {
  if (!isWorkspaceSnapshot(value)) throw new Error(`Invalid quantum-workspace/v1: ${ajv.errorsText(isWorkspaceSnapshot.errors)}`);
}
