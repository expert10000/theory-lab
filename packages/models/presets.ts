import type { CavityJob, EngineName, EvolutionJob, LayerOneSource, LindbladJob } from "../contracts";
import { evolutionJob, type EvolutionModelId } from "./index";
import { cavityJob, type CavityModelId } from "./cavity";
import { lindbladJob } from "./lindblad";

export const THEORY_REVISION = "434e29b4ed7d412a9cee6aa2853bb933fc872494";
const ROOT = "https://github.com/expert10000/theory";
function source(module: string, commit: string): LayerOneSource {
  return { sourceRepository: `${ROOT}/tree/${THEORY_REVISION}`,
    sourceModule: `examples/python/qutip/${module}`, volume: "VIII", exampleId: `Commit ${commit}` };
}
interface CommonPreset {
  id: string;
  title: string;
  description: string;
  reference: string;
  convention: string;
  source: LayerOneSource;
}
export interface EvolutionPreset extends CommonPreset {
  kind: "evolution";
  modelId: EvolutionModelId;
  parameters: Record<string, number>;
  initialIndex: 0 | 1;
  solver: { tStart: number; tStop: number; samples: number };
}
export interface CavityPreset extends CommonPreset {
  kind: "cavity";
  modelId: CavityModelId;
  parameters: CavityJob["model"]["parameters"];
  initialState: CavityJob["initialState"];
  solver: { tStart: number; tStop: number; samples: number };
}
export interface OpenPreset extends CommonPreset {
  kind: "open";
  parameters: LindbladJob["model"]["parameters"];
  initialState: LindbladJob["initialState"];
  solver: { tStart: number; tStop: number; samples: number };
}
export type LaboratoryPreset = EvolutionPreset | CavityPreset | OpenPreset;

export const PRESETS: readonly LaboratoryPreset[] = [
  {
    id: "viii-resonant-rabi", kind: "evolution", title: "Resonant Rabi oscillation",
    description: "The Commit 687 constant transverse drive, represented by the desktop driven model at ω = 0 and φ = 0.",
    reference: "P₁(t) = sin²(t/2) for Δ = 0, A = 1 and initial |0⟩.",
    convention: "The reference's constant Ωσx/2 is the ω = 0 limit of A cos(ωt + φ)σx/2.",
    source: source("labs/two_level_dynamics.py", "687"), modelId: "driven_two_level",
    parameters: { delta: 0, amplitude: 1, frequency: 0, phase: 0 },
    initialIndex: 0, solver: { tStart: 0, tStop: 10, samples: 401 },
  },
  {
    id: "viii-landau-zener", kind: "evolution", title: "Landau–Zener crossing",
    description: "Commit 687's linear detuning sweep with its 0.5 gap and 0.5 sweep rate.",
    reference: "Infinite-window diabatic survival: exp[−πg²/(2v)]; the displayed run has finite endpoints.",
    convention: "Desktop gap g equals the reference Δ; both use the diabatic |0⟩ initial basis.",
    source: source("labs/two_level_dynamics.py", "687"), modelId: "landau_zener",
    parameters: { sweepRate: .5, gap: .5, bias: 0 },
    initialIndex: 0, solver: { tStart: -10, tStop: 10, samples: 401 },
  },
  {
    id: "viii-vacuum-rabi", kind: "cavity", title: "Jaynes–Cummings vacuum Rabi",
    description: "Commit 691's resonant, atom-first |e,0⟩ exchange at g = 0.35.",
    reference: "P(e,t) = cos²(gt); dressed-doublet splitting = 2g at resonance.",
    convention: "Both use |g⟩ = |0⟩, |e⟩ = |1⟩. Desktop lab-frame energies differ by a frame offset.",
    source: source("adapters/jaynes_cummings.py", "691"), modelId: "jaynes_cummings",
    parameters: { qubitFrequency: 1, cavityFrequency: 1, coupling: .35, cutoff: 6 },
    initialState: { qubit: "excited", photons: 0 }, solver: { tStart: 0, tStop: 20, samples: 401 },
  },
  {
    id: "viii-t1-relaxation", kind: "open", title: "T₁ relaxation",
    description: "Commit 688's isolated two-level amplitude damping at γ₁ = 0.35.",
    reference: "Excited population decays as exp(−0.35t).",
    convention: "Commit 688 calls QuTiP |0⟩ the decaying state; desktop calls its equivalent state |e⟩ = |1⟩.",
    source: source("labs/open_system_dynamics.py", "688"),
    parameters: { qubitDetuning: 1, cavityDetuning: 0, coupling: 0, driveAmplitude: 0,
      relaxation: .35, dephasing: 0, cavityLoss: .2, cutoff: 4 },
    initialState: { qubit: "excited", photons: 0 }, solver: { tStart: 0, tStop: 12, samples: 241 },
  },
  {
    id: "viii-dephasing", kind: "open", title: "Pure dephasing",
    description: "Commit 688's |+x⟩ state under γφ = 0.25, with no energy exchange.",
    reference: "|ρge(t)| = ½ exp(−0.25t); purity = [1 + exp(−0.5t)]/2.",
    convention: "The qubit population labels differ from Commit 688; the coherence magnitude and purity do not.",
    source: source("labs/open_system_dynamics.py", "688"),
    parameters: { qubitDetuning: 1, cavityDetuning: 0, coupling: 0, driveAmplitude: 0,
      relaxation: 0, dephasing: .25, cavityLoss: .2, cutoff: 4 },
    initialState: { qubit: "plus_x", photons: 0 }, solver: { tStart: 0, tStop: 12, samples: 241 },
  },
  {
    id: "viii-cavity-loss", kind: "open", title: "Damped cavity occupation",
    description: "Commit 690's zero-temperature photon-number decay, here initialized in a two-photon Fock state.",
    reference: "⟨n(t)⟩ = 2 exp(−0.18t). The full Commit 690 coherent-state/thermal/g² suites are not reproduced.",
    convention: "The atom is a decoupled spectator; this preset tests only the analytic number-decay limit.",
    source: source("adapters/bosonic.py", "690"),
    parameters: { qubitDetuning: 0, cavityDetuning: 1, coupling: 0, driveAmplitude: 0,
      relaxation: .1, dephasing: 0, cavityLoss: .18, cutoff: 6 },
    initialState: { qubit: "ground", photons: 2 }, solver: { tStart: 0, tStop: 20, samples: 401 },
  },
];

export function presetJob(preset: LaboratoryPreset, jobId: string, engine: EngineName = "qutip"):
  EvolutionJob | CavityJob | LindbladJob {
  const input = Object.fromEntries(Object.entries(preset.parameters).map(([key, value]) => [key, String(value)]));
  if (preset.kind === "evolution")
    return evolutionJob(preset.modelId, jobId, input, preset.initialIndex,
      preset.solver.tStart, preset.solver.tStop, preset.solver.samples, engine, preset.source);
  if (preset.kind === "cavity")
    return cavityJob(preset.modelId, jobId, input, preset.initialState,
      { type: "schrodinger", ...preset.solver }, engine, preset.source);
  return lindbladJob(jobId, input, preset.initialState, { type: "master", ...preset.solver }, engine, preset.source);
}
