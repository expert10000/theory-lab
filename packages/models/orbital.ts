import type {
  OrbitalJob,
  OrbitalResult,
  WorkspaceSnapshot,
} from "../contracts";
export type OrbitalDraft = NonNullable<WorkspaceSnapshot["orbital"]>;
export const ORBITAL_DEFAULTS: OrbitalDraft = {
  n: "1",
  l: "0",
  m: "0",
  basis: "complex",
  Z: "1",
  radius: "8",
  grid: "31",
};
export function orbitalJob(jobId: string, draft: OrbitalDraft): OrbitalJob {
  const p = {
    n: Number(draft.n),
    l: Number(draft.l),
    m: Number(draft.m),
    basis: draft.basis,
    Z: Number(draft.Z),
    radius: Number(draft.radius),
    grid: Number(draft.grid),
  };
  if (
    [draft.n, draft.l, draft.m, draft.Z, draft.radius, draft.grid].some(
      (v) => !v.trim(),
    ) ||
    ![p.n, p.l, p.m, p.Z, p.radius, p.grid].every(Number.isFinite) ||
    !Number.isInteger(p.n) ||
    !Number.isInteger(p.l) ||
    !Number.isInteger(p.m) ||
    !Number.isInteger(p.Z) ||
    p.n < 1 ||
    p.n > 3 ||
    p.l < 0 ||
    p.l >= p.n ||
    Math.abs(p.m) > p.l ||
    p.Z < 1 ||
    p.Z > 6 ||
    p.radius < 0.5 ||
    p.radius > 120 ||
    ![21, 31, 41, 49].includes(p.grid) ||
    !["complex", "real_cos", "real_sin"].includes(p.basis) ||
    (p.basis !== "complex" && p.m < 0) ||
    (p.basis === "real_sin" && p.m === 0)
  )
    throw new Error(
      "Invalid orbital parameters: n=1…3, 0≤l<n, |m|≤l; real harmonics need m≥0 (sin: m>0)",
    );
  return {
    schema: "quantum-job/v1",
    jobId,
    operation: "orbital",
    engine: "native",
    model: { type: "hydrogenic", parameters: p },
  };
}
export function consistentOrbitalResult(
  job: OrbitalJob,
  result: OrbitalResult,
) {
  const p = job.model.parameters,
    a = result.analysis;
  // Independent closed forms for degrees 0–2, the complete supported n<=3 range.
  const expectedNodes =
    p.n - p.l - 1 === 0
      ? []
      : p.n - p.l - 1 === 1
        ? [(p.n * (p.l + 1)) / p.Z]
        : [3 - Math.sqrt(3), 3 + Math.sqrt(3)].map(
            (r) => (r * p.n) / (2 * p.Z),
          );
  return (
    result.jobId === job.jobId &&
    JSON.stringify(result.model) === JSON.stringify(job.model) &&
    result.data.rows === p.grid ** 3 &&
    result.data.bytes === p.grid ** 3 * 16 &&
    Math.abs(a.energyHartree + (p.Z * p.Z) / (2 * p.n * p.n)) < 1e-10 &&
    Math.abs(a.radialNormalization - 1) < 1e-8 &&
    Math.abs(a.meanRadius - (3 * p.n * p.n - p.l * (p.l + 1)) / (2 * p.Z)) <
      1e-8 &&
    a.radialRadii.length === 401 &&
    a.radialProbability.length === 401 &&
    a.radialRadii[0] === 0 &&
    a.radialProbability[0] === 0 &&
    a.radialRadii.every((v, i) => i === 0 || v > a.radialRadii[i - 1]) &&
    (a.radialNodes === undefined ||
      (a.radialNodes.length === expectedNodes.length &&
        a.radialNodes.every(
          (r, i) => Math.abs(r - expectedNodes[i]) < 1e-9,
        ))) &&
    (a.cubeProbabilityBounds === undefined ||
      (a.cubeProbabilityBounds.length === 2 &&
        a.cubeProbabilityBounds[0] >= 0 &&
        a.cubeProbabilityBounds[1] <= 1 &&
        a.cubeProbabilityBounds[0] <= a.cubeProbabilityBounds[1] + 1e-12))
  );
}
/** Independent trapezoidal check of the exact received Float64 grid; no rescaling. */
export function checkOrbitalData(
  result: OrbitalResult,
  data: Uint8Array,
): number {
  const p = result.model.parameters,
    n = p.grid;
  if (data.byteLength !== n ** 3 * 16)
    throw new Error("Invalid orbital grid byte count");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let sum = 0;
  for (let x = 0; x < n; x++)
    for (let y = 0; y < n; y++)
      for (let z = 0; z < n; z++) {
        const offset = ((x * n + y) * n + z) * 16,
          re = view.getFloat64(offset, true),
          im = view.getFloat64(offset + 8, true);
        if (
          !Number.isFinite(re) ||
          !Number.isFinite(im) ||
          Math.abs(re) > 1e100 ||
          Math.abs(im) > 1e100
        )
          throw new Error("Invalid orbital amplitude");
        const weight =
          (x === 0 || x === n - 1 ? 0.5 : 1) *
          (y === 0 || y === n - 1 ? 0.5 : 1) *
          (z === 0 || z === n - 1 ? 0.5 : 1);
        sum += (re * re + im * im) * weight;
      }
  const measured = sum * ((2 * p.radius) / (n - 1)) ** 3;
  if (
    !Number.isFinite(measured) ||
    Math.abs(measured - result.analysis.gridProbability) >
      1e-9 * Math.max(1, measured)
  )
    throw new Error("Orbital grid integral disagrees with received data");
  return measured;
}
