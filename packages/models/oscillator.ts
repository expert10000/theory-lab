import { assertJob, type EngineName, type OscillatorJob, type OscillatorResult } from "../contracts";
export const OSCILLATOR_DEFAULTS = { omega: "1", cutoff: "16", levels: "6", state: "0", extent: "8", points: "201", engine: "compare" as const };
export type OscillatorDraft = Omit<typeof OSCILLATOR_DEFAULTS, "engine"> & { engine: EngineName | "compare" };
export function oscillatorJob(jobId: string, draft: Omit<OscillatorDraft, "engine">, engine: EngineName): OscillatorJob {
  const fields = ["omega", "cutoff", "levels", "state", "extent", "points"] as const;
  if (fields.some(key => !draft[key].trim())) throw new Error("All oscillator parameters are required");
  const parameters = Object.fromEntries(fields.map(key => [key, Number(draft[key])])) as OscillatorJob["model"]["parameters"];
  const job: OscillatorJob = { schema: "quantum-job/v1", jobId, operation: "oscillator", engine, model: { type: "harmonic_oscillator", parameters } };
  assertJob(job); return job;
}
/** Independent normalized Hermite recurrence; q is dimensionless, not physical x. */
export function oscillatorAmplitude(n: number, q: number): number {
  let previous = Math.PI ** (-0.25) * Math.exp(-q*q/2);
  if (!n) return previous;
  let current = Math.SQRT2 * q * previous;
  for (let k = 1; k < n; k++) { const next = Math.sqrt(2/(k+1))*q*current-Math.sqrt(k/(k+1))*previous; previous=current; current=next; }
  return current;
}
export function consistentOscillatorResult(job: OscillatorJob, result: OscillatorResult): boolean {
  const p = job.model.parameters, { q, amplitude, density } = result.state, a = result.analysis;
  if (result.jobId !== job.jobId || result.engine.name !== job.engine || JSON.stringify(result.model) !== JSON.stringify(job.model) ||
      result.spectrum.energies.length !== p.levels || [q, amplitude, density].some(v => v.length !== p.points)) return false;
  const close = (x: number, y: number) => Number.isFinite(x) && Math.abs(x-y) <= 1e-9*Math.max(1, Math.abs(y));
  let integral = 0, error = 0;
  const step = 2*p.extent/(p.points-1);
  for (let i=0; i<p.points; i++) {
    if (!close(q[i], -p.extent+i*step) || !close(amplitude[i], oscillatorAmplitude(p.state, q[i])) || !close(density[i], amplitude[i]**2)) return false;
    integral += density[i] * (i===0 || i===p.points-1 ? .5 : 1) * step;
  }
  for (let i=0; i<p.levels; i++) {
    const target=p.omega*(i+.5), actual=result.spectrum.energies[i];
    if (!close(actual,target)) return false;
    error=Math.max(error,Math.abs(actual-target));
  }
  return close(a.ladderError,error) && close(a.cutoffDrift,0) && close(a.qVariance,p.state+.5) && close(a.pVariance,p.state+.5) && close(a.boundaryOccupation,0) && close(a.gridProbability,integral);
}
