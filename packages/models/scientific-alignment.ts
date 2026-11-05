export type ScientificSeries = { positions: readonly number[]; values: readonly number[];
  coordinateUnit: string; valueUnit: string };
export type AlignedSeries = { positions: number[]; a: number[]; b: number[];
  policy: "exact" | "linear"; flags: string[] };

const factors: Record<string, number> = { "rad": 1, "deg": Math.PI / 180,
  "a0": 1, "nm": 1 / 0.0529177210903, "model-time": 1, "dimensionless": 1,
  "normalized": 1, "probability": 1 };
const convert = (from: string, to: string): number | null => {
  if (from === to) return 1;
  if ((from === "rad" || from === "deg") && (to === "rad" || to === "deg")) return factors[from] / factors[to];
  if ((from === "a0" || from === "nm") && (to === "a0" || to === "nm")) return factors[from] / factors[to];
  return null;
};
const increasing = (values: readonly number[]) => values.every((value, index) =>
  Number.isFinite(value) && (!index || value > values[index - 1]));
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b));

/** Align scalar samples only. No extrapolation, phase interpolation or inferred error bars. */
export function alignScientificSeries(a: ScientificSeries, b: ScientificSeries,
  policy: "exact" | "linear"): AlignedSeries | null {
  const xScale = convert(b.coordinateUnit, a.coordinateUnit), yScale = convert(b.valueUnit, a.valueUnit);
  if (xScale === null || yScale === null || a.positions.length < 2 || b.positions.length < 2 ||
      a.positions.length !== a.values.length || b.positions.length !== b.values.length ||
      !increasing(a.positions) || !increasing(b.positions) ||
      !a.values.every(Number.isFinite) || !b.values.every(Number.isFinite)) return null;
  const bx = b.positions.map(value => value * xScale), by = b.values.map(value => value * yScale);
  if (a.positions.length === bx.length && a.positions.every((value, index) => near(value, bx[index])))
    return { positions: [...a.positions], a: [...a.values], b: by, policy: "exact",
      flags: xScale !== 1 || yScale !== 1 ? ["declared unit conversion"] : [] };
  if (policy !== "linear" || !increasing(bx)) return null;
  const positions: number[] = [], av: number[] = [], bv: number[] = [];
  let j = 0;
  for (let i = 0; i < a.positions.length; i++) {
    const x = a.positions[i];
    if (x < bx[0] || x > bx[bx.length - 1]) continue;
    while (j + 1 < bx.length - 1 && bx[j + 1] < x) j++;
    const width = bx[j + 1] - bx[j];
    if (width <= 0) return null;
    positions.push(x); av.push(a.values[i]);
    bv.push(by[j] + (by[j + 1] - by[j]) * (x - bx[j]) / width);
  }
  if (positions.length < 2) return null;
  return { positions, a: av, b: bv, policy: "linear", flags: [
    "B linearly interpolated onto overlapping A coordinates", "outside-overlap samples excluded",
    "interpolation error and source uncertainty not quantified",
    ...(xScale !== 1 || yScale !== 1 ? ["declared unit conversion"] : [])] };
}

export function matchTwoLevelEigenstates(a: { gap: number; threshold: number;
  states: readonly { amplitudes: readonly [number, number] }[] },
  b: { gap: number; threshold: number; states: readonly { amplitudes: readonly [number, number] }[] }):
  { assignment: readonly [number, number]; fidelities: readonly [number, number]; flags: string[] } | null {
  if (a.states.length !== 2 || b.states.length !== 2 ||
      a.gap <= a.threshold || b.gap <= b.threshold) return null;
  const overlap = (i: number, j: number) => {
    const x = a.states[i].amplitudes, y = b.states[j].amplitudes;
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== 2 || y.length !== 2 ||
        ![...x, ...y].every(Number.isFinite)) return NaN;
    return (x[0] * y[0] + x[1] * y[1]) ** 2;
  };
  const direct = overlap(0, 0) + overlap(1, 1), swapped = overlap(0, 1) + overlap(1, 0);
  if (!Number.isFinite(direct + swapped) || Math.abs(direct - swapped) < 1e-6) return null;
  const assignment = direct > swapped ? [0, 1] as const : [1, 0] as const;
  const fidelities = [overlap(0, assignment[0]), overlap(1, assignment[1])] as const;
  if (fidelities.some(value => value < 0.75)) return null;
  return { assignment, fidelities,
    flags: ["phase/sign invariant squared overlap", "resolved nondegenerate states only", "no amplitude subtraction"] };
}
