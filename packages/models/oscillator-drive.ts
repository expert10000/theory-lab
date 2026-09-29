import type {
  DrivenOscillatorJob,
  DrivenOscillatorModel,
  DrivenOscillatorResult,
  EngineName,
  OscillatorInitialState,
  PulsedOscillatorResult,
} from "../contracts";
import {
  OSCILLATOR_DYNAMICS_DEFAULTS,
  oscillatorEvolutionJob,
  initialOscillatorCoefficients,
  oscillatorMoments,
  OSCILLATOR_MOMENT_COLUMNS,
  type OscillatorDynamicsDraft,
} from "./oscillator-dynamics";

export type DrivenOscillatorDraft = OscillatorDynamicsDraft & {
  epsilonRe: string;
  epsilonIm: string;
  driveFrequency: string;
};
export const DRIVEN_OSCILLATOR_DEFAULTS: DrivenOscillatorDraft = {
  ...OSCILLATOR_DYNAMICS_DEFAULTS,
  alphaRe: "0",
  epsilonRe: "0.2",
  epsilonIm: "0",
  driveFrequency: "1",
};
export const drivenOscillatorColumns = (n: number) => [
  ...OSCILLATOR_MOMENT_COLUMNS,
  "number_exact",
  "energy",
  "power",
  ...Array.from({ length: n }, (_, k) => [`c${k}_re`, `c${k}_im`]).flat(),
];
export function drivenOscillatorJob(
  jobId: string,
  d: DrivenOscillatorDraft,
  engine: EngineName,
): DrivenOscillatorJob {
  const free = oscillatorEvolutionJob(jobId, d, engine),
    p = {
      ...free.model.parameters,
      epsilonRe: Number(d.epsilonRe),
      epsilonIm: Number(d.epsilonIm),
      driveFrequency: Number(d.driveFrequency),
    };
  const duration = free.solver.tStop - free.solver.tStart,
    alpha =
      free.initialState.type === "coherent"
        ? Math.hypot(free.initialState.alphaRe, free.initialState.alphaIm)
        : 0;
  if (
    ![d.epsilonRe, d.epsilonIm, d.driveFrequency].every(
      (v) => v.trim() && Number.isFinite(Number(v)),
    ) ||
    p.omega < 0.1 ||
    p.omega > 5 ||
    p.driveFrequency < 0 ||
    p.driveFrequency > 5 ||
    Math.hypot(p.epsilonRe, p.epsilonIm) > 0.5 ||
    duration > 20 ||
    p.omega * duration > 50 ||
    alpha + Math.hypot(p.epsilonRe, p.epsilonIm) * duration > 4
  )
    throw new Error("Unsupported bounded monochromatic oscillator drive");
  return {
    ...free,
    operation: "oscillator_drive",
    model: { type: "driven_harmonic_oscillator", parameters: p },
  };
}
/** Stable full-Hilbert-space displacement, with tau measured from tStart. */
export function drivenReference(
  p: DrivenOscillatorModel["parameters"],
  i: OscillatorInitialState,
  tau: number,
) {
  const x = ((p.omega - p.driveFrequency) * tau) / 2,
    sinc = Math.abs(x) < 1e-8 ? 1 - (x * x) / 6 : Math.sin(x) / x,
    angle = (-(p.omega + p.driveFrequency) * tau) / 2;
  const scale = tau * sinc,
    er = p.epsilonRe,
    ei = p.epsilonIm;
  const dr = scale * (ei * Math.cos(angle) + er * Math.sin(angle)),
    di = scale * (ei * Math.sin(angle) - er * Math.cos(angle));
  const c = Math.cos(p.omega * tau),
    s = Math.sin(p.omega * tau);
  const re = dr + (i.type === "coherent" ? i.alphaRe * c + i.alphaIm * s : 0),
    im = di + (i.type === "coherent" ? i.alphaIm * c - i.alphaRe * s : 0);
  return {
    q: Math.SQRT2 * re,
    p: Math.SQRT2 * im,
    number: (i.type === "fock" ? i.index : 0) + re * re + im * im,
  };
}
export function consistentDrivenOscillatorResult(
  j: DrivenOscillatorJob,
  r: DrivenOscillatorResult,
) {
  const initial = initialOscillatorCoefficients(
      j.model.parameters.cutoff,
      j.initialState,
    ),
    n = j.model.parameters.cutoff;
  return (
    r.jobId === j.jobId &&
    r.engine.name === j.engine &&
    JSON.stringify(r.model) === JSON.stringify(j.model) &&
    JSON.stringify(r.initialState) === JSON.stringify(j.initialState) &&
    JSON.stringify(r.solver) === JSON.stringify(j.solver) &&
    r.data.path === `${j.jobId}.f64` &&
    r.data.rows === j.solver.samples &&
    r.data.bytes === r.data.rows * (13 + 2 * n) * 8 &&
    JSON.stringify(r.data.columns) ===
      JSON.stringify(drivenOscillatorColumns(n)) &&
    Math.abs(r.analysis.energyOffset - j.model.parameters.omega / 2) < 1e-12 &&
    Math.abs(r.analysis.projectionProbability - initial.probability) < 1e-12 &&
    Math.abs(r.analysis.omittedProbability - initial.omitted) < 1e-12
  );
}
/** Independent exp(-i H_rot dt) action by scaled 12th-order Taylor recurrence.
 * Not SciPy eigendecomposition, QuTiP integration, or normalization. Bounded
 * tridiagonal rows keep each step's ||H dt|| <= .25 (Gershgorin bound).
 */
function finiteReference(
  p: DrivenOscillatorModel["parameters"],
  i: OscillatorInitialState,
) {
  const n = p.cutoff,
    init = initialOscillatorCoefficients(n, i),
    re = Float64Array.from(init.re),
    im = Float64Array.from(init.im);
  let tr = new Float64Array(n),
    ti = new Float64Array(n),
    nr = new Float64Array(n),
    ni = new Float64Array(n);
  const bound =
    Math.abs(p.omega - p.driveFrequency) * (n - 1) +
    p.omega / 2 +
    2 * Math.hypot(p.epsilonRe, p.epsilonIm) * Math.sqrt(n);
  const roots = Float64Array.from({ length: n + 1 }, (_, k) => Math.sqrt(k));
  let previous = 0;
  return (tau: number) => {
    const count = Math.max(1, Math.ceil(((tau - previous) * bound) / 0.25)),
      h = (tau - previous) / count;
    for (let step = 0; step < count; step++) {
      tr.set(re);
      ti.set(im);
      for (let order = 1; order <= 12; order++) {
        for (let k = 0; k < n; k++) {
          const diagonal = (p.omega - p.driveFrequency) * k + p.omega / 2;
          let hr = diagonal * tr[k],
            hi = diagonal * ti[k];
          if (k > 0) {
            hr +=
              roots[k] * (p.epsilonRe * tr[k - 1] - p.epsilonIm * ti[k - 1]);
            hi +=
              roots[k] * (p.epsilonRe * ti[k - 1] + p.epsilonIm * tr[k - 1]);
          }
          if (k + 1 < n) {
            hr +=
              roots[k + 1] *
              (p.epsilonRe * tr[k + 1] + p.epsilonIm * ti[k + 1]);
            hi +=
              roots[k + 1] *
              (p.epsilonRe * ti[k + 1] - p.epsilonIm * tr[k + 1]);
          }
          nr[k] = (h / order) * hi;
          ni[k] = (-h / order) * hr;
        }
        for (let k = 0; k < n; k++) {
          re[k] += nr[k];
          im[k] += ni[k];
        }
        [tr, nr] = [nr, tr];
        [ti, ni] = [ni, ti];
      }
    }
    previous = tau;
    return Array.from({ length: n }, (_, k) => {
      const angle = p.driveFrequency * k * tau,
        c = Math.cos(angle),
        s = Math.sin(angle);
      return [re[k] * c + im[k] * s, im[k] * c - re[k] * s];
    });
  };
}
/** Host/readData verifies hashes; this verifies finite dynamics and all readouts. */
export function checkDrivenOscillatorData(
  r: DrivenOscillatorResult,
  bytes: Uint8Array,
): Float64Array {
  const j: DrivenOscillatorJob = {
    schema: "quantum-job/v1",
    jobId: r.jobId,
    operation: "oscillator_drive",
    model: r.model,
    initialState: r.initialState,
    solver: r.solver,
    engine: r.engine.name,
  };
  return checkForcedOscillatorData(r,bytes,{
    consistent:consistentDrivenOscillatorResult(j,r),
    at:finiteReference(r.model.parameters,r.initialState),
    reference:tau=>drivenReference(r.model.parameters,r.initialState,tau),
    envelope:tau=>{
      const p=r.model.parameters,angle=p.driveFrequency*tau;
      const re=p.epsilonRe*Math.cos(angle)+p.epsilonIm*Math.sin(angle),im=p.epsilonIm*Math.cos(angle)-p.epsilonRe*Math.sin(angle);
      return {re,im,derivativeRe:p.driveFrequency*im,derivativeIm:-p.driveFrequency*re};
    },
  });
}
/** Shared numerical reader; each forcing mode supplies independent references. */
export function checkForcedOscillatorData(
  r:DrivenOscillatorResult|PulsedOscillatorResult,bytes:Uint8Array,
  checks:{consistent:boolean;at:(tau:number)=>number[][];
    reference:(tau:number)=>{q:number;p:number;number:number};
    envelope:(tau:number)=>{re:number;im:number;derivativeRe:number;derivativeIm:number}},
):Float64Array {
  if (
    !checks.consistent ||
    bytes.byteLength !== r.data.bytes
  )
    throw new Error("Invalid driven oscillator metadata/shape");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    v = new Float64Array(bytes.byteLength / 8);
  for (let k = 0; k < v.length; k++) {
    v[k] = view.getFloat64(k * 8, true);
    if (!Number.isFinite(v[k]))
      throw new Error("Non-finite driven oscillator data");
  }
  const p = r.model.parameters,
    n = p.cutoff,
    stride = 13 + 2 * n,
    at = checks.at,
    near = (a: number, b: number) =>
      Math.abs(a - b) <= 2e-6 * Math.max(1, Math.abs(b));
  const diagnostics = {
    maxNormDrift: 0,
    maxBoundaryOccupation: 0,
    maxQError: 0,
    maxPError: 0,
    maxNumberError: 0,
    maxWorkBalanceError: 0,
  };
  let work = 0;
  for (let row = 0; row < r.data.rows; row++) {
    const o = row * stride,
      t =
        r.solver.tStart +
        ((r.solver.tStop - r.solver.tStart) * row) / (r.data.rows - 1),
      tau = t - r.solver.tStart;
    if (!near(v[o], t)) throw new Error("Invalid driven oscillator time grid");
    const expected = at(tau),
      re: number[] = [],
      im: number[] = [];
    for (let k = 0; k < n; k++) {
      re.push(v[o + 13 + 2 * k]);
      im.push(v[o + 14 + 2 * k]);
      if (!near(re[k], expected[k][0]) || !near(im[k], expected[k][1]))
        throw new Error(
          "Driven oscillator amplitudes violate finite evolution",
        );
    }
    const m = oscillatorMoments(re, im),
      ref = checks.reference(tau);
    for (let k = 0; k < 7; k++)
      if (!near(v[o + 1 + k], m[k]))
        throw new Error("Inconsistent driven oscillator moments");
    const {re:er,im:ei,derivativeRe,derivativeIm}=checks.envelope(tau);
    const energy =
        p.omega * (m[4] + 0.5) + Math.SQRT2 * (er * m[0] + ei * m[1]),
      power = Math.SQRT2 * (derivativeRe*m[0]+derivativeIm*m[1]);
    for (const [col, value] of [
      [8, ref.q],
      [9, ref.p],
      [10, ref.number],
      [11, energy],
      [12, power],
    ])
      if (!near(v[o + col], value))
        throw new Error("Invalid driven oscillator reference/energy/power");
    if (row > 0)
      work += ((power + v[o - stride + 12]) * (t - v[o - stride])) / 2;
    diagnostics.maxNormDrift = Math.max(
      diagnostics.maxNormDrift,
      Math.abs(m[6] - 1),
    );
    diagnostics.maxBoundaryOccupation = Math.max(
      diagnostics.maxBoundaryOccupation,
      m[5],
    );
    diagnostics.maxQError = Math.max(
      diagnostics.maxQError,
      Math.abs(m[0] - ref.q),
    );
    diagnostics.maxPError = Math.max(
      diagnostics.maxPError,
      Math.abs(m[1] - ref.p),
    );
    diagnostics.maxNumberError = Math.max(
      diagnostics.maxNumberError,
      Math.abs(m[4] - ref.number),
    );
    diagnostics.maxWorkBalanceError = Math.max(
      diagnostics.maxWorkBalanceError,
      Math.abs(energy - v[11] - work),
    );
  }
  for (const [key, value] of Object.entries(diagnostics))
    if (!near(r.analysis[key as keyof typeof diagnostics], value))
      throw new Error("Invalid driven oscillator diagnostics");
  return v;
}
