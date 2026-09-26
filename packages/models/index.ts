import type {
  EvolutionJob,
  EngineName,
  LayerOneSource,
  Observable,
  SpectrumJob,
} from "../contracts";

export type ModelId =
  "two_level" | "driven_two_level" | "landau_zener" | "stuckelberg";
export type EvolutionModelId = Exclude<ModelId, "two_level">;
export interface ParameterDefinition {
  key: string;
  label: string;
  symbol: string;
  unit: "normalized";
  defaultValue: number;
  minimum: number;
  maximum: number;
  step: number;
  description: string;
}
export interface ModelDefinition {
  id: ModelId;
  label: string;
  description: string;
  hamiltonian: string;
  operations: ("diagonalize" | "evolve")[];
  parameters: readonly ParameterDefinition[];
  observables: readonly Observable[];
  defaultState: { type: "basis"; index: 0 | 1 };
  solverDefaults?: { tStart: number; tStop: number; samples: number };
  source?: LayerOneSource;
}
const parameter = (
  key: string,
  label: string,
  symbol: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
  description: string,
  step = 0.1,
): ParameterDefinition => ({
  key,
  label,
  symbol,
  unit: "normalized",
  defaultValue,
  minimum,
  maximum,
  description,
  step,
});
export const MODEL_REGISTRY: Record<ModelId, ModelDefinition> = {
  two_level: {
    id: "two_level",
    label: "Two-level system",
    description: "Static coupled two-state Hamiltonian",
    hamiltonian: "H = Δ/2 σz + Ω/2 σx",
    operations: ["diagonalize"],
    parameters: [
      parameter(
        "delta",
        "Detuning",
        "Δ",
        1,
        -1e6,
        1e6,
        "Longitudinal energy splitting",
      ),
      parameter(
        "omega",
        "Transverse coupling",
        "Ω",
        0.8,
        -1e6,
        1e6,
        "Static coupling between basis states",
      ),
    ],
    observables: [],
    defaultState: { type: "basis", index: 0 },
    source: { volume: "VIII", chapter: "58" },
  },
  driven_two_level: {
    id: "driven_two_level",
    label: "Rabi dynamics",
    description: "Periodically driven two-state system",
    hamiltonian: "H(t) = Δ/2 σz + A/2 cos(ωt + φ) σx",
    operations: ["evolve"],
    parameters: [
      parameter(
        "delta",
        "Detuning",
        "Δ",
        1,
        -1e6,
        1e6,
        "Longitudinal energy splitting",
      ),
      parameter(
        "amplitude",
        "Drive amplitude",
        "A",
        0.8,
        -1e6,
        1e6,
        "Transverse drive strength",
      ),
      parameter(
        "frequency",
        "Drive frequency",
        "ω",
        1.05,
        0,
        1e6,
        "Angular drive frequency",
      ),
      parameter(
        "phase",
        "Drive phase",
        "φ",
        0,
        -1000,
        1000,
        "Drive phase in radians",
      ),
    ],
    observables: ["p0", "p1", "sigma_x", "sigma_y", "sigma_z"],
    defaultState: { type: "basis", index: 0 },
    solverDefaults: { tStart: 0, tStop: 20, samples: 401 },
    source: { volume: "VIII", chapter: "58" },
  },
  landau_zener: {
    id: "landau_zener",
    label: "Landau–Zener",
    description: "Linear detuning sweep through an avoided crossing",
    hamiltonian: "H(t) = (vt + ε₀)/2 σz + g/2 σx",
    operations: ["evolve"],
    parameters: [
      parameter(
        "sweepRate",
        "Sweep rate",
        "v",
        1,
        -1e6,
        1e6,
        "Rate of linear detuning",
      ),
      parameter(
        "gap",
        "Coupling gap",
        "g",
        0.8,
        -1e6,
        1e6,
        "Transverse coupling at the crossing",
      ),
      parameter("bias", "Bias", "ε₀", 0, -1e6, 1e6, "Detuning offset"),
    ],
    observables: ["p0", "p1", "sigma_x", "sigma_y", "sigma_z"],
    defaultState: { type: "basis", index: 0 },
    solverDefaults: { tStart: -10, tStop: 10, samples: 401 },
    source: { volume: "VIII", chapter: "58" },
  },
  stuckelberg: {
    id: "stuckelberg",
    label: "Stückelberg",
    description: "Double passage through an avoided crossing",
    hamiltonian: "H(t) = [v(t²−τ²)/(2τ)+ε₀]/2 σz + g/2 σx",
    operations: ["evolve"],
    parameters: [
      parameter(
        "sweepRate",
        "Crossing rate",
        "v",
        1,
        -1e6,
        1e6,
        "Magnitude of the local sweep rate at ±τ",
      ),
      parameter(
        "gap",
        "Coupling gap",
        "g",
        0.8,
        -1e6,
        1e6,
        "Transverse coupling at each crossing",
      ),
      parameter(
        "bias",
        "Bias",
        "ε₀",
        0,
        -1e6,
        1e6,
        "Longitudinal detuning offset",
      ),
      parameter(
        "turnTime",
        "Crossing time",
        "τ",
        4,
        0.1,
        1000,
        "Crossings occur at ±τ when bias is zero",
      ),
    ],
    observables: ["p0", "p1", "sigma_x", "sigma_y", "sigma_z"],
    defaultState: { type: "basis", index: 0 },
    solverDefaults: { tStart: -12, tStop: 12, samples: 601 },
    source: { volume: "VIII", chapter: "58" },
  },
};
export const MODEL_LIST = Object.values(MODEL_REGISTRY);
export function defaultsFor(id: ModelId): Record<string, string> {
  return Object.fromEntries(
    MODEL_REGISTRY[id].parameters.map((item) => [
      item.key,
      String(item.defaultValue),
    ]),
  );
}
export function parametersFor(
  id: ModelId,
  values: Record<string, string>,
): Record<string, number> | null {
  const result: Record<string, number> = {};
  for (const definition of MODEL_REGISTRY[id].parameters) {
    const raw = values[definition.key];
    if (typeof raw !== "string" || raw.trim() === "") return null;
    const value = Number(raw);
    if (
      !Number.isFinite(value) ||
      value < definition.minimum ||
      value > definition.maximum
    )
      return null;
    result[definition.key] = value;
  }
  return result;
}
export function spectrumJob(
  jobId: string,
  values: Record<string, string>,
  engine: EngineName = "qutip",
): SpectrumJob {
  const p = parametersFor("two_level", values);
  if (!p) throw new Error("Invalid two-level parameters");
  return {
    schema: "quantum-job/v1",
    jobId,
    operation: "diagonalize",
    engine,
    model: {
      type: "two_level",
      parameters: { delta: p.delta, omega: p.omega },
      source: MODEL_REGISTRY.two_level.source,
    },
  };
}
export function evolutionJob(
  id: EvolutionModelId,
  jobId: string,
  values: Record<string, string>,
  initialIndex: 0 | 1,
  tStart: number,
  tStop: number,
  samples: number,
  engine: EngineName = "qutip",
): EvolutionJob {
  const p = parametersFor(id, values);
  if (
    !p ||
    !Number.isFinite(tStart) ||
    !Number.isFinite(tStop) ||
    tStart < -1000 ||
    tStop > 1000 ||
    tStop <= tStart ||
    !Number.isInteger(samples) ||
    samples < 2 ||
    samples > 50000
  )
    throw new Error("Invalid evolution parameters");
  const definition = MODEL_REGISTRY[id];
  const model: EvolutionJob["model"] =
    id === "driven_two_level"
      ? {
          type: id,
          parameters: {
            delta: p.delta,
            amplitude: p.amplitude,
            frequency: p.frequency,
            phase: p.phase,
          },
          source: definition.source,
        }
      : id === "landau_zener"
        ? {
            type: id,
            parameters: { sweepRate: p.sweepRate, gap: p.gap, bias: p.bias },
            source: definition.source,
          }
        : {
            type: id,
            parameters: {
              sweepRate: p.sweepRate,
              gap: p.gap,
              bias: p.bias,
              turnTime: p.turnTime,
            },
            source: definition.source,
          };
  return {
    schema: "quantum-job/v1",
    jobId,
    operation: "evolve",
    engine,
    model,
    initialState: { type: "basis", index: initialIndex },
    solver: { type: "schrodinger", tStart, tStop, samples },
    observables: [...definition.observables],
  };
}
