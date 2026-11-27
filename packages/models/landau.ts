import type { LandauCandidate, LandauJob, LandauParameters, LandauPhase, LandauResult } from "../contracts/landau";

const EPS = 1e-9;
const close = (a: number, b: number) => Number.isFinite(a) && Math.abs(a - b) <= 2e-7 * (1 + Math.abs(b));

export function landauJob(parameters: LandauParameters, jobId: string): LandauJob {
  return { schema: "quantum-landau-job/v1", jobId,
    model: { type: "two_order_landau", parameters } };
}

/** Independent analytic check of the worker's stationary-point and stability report. */
export function landauEquilibrium({ a1, a2, b1, b2, g }: LandauParameters) {
  const energy = (x: number, y: number) => a1*x + a2*y + b1*x*x/2 + b2*y*y/2 + g*x*y;
  const candidates: LandauCandidate[] = [];
  const add = (phase: LandauPhase, x: number, y: number, locallyStable: boolean) =>
    candidates.push({ phase, x, y, freeEnergy: energy(x,y), locallyStable });
  add("normal", 0, 0, a1 >= -EPS && a2 >= -EPS);
  if (a1 < -EPS) {
    const x = -a1 / b1;
    add("sc1", x, 0, a2 + g*x >= -EPS);
  }
  if (a2 < -EPS) {
    const y = -a2 / b2;
    add("sc2", 0, y, a1 + g*y >= -EPS);
  }
  const quarticDeterminant = b1*b2 - g*g;
  if (quarticDeterminant > EPS) {
    const x = (-b2*a1 + g*a2) / quarticDeterminant;
    const y = (g*a1 - b1*a2) / quarticDeterminant;
    if (x > EPS && y > EPS) add("mixed", x, y, true);
  }
  const stable = candidates.filter(row => row.locallyStable);
  const best = Math.min(...stable.map(row => row.freeEnergy));
  const globalMinima = stable.filter(row => Math.abs(row.freeEnergy-best) <=
    1e-8*(1+Math.abs(best))).map(row => row.phase);
  return { candidates, globalMinima, quarticDeterminant,
    marginalQuartic: Math.abs(quarticDeterminant) <= EPS };
}

export function consistentLandauResult(job: LandauJob, result: LandauResult): boolean {
  if (result.jobId !== job.jobId || result.status !== "completed" ||
      JSON.stringify(result.model) !== JSON.stringify(job.model) ||
      result.units.orderAmplitude !== "dimensionless" || result.units.freeEnergy !== "dimensionless" ||
      Number.isNaN(Date.parse(result.provenance.computedAt))) return false;
  const expected = landauEquilibrium(job.model.parameters);
  return close(result.quarticDeterminant, expected.quarticDeterminant) &&
    result.marginalQuartic === expected.marginalQuartic &&
    JSON.stringify(result.globalMinima) === JSON.stringify(expected.globalMinima) &&
    result.candidates.length === expected.candidates.length &&
    result.candidates.every((row, index) => {
      const other = expected.candidates[index];
      return row.phase === other.phase && row.locallyStable === other.locallyStable &&
        close(row.x, other.x) && close(row.y, other.y) && close(row.freeEnergy, other.freeEnergy);
    });
}
