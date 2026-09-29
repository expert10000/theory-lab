import type {
  EngineName,
  OscillatorEvolutionJob,
  OscillatorEvolutionResult,
  OscillatorInitialState,
  DrivenOscillatorResult,
} from "../contracts";
import { oscillatorAmplitude } from "./oscillator";

export const OSCILLATOR_DYNAMICS_DEFAULTS = {
  omega: "1",
  cutoff: "24",
  extent: "8",
  points: "201",
  initial: "coherent" as const,
  index: "0",
  alphaRe: "1",
  alphaIm: "0",
  start: "0",
  stop: "6.283185307179586",
  samples: "201",
  engine: "compare" as const,
};
export type OscillatorDynamicsDraft = Omit<
  typeof OSCILLATOR_DYNAMICS_DEFAULTS,
  "initial" | "engine"
> & { initial: "coherent" | "fock"; engine: EngineName | "compare" };
export const OSCILLATOR_MOMENT_COLUMNS = [
  "time",
  "q_mean",
  "p_mean",
  "q_variance",
  "p_variance",
  "mean_number",
  "boundary_probability",
  "norm",
  "q_exact",
  "p_exact",
];
export const oscillatorColumns = (cutoff: number) => [
  ...OSCILLATOR_MOMENT_COLUMNS,
  ...Array.from({ length: cutoff }, (_, n) => [`c${n}_re`, `c${n}_im`]).flat(),
];

/** CSP-safe preview validation; main and worker also validate JSON Schema. */
export function oscillatorEvolutionJob(
  jobId: string,
  d: OscillatorDynamicsDraft,
  engine: EngineName,
): OscillatorEvolutionJob {
  if (Object.entries(d).some(([, v]) => !String(v).trim()))
    throw new Error("All evolution fields are required");
  const p = {
    omega: Number(d.omega),
    cutoff: Number(d.cutoff),
    extent: Number(d.extent),
    points: Number(d.points),
  };
  const s = {
    type: "schrodinger" as const,
    tStart: Number(d.start),
    tStop: Number(d.stop),
    samples: Number(d.samples),
  };
  const i: OscillatorInitialState =
    d.initial === "fock"
      ? { type: "fock", index: Number(d.index) }
      : {
          type: "coherent",
          alphaRe: Number(d.alphaRe),
          alphaIm: Number(d.alphaIm),
        };
  if (
    !/^[A-Za-z0-9_-]{1,100}$/.test(jobId) ||
    !["qutip", "native"].includes(engine) ||
    !["fock", "coherent"].includes(d.initial) ||
    !Number.isFinite(p.omega) ||
    p.omega < 0.01 ||
    p.omega > 20 ||
    !Number.isInteger(p.cutoff) ||
    p.cutoff < 8 ||
    p.cutoff > 64 ||
    !Number.isFinite(p.extent) ||
    p.extent < 2 ||
    p.extent > 12 ||
    !Number.isInteger(p.points) ||
    p.points < 101 ||
    p.points > 401 ||
    p.points % 2 !== 1 ||
    !Number.isFinite(s.tStart) ||
    !Number.isFinite(s.tStop) ||
    Math.abs(s.tStart) > 100 ||
    Math.abs(s.tStop) > 100 ||
    s.tStop <= s.tStart ||
    p.omega * (s.tStop - s.tStart) > 100 ||
    !Number.isInteger(s.samples) ||
    s.samples < 3 ||
    s.samples > 1001 ||
    (i.type === "fock"
      ? !Number.isInteger(i.index) ||
        i.index < 0 ||
        i.index > 10 ||
        i.index >= p.cutoff - 1
      : !Number.isFinite(i.alphaRe) ||
        !Number.isFinite(i.alphaIm) ||
        i.alphaRe ** 2 + i.alphaIm ** 2 > 4)
  )
    throw new Error("Invalid bounded oscillator evolution parameters");
  return {
    schema: "quantum-job/v1",
    jobId,
    operation: "oscillator_evolve",
    engine,
    model: { type: "harmonic_oscillator", parameters: p },
    initialState: i,
    solver: s,
  };
}
/** Normalized projection P_N|alpha>/sqrt(<alpha|P_N|alpha>), explicit initial-state definition. */
export function initialOscillatorCoefficients(
  cutoff: number,
  i: OscillatorInitialState,
) {
  const re = Array(cutoff).fill(0) as number[],
    im = Array(cutoff).fill(0) as number[];
  if (i.type === "fock") re[i.index] = 1;
  else {
    re[0] = Math.exp(-(i.alphaRe ** 2 + i.alphaIm ** 2) / 2);
    for (let n = 1; n < cutoff; n++) {
      re[n] = (re[n - 1] * i.alphaRe - im[n - 1] * i.alphaIm) / Math.sqrt(n);
      im[n] = (re[n - 1] * i.alphaIm + im[n - 1] * i.alphaRe) / Math.sqrt(n);
    }
  }
  const probability = re.reduce((s, v, n) => s + v * v + im[n] * im[n], 0);
  const scale = Math.sqrt(probability);
  return {
    re: re.map((v) => v / scale),
    im: im.map((v) => v / scale),
    probability,
    omitted: Math.max(0, 1 - probability),
  };
}
export function oscillatorMoments(re: number[], im: number[]) {
  const n = re.length,
    norm = re.reduce((s, v, k) => s + v * v + im[k] * im[k], 0);
  let q = 0,
    p = 0,
    q2 = 0,
    p2 = 0,
    number = 0;
  for (let k = 0; k < n; k++) {
    const ar = k + 1 < n ? Math.sqrt(k + 1) * re[k + 1] : 0,
      ai = k + 1 < n ? Math.sqrt(k + 1) * im[k + 1] : 0;
    const dr = k > 0 ? Math.sqrt(k) * re[k - 1] : 0,
      di = k > 0 ? Math.sqrt(k) * im[k - 1] : 0;
    const qr = (ar + dr) / Math.SQRT2,
      qi = (ai + di) / Math.SQRT2,
      pr = (ai - di) / Math.SQRT2,
      pi = -(ar - dr) / Math.SQRT2;
    q += re[k] * qr + im[k] * qi;
    p += re[k] * pr + im[k] * pi;
    q2 += qr * qr + qi * qi;
    p2 += pr * pr + pi * pi;
    number += k * (re[k] * re[k] + im[k] * im[k]);
  }
  return [
    q / norm,
    p / norm,
    q2 / norm - (q / norm) ** 2,
    p2 / norm - (p / norm) ** 2,
    number / norm,
    (re[n - 1] ** 2 + im[n - 1] ** 2) / norm,
    norm,
  ];
}
export function consistentOscillatorEvolutionResult(
  job: OscillatorEvolutionJob,
  r: OscillatorEvolutionResult,
): boolean {
  const n = job.model.parameters.cutoff,
    init = initialOscillatorCoefficients(n, job.initialState);
  return (
    r.jobId === job.jobId &&
    r.engine.name === job.engine &&
    JSON.stringify(r.model) === JSON.stringify(job.model) &&
    JSON.stringify(r.initialState) === JSON.stringify(job.initialState) &&
    JSON.stringify(r.solver) === JSON.stringify(job.solver) &&
    r.data.path === `${job.jobId}.f64` &&
    r.data.rows === job.solver.samples &&
    r.data.bytes === r.data.rows * (10 + 2 * n) * 8 &&
    JSON.stringify(r.data.columns) === JSON.stringify(oscillatorColumns(n)) &&
    Math.abs(r.analysis.projectionProbability - init.probability) < 1e-12 &&
    Math.abs(r.analysis.omittedProbability - init.omitted) < 1e-12
  );
}
/** Hash verification belongs to host/readData; this independently checks scientific contents as well. */
export function checkOscillatorEvolutionData(
  r: OscillatorEvolutionResult,
  bytes: Uint8Array,
): Float64Array {
  const job: OscillatorEvolutionJob = {
    schema: "quantum-job/v1",
    jobId: r.jobId,
    operation: "oscillator_evolve",
    engine: r.engine.name,
    model: r.model,
    initialState: r.initialState,
    solver: r.solver,
  };
  if (
    !consistentOscillatorEvolutionResult(job, r) ||
    bytes.byteLength !== r.data.bytes
  )
    throw new Error("Invalid oscillator dynamics shape/metadata");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    values = new Float64Array(bytes.byteLength / 8);
  for (let k = 0; k < values.length; k++) {
    values[k] = view.getFloat64(k * 8, true);
    if (!Number.isFinite(values[k]))
      throw new Error("Non-finite oscillator dynamics data");
  }
  const n = r.model.parameters.cutoff,
    stride = 10 + 2 * n,
    init = initialOscillatorCoefficients(n, r.initialState),
    omega = r.model.parameters.omega;
  let drift = 0,
    boundary = 0,
    qerror = 0,
    perror = 0,
    energy = 0;
  const near = (a: number, b: number) =>
    Math.abs(a - b) <= 2e-6 * Math.max(1, Math.abs(b));
  for (let row = 0; row < r.data.rows; row++) {
    const o = row * stride,
      t =
        r.solver.tStart +
        ((r.solver.tStop - r.solver.tStart) * row) / (r.data.rows - 1),
      tau = t - r.solver.tStart;
    if (!near(values[o], t)) throw new Error("Invalid oscillator sample times");
    const re: number[] = [],
      im: number[] = [];
    for (let k = 0; k < n; k++) {
      const angle = omega * (k + 0.5) * tau,
        c = Math.cos(angle),
        s = Math.sin(angle);
      re.push(values[o + 10 + 2 * k]);
      im.push(values[o + 11 + 2 * k]);
      if (
        !near(re[k], init.re[k] * c + init.im[k] * s) ||
        !near(im[k], init.im[k] * c - init.re[k] * s)
      )
        throw new Error("Oscillator amplitudes violate free evolution");
    }
    const m = oscillatorMoments(re, im);
    for (let k = 0; k < 7; k++)
      if (!near(values[o + 1 + k], m[k]))
        throw new Error("Inconsistent oscillator moments");
    const i = r.initialState,
      c = Math.cos(omega * tau),
      s = Math.sin(omega * tau);
    const qe =
        i.type === "coherent"
          ? Math.SQRT2 * (i.alphaRe * c + i.alphaIm * s)
          : 0,
      pe =
        i.type === "coherent"
          ? Math.SQRT2 * (i.alphaIm * c - i.alphaRe * s)
          : 0;
    if (!near(values[o + 8], qe) || !near(values[o + 9], pe))
      throw new Error("Invalid oscillator analytic reference");
    drift = Math.max(drift, Math.abs(m[6] - 1));
    boundary = Math.max(boundary, m[5]);
    qerror = Math.max(qerror, Math.abs(m[0] - qe));
    perror = Math.max(perror, Math.abs(m[1] - pe));
    energy = Math.max(energy, omega * Math.abs(m[4] - values[5]));
  }
  for (const [key, value] of Object.entries({
    maxNormDrift: drift,
    maxBoundaryOccupation: boundary,
    maxQError: qerror,
    maxPError: perror,
    maxEnergyDrift: energy,
  }))
    if (!near(r.analysis[key as keyof typeof r.analysis], value))
      throw new Error("Invalid oscillator diagnostics");
  return values;
}
export function oscillatorDensity(
  r: OscillatorEvolutionResult | DrivenOscillatorResult,
  data: Float64Array,
  row: number,
) {
  if (
    !Number.isInteger(row) ||
    row < 0 ||
    row >= r.data.rows ||
    data.length * 8 !== r.data.bytes
  )
    throw new Error("Invalid oscillator time cursor");
  const p = r.model.parameters,
    o = row * r.data.columns.length,
    coefficientStart = r.operation === "oscillator_drive" ? 13 : 10,
    q = Array.from(
      { length: p.points },
      (_, k) => -p.extent + (2 * p.extent * k) / (p.points - 1),
    );
  const density = q.map((x) => {
    let re = 0,
      im = 0;
    for (let n = 0; n < p.cutoff; n++) {
      const basis = oscillatorAmplitude(n, x);
      re += basis * data[o + coefficientStart + 2 * n];
      im += basis * data[o + coefficientStart + 1 + 2 * n];
    }
    return re * re + im * im;
  });
  const probability = density.reduce(
    (s, v, k) =>
      s +
      (v * (k === 0 || k === p.points - 1 ? 0.5 : 1) * 2 * p.extent) /
        (p.points - 1),
    0,
  );
  return { q, density, probability };
}

export function compareOscillatorMotion(
  left: OscillatorEvolutionResult | DrivenOscillatorResult,
  a: Float64Array,
  right: OscillatorEvolutionResult | DrivenOscillatorResult,
  b: Float64Array,
) {
  if (
    left.operation !== right.operation || JSON.stringify(left.model) !== JSON.stringify(right.model) ||
    JSON.stringify(left.initialState) !== JSON.stringify(right.initialState) ||
    JSON.stringify(left.solver) !== JSON.stringify(right.solver) ||
    a.length !== b.length ||
    a.length * 8 !== left.data.bytes ||
    b.length * 8 !== right.data.bytes
  )
    throw new Error("Cannot compare mismatched oscillator jobs");
  const n = left.model.parameters.cutoff,
    start = left.operation === "oscillator_drive" ? 13 : 10,
    stride = start + 2 * n;
  let q = 0,
    p = 0,
    infidelity = 0;
  for (let row = 0; row < left.data.rows; row++) {
    const o = row * stride;
    if (Math.abs(a[o] - b[o]) > 1e-8)
      throw new Error("Oscillator comparison time grids differ");
    q = Math.max(q, Math.abs(a[o + 1] - b[o + 1]));
    p = Math.max(p, Math.abs(a[o + 2] - b[o + 2]));
    let re = 0,
      im = 0,
      na = 0,
      nb = 0;
    for (let k = 0; k < n; k++) {
      const ar = a[o + start + 2 * k],
        ai = a[o + start + 1 + 2 * k],
        br = b[o + start + 2 * k],
        bi = b[o + start + 1 + 2 * k];
      re += ar * br + ai * bi;
      im += ar * bi - ai * br;
      na += ar * ar + ai * ai;
      nb += br * br + bi * bi;
    }
    infidelity = Math.max(
      infidelity,
      Math.max(0, 1 - (re * re + im * im) / (na * nb)),
    );
  }
  return { q, p, infidelity };
}
