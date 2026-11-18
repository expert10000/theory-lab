import type { BoseHubbardJob, BoseHubbardResult } from "../contracts/bose-hubbard";

export const BOSE_HUBBARD_DEFAULTS = {
  particles: 2, interactionRatio: 2,
} as const;

export function boseHubbardJob(particles: number, interactionRatio: number,
  jobId: string): BoseHubbardJob {
  return { schema: "quantum-bose-hubbard-job/v1", jobId, engine: "native",
    model: { type: "bose_hubbard_dimer", parameters: {
      particles, interactionRatio, hopping: 1, boundary: "open" } } };
}

const close = (actual: number, expected: number) =>
  Number.isFinite(actual) && Math.abs(actual - expected) <= 2e-7 * (1 + Math.abs(expected));

/** Recheck every stored eigenstate against the declared finite Hamiltonian. */
export function consistentBoseHubbardResult(job: BoseHubbardJob,
  result: BoseHubbardResult): boolean {
  const { particles: count, interactionRatio: ratio } = job.model.parameters;
  if (result.jobId !== job.jobId || result.engine.name !== "native" ||
      JSON.stringify(result.model) !== JSON.stringify(job.model) ||
      result.basis.leftOccupations.length !== count + 1 ||
      result.spectrum.energies.length !== count + 1 || result.states.length !== count + 1 ||
      !result.basis.leftOccupations.every((n, i) => n === i) ||
      !close(result.spectrum.gap, result.spectrum.energies[1] - result.spectrum.energies[0]))
    return false;
  const energies = result.spectrum.energies;
  if (energies.some((energy, i) => i > 0 && energy <= energies[i - 1])) return false;
  for (const [index, state] of result.states.entries()) {
    const a = state.amplitudes;
    if (state.index !== index || a.length !== count + 1) return false;
    const probability = a.map(value => value * value);
    const norm = probability.reduce((sum, value) => sum + value, 0);
    const first = a.find(value => Math.abs(value) > 1e-12);
    if (first === undefined || first < 0 || !close(norm, 1) ||
        !close(state.normalizationError, Math.abs(Math.sqrt(norm) - 1))) return false;
    let left = 0, leftSquared = 0, coherence = 0, residualSquared = 0;
    for (let n = 0; n <= count; n++) {
      left += n * probability[n];
      leftSquared += n * n * probability[n];
      if (n < count) coherence += a[n] * a[n + 1] * Math.sqrt((n + 1) * (count - n));
      const diagonal = ratio * (n * (n - 1) + (count - n) * (count - n - 1)) / 2;
      const action = diagonal * a[n]
        - (n > 0 ? Math.sqrt(n * (count - n + 1)) * a[n - 1] : 0)
        - (n < count ? Math.sqrt((n + 1) * (count - n)) * a[n + 1] : 0);
      residualSquared += (action - energies[index] * a[n]) ** 2;
    }
    const variance = Math.max(0, leftSquared - left * left);
    if (!close(state.occupation[0], left) || !close(state.occupation[1], count - left) ||
        !close(state.numberVariance[0], variance) || !close(state.numberVariance[1], variance) ||
        !close(state.oneBodyCoherence, coherence) ||
        !close(state.residual, Math.sqrt(residualSquared)) || state.residual > 1e-7)
      return false;
  }
  return true;
}
