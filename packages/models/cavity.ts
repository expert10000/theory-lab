import type { CavityJob, CavityModel, EngineName } from "../contracts";

export type CavityModelId = CavityModel["type"];
export interface CavityDefinition {
  id: CavityModelId;
  label: string;
  description: string;
  hamiltonian: string;
  defaults: { qubitFrequency: number; cavityFrequency: number; coupling: number; cutoff: number };
  source?: CavityModel["source"];
}
export const CAVITY_REGISTRY: Record<CavityModelId, CavityDefinition> = {
  jaynes_cummings: {
    id: "jaynes_cummings",
    label: "Jaynes–Cummings",
    description: "Excitation-conserving atom–cavity exchange and dressed doublets",
    hamiltonian: "H = ωc a†a + ωq |e⟩⟨e| + g(σ₊a + σ₋a†)",
    defaults: { qubitFrequency: 1, cavityFrequency: 1, coupling: 0.35, cutoff: 6 },
    source: {
      sourceRepository: "https://github.com/expert10000/theory",
      sourceModule: "examples/python/qutip/adapters/jaynes_cummings.py",
      volume: "VIII", exampleId: "Commit 691",
    },
  },
  quantum_rabi: {
    id: "quantum_rabi",
    label: "Quantum Rabi",
    description: "Full atom–cavity coupling with counter-rotating terms",
    hamiltonian: "H = ωc a†a + ωq |e⟩⟨e| + g σx(a + a†)",
    defaults: { qubitFrequency: 1, cavityFrequency: 1, coupling: 0.35, cutoff: 8 },
  },
};
export function cavityDefaults(id: CavityModelId): Record<string, string> {
  return Object.fromEntries(Object.entries(CAVITY_REGISTRY[id].defaults).map(([key, value]) => [key, String(value)]));
}
export function cavityJob(
  id: CavityModelId,
  jobId: string,
  input: Record<string, string>,
  initialState: CavityJob["initialState"],
  solver: CavityJob["solver"],
  engine: EngineName,
): CavityJob {
  const qubitFrequency = Number(input.qubitFrequency);
  const cavityFrequency = Number(input.cavityFrequency);
  const coupling = Number(input.coupling);
  const cutoff = Number(input.cutoff);
  if (["qubitFrequency", "cavityFrequency", "coupling", "cutoff"].some((key) => !input[key]?.trim()) ||
      ![qubitFrequency, cavityFrequency, coupling, cutoff].every(Number.isFinite) ||
      qubitFrequency < 0 || qubitFrequency > 1000 || cavityFrequency < 0 || cavityFrequency > 1000 ||
      coupling < 0 || coupling > 100 || !Number.isInteger(cutoff) || cutoff < 3 || cutoff > 20 ||
      !Number.isInteger(initialState.photons) || initialState.photons < 0 || initialState.photons >= cutoff ||
      !Number.isFinite(solver.tStart) || !Number.isFinite(solver.tStop) ||
      solver.tStart < -1000 || solver.tStop > 1000 || solver.tStop <= solver.tStart ||
      !Number.isInteger(solver.samples) || solver.samples < 2 || solver.samples > 5000)
    throw new Error("Invalid cavity parameters or Fock cutoff");
  return {
    schema: "quantum-job/v1", jobId, operation: "cavity", engine,
    model: { type: id, parameters: { qubitFrequency, cavityFrequency, coupling, cutoff },
             ...(CAVITY_REGISTRY[id].source ? { source: CAVITY_REGISTRY[id].source } : {}) },
    initialState, solver,
  };
}
