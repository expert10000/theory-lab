import type { EngineName, LayerOneSource, LindbladJob } from "../contracts";

export const LINDBLAD_DEFAULTS = {
  qubitDetuning: 0.4,
  cavityDetuning: 0.2,
  coupling: 0.25,
  driveAmplitude: 0.12,
  relaxation: 0.3,
  dephasing: 0.08,
  cavityLoss: 0.2,
  cutoff: 4,
} as const;
export const LINDBLAD_FIELDS = [
  ["qubitDetuning", "Qubit detuning Δq", -1000, 1000, 0.05],
  ["cavityDetuning", "Cavity detuning Δc", -1000, 1000, 0.05],
  ["coupling", "Atom–cavity coupling g", 0, 100, 0.05],
  ["driveAmplitude", "Cavity drive F", -100, 100, 0.05],
  ["relaxation", "Relaxation γ₁", 0, 100, 0.05],
  ["dephasing", "Dephasing γφ", 0, 100, 0.05],
  ["cavityLoss", "Cavity loss κ", 0, 100, 0.05],
  ["cutoff", "Fock cutoff N", 3, 12, 1],
] as const;
export function lindbladDefaults(): Record<string, string> {
  return Object.fromEntries(Object.entries(LINDBLAD_DEFAULTS).map(([key, value]) => [key, String(value)]));
}
export function lindbladJob(
  jobId: string,
  input: Record<string, string>,
  initialState: LindbladJob["initialState"],
  solver: LindbladJob["solver"],
  engine: EngineName,
  source?: LayerOneSource,
): LindbladJob {
  const values: Record<string, number> = {};
  for (const [key, , minimum, maximum] of LINDBLAD_FIELDS) {
    if (!input[key]?.trim()) throw new Error(`Missing ${key}`);
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < minimum || value > maximum) throw new Error(`Invalid ${key}`);
    values[key] = value;
  }
  const cutoff = values.cutoff;
  if (!Number.isInteger(cutoff) || !Number.isInteger(initialState.photons) ||
      initialState.photons < 0 || initialState.photons >= cutoff ||
      !Number.isFinite(solver.tStart) || !Number.isFinite(solver.tStop) ||
      solver.tStart < -1000 || solver.tStop > 1000 || solver.tStop <= solver.tStart ||
      !Number.isInteger(solver.samples) || solver.samples < 2 || solver.samples > 5000)
    throw new Error("Invalid initial state, time range, or Fock cutoff");
  return {
    schema: "quantum-job/v1", jobId, operation: "lindblad", engine,
    model: { type: "open_jaynes_cummings", parameters: values as LindbladJob["model"]["parameters"],
      ...(source ? { source } : {}) },
    initialState, solver,
  };
}
