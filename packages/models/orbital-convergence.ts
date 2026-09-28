import type { OrbitalJob, OrbitalResult } from "../contracts";
import { consistentOrbitalResult, orbitalJob } from "./orbital";

// Renderer-safe planning checks. Authoritative schema validation stays in main;
// importing the AJV compiler here would violate the renderer's strict CSP.
function checkJob(job: OrbitalJob) {
  if (
    job.schema !== "quantum-job/v1" ||
    job.operation !== "orbital" ||
    job.engine !== "native" ||
    job.model.type !== "hydrogenic" ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(job.jobId)
  )
    throw new Error("Invalid orbital study job");
  const p = job.model.parameters;
  orbitalJob(job.jobId, {
    n: String(p.n),
    l: String(p.l),
    m: String(p.m),
    basis: p.basis,
    Z: String(p.Z),
    radius: String(p.radius),
    grid: String(p.grid),
  });
}

export type ConvergenceMode = "grid" | "box";
export function convergencePlan(
  base: OrbitalJob,
  mode: ConvergenceMode,
  idPrefix: string,
): OrbitalJob[] {
  checkJob(base);
  if (mode !== "grid" && mode !== "box")
    throw new Error("Unknown convergence study");
  const p = base.model.parameters,
    spacing = (2 * p.radius) / (p.grid - 1);
  const jobs = [21, 31, 41, 49].map((grid) => ({
    ...base,
    jobId: `${idPrefix}-${grid}`,
    model: {
      ...base.model,
      parameters: {
        ...p,
        grid,
        radius: mode === "grid" ? p.radius : (spacing * (grid - 1)) / 2,
      },
    },
  }));
  const bounded = jobs.filter(
    (j) => j.model.parameters.radius >= 0.5 && j.model.parameters.radius <= 120,
  );
  if (bounded.length < 2)
    throw new Error(
      "Need at least two admissible boxes at this spacing; reduce half-width or increase the anchor grid",
    );
  bounded.forEach(checkJob);
  return bounded;
}
export interface ConvergenceRow {
  runId: string;
  grid: number;
  radius: number;
  spacing: number;
  integral: number;
  signedUnityError: number;
  deltaPrevious: number | null;
  sphereBounds: [number, number] | null;
  outsideBounds: number | null;
}
export function convergenceRows(
  base: OrbitalJob,
  mode: ConvergenceMode,
  results: OrbitalResult[],
): ConvergenceRow[] {
  if (mode !== "grid" && mode !== "box")
    throw new Error("Unknown convergence study");
  checkJob(base);
  const p = base.model.parameters,
    spacing = (2 * p.radius) / (p.grid - 1);
  return results.map((result, i) => {
    const q = result.model.parameters;
    for (const key of ["n", "l", "m", "basis", "Z"] as const)
      if (q[key] !== p[key])
        throw new Error("Convergence requires identical orbital physics");
    if (
      result.engine.name !== "native" ||
      (i > 0 && result.engine.version !== results[0].engine.version)
    )
      throw new Error("Convergence engine changed");
    const job: OrbitalJob = {
      ...base,
      jobId: result.jobId,
      model: result.model,
    };
    checkJob(job);
    if (!consistentOrbitalResult(job, result))
      throw new Error("Invalid convergence result");
    const h = (2 * q.radius) / (q.grid - 1);
    if (
      mode === "grid"
        ? Math.abs(q.radius - p.radius) > 1e-12
        : Math.abs(h - spacing) > 1e-12 * Math.max(1, spacing)
    )
      throw new Error("Convergence study changed its held-fixed variable");
    const integral = result.analysis.gridProbability,
      bounds = result.analysis.cubeProbabilityBounds ?? null;
    return {
      runId: result.runId,
      grid: q.grid,
      radius: q.radius,
      spacing: h,
      integral,
      signedUnityError: integral - 1,
      deltaPrevious: i
        ? Math.abs(integral - results[i - 1].analysis.gridProbability)
        : null,
      sphereBounds: bounds,
      outsideBounds: bounds
        ? Math.max(0, bounds[0] - integral, integral - bounds[1])
        : null,
    };
  });
}
