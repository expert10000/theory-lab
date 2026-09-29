import type {
  EngineName,
  OscillatorInitialState,
  PulsedOscillatorJob,
  PulsedOscillatorModel,
  PulsedOscillatorResult,
} from "../contracts";
import {
  DRIVEN_OSCILLATOR_DEFAULTS,
  drivenOscillatorColumns,
  checkForcedOscillatorData,
  type DrivenOscillatorDraft,
} from "./oscillator-drive";
import {
  oscillatorEvolutionJob,
  initialOscillatorCoefficients,
} from "./oscillator-dynamics";

export type PulsedOscillatorDraft = DrivenOscillatorDraft & {
  pulseWidth: string;
  pulseCenter: string;
  maxStep: string;
};
export const PULSED_OSCILLATOR_DEFAULTS: PulsedOscillatorDraft = {
  ...DRIVEN_OSCILLATOR_DEFAULTS,
  stop: "10",
  pulseCenter: "5",
  pulseWidth: "1",
  maxStep: "0.02",
};
type Parameters = PulsedOscillatorModel["parameters"];
export function pulsedOscillatorJob(
  jobId: string,
  d: PulsedOscillatorDraft,
  engine: EngineName,
): PulsedOscillatorJob {
  const free = oscillatorEvolutionJob(jobId, d, engine),
    p = {
      ...free.model.parameters,
      epsilonRe: Number(d.epsilonRe),
      epsilonIm: Number(d.epsilonIm),
      driveFrequency: Number(d.driveFrequency),
      envelope: "gaussian" as const,
      pulseWidth: Number(d.pulseWidth),
      pulseCenter: Number(d.pulseCenter),
    },
    s = { ...free.solver, maxStep: Number(d.maxStep) };
  const dt = s.tStop - s.tStart,
    alpha =
      free.initialState.type === "coherent"
        ? Math.hypot(free.initialState.alphaRe, free.initialState.alphaIm)
        : 0;
  if (
    ![
      d.epsilonRe,
      d.epsilonIm,
      d.driveFrequency,
      d.pulseWidth,
      d.pulseCenter,
      d.maxStep,
    ].every((v) => v.trim() && Number.isFinite(Number(v))) ||
    p.omega < 0.1 ||
    p.omega > 5 ||
    p.driveFrequency < 0 ||
    p.driveFrequency > 5 ||
    Math.hypot(p.epsilonRe, p.epsilonIm) > 0.5 ||
    dt > 20 ||
    p.omega * dt > 50 ||
    p.pulseWidth < 0.05 ||
    p.pulseWidth > 5 ||
    p.pulseCenter < 0 ||
    p.pulseCenter > dt ||
    s.maxStep < 0.001 ||
    s.maxStep > 0.05 ||
    s.maxStep > p.pulseWidth / 8 ||
    dt / s.maxStep > 20000 ||
    alpha +
      Math.hypot(p.epsilonRe, p.epsilonIm) *
        Math.min(dt, Math.sqrt(2 * Math.PI) * p.pulseWidth) >
      4
  )
    throw new Error(
      "Gaussian pulse: width .05–5, center within duration, maxStep .001–.05 and <=width/8, <=20000 intervals; bounded amplitude/displacement",
    );
  return {
    ...free,
    operation: "oscillator_pulse",
    model: { type: "driven_harmonic_oscillator", parameters: p },
    solver: s,
  };
}
export function pulseEnvelope(p: Parameters, tau: number) {
  const g = Math.exp(-0.5 * ((tau - p.pulseCenter) / p.pulseWidth) ** 2),
    angle = p.driveFrequency * tau,
    re = g * (p.epsilonRe * Math.cos(angle) + p.epsilonIm * Math.sin(angle)),
    im = g * (p.epsilonIm * Math.cos(angle) - p.epsilonRe * Math.sin(angle)),
    slope = -(tau - p.pulseCenter) / p.pulseWidth ** 2;
  return {
    re,
    im,
    amplitude: g,
    derivativeRe: slope * re + p.driveFrequency * im,
    derivativeIm: slope * im - p.driveFrequency * re,
  };
}
/** Independent composite Simpson quadrature, advanced on a bounded internal grid.
 * Plot samples do not determine quadrature resolution. */
function referenceAt(p: Parameters, i: OscillatorInitialState) {
  let previous = 0,
    ir = 0,
    ii = 0;
  const integrand = (t: number) => {
    const e = pulseEnvelope(p, t),
      c = Math.cos(p.omega * t),
      s = Math.sin(p.omega * t);
    return [e.re * c - e.im * s, e.re * s + e.im * c];
  };
  return (tau: number) => {
    const count = Math.max(
        1,
        Math.ceil((tau - previous) / Math.min(0.01, p.pulseWidth / 32)),
      ),
      h = (tau - previous) / count;
    for (let k = 0; k < count; k++) {
      const t = previous + k * h,
        a = integrand(t),
        b = integrand(t + h / 2),
        c = integrand(t + h);
      ir += (h * (a[0] + 4 * b[0] + c[0])) / 6;
      ii += (h * (a[1] + 4 * b[1] + c[1])) / 6;
    }
    previous = tau;
    const ar = (i.type === "coherent" ? i.alphaRe : 0) + ii,
      ai = (i.type === "coherent" ? i.alphaIm : 0) - ir,
      c = Math.cos(p.omega * tau),
      s = Math.sin(p.omega * tau),
      re = ar * c + ai * s,
      im = ai * c - ar * s;
    return {
      q: Math.SQRT2 * re,
      p: Math.SQRT2 * im,
      number: (i.type === "fock" ? i.index : 0) + re * re + im * im,
    };
  };
}
export function pulsedReference(
  p: Parameters,
  i: OscillatorInitialState,
  tau: number,
) {
  return referenceAt(p, i)(tau);
}
/** RK4 in the free interaction picture: independent of QuTiP and native DOP853.
 * Raw coefficients retain phase and norm; no solver-output correction. */
function finitePulseAt(
  p: Parameters,
  i: OscillatorInitialState,
  maxStep: number,
) {
  const n = p.cutoff,
    initial = initialOscillatorCoefficients(n, i),
    y = new Float64Array(2 * n),
    roots = Float64Array.from({ length: n + 1 }, (_, k) => Math.sqrt(k));
  for (let k = 0; k < n; k++) {
    y[2 * k] = initial.re[k];
    y[2 * k + 1] = initial.im[k];
  }
  const ks = Array.from({ length: 4 }, () => new Float64Array(2 * n)),
    tmp = new Float64Array(2 * n);
  const rhs = (t: number, v: Float64Array, out: Float64Array) => {
    const g = pulseEnvelope(p, t).amplitude,
      angle = (p.omega - p.driveFrequency) * t,
      er = g * (p.epsilonRe * Math.cos(angle) - p.epsilonIm * Math.sin(angle)),
      ei = g * (p.epsilonRe * Math.sin(angle) + p.epsilonIm * Math.cos(angle));
    for (let k = 0; k < n; k++) {
      let hr = 0,
        hi = 0;
      if (k > 0) {
        hr += roots[k] * (er * v[2 * k - 2] - ei * v[2 * k - 1]);
        hi += roots[k] * (er * v[2 * k - 1] + ei * v[2 * k - 2]);
      }
      if (k + 1 < n) {
        hr += roots[k + 1] * (er * v[2 * k + 2] + ei * v[2 * k + 3]);
        hi += roots[k + 1] * (er * v[2 * k + 3] - ei * v[2 * k + 2]);
      }
      out[2 * k] = hi;
      out[2 * k + 1] = -hr;
    }
  };
  let previous = 0;
  return (tau: number) => {
    const count = Math.max(
        1,
        Math.ceil(
          (tau - previous) / Math.min(0.005, p.pulseWidth / 32, maxStep / 2),
        ),
      ),
      h = (tau - previous) / count;
    for (let step = 0; step < count; step++) {
      const t = previous + step * h;
      rhs(t, y, ks[0]);
      for (let a = 0; a < 2 * n; a++) tmp[a] = y[a] + (h * ks[0][a]) / 2;
      rhs(t + h / 2, tmp, ks[1]);
      for (let a = 0; a < 2 * n; a++) tmp[a] = y[a] + (h * ks[1][a]) / 2;
      rhs(t + h / 2, tmp, ks[2]);
      for (let a = 0; a < 2 * n; a++) tmp[a] = y[a] + h * ks[2][a];
      rhs(t + h, tmp, ks[3]);
      for (let a = 0; a < 2 * n; a++)
        y[a] += (h * (ks[0][a] + 2 * ks[1][a] + 2 * ks[2][a] + ks[3][a])) / 6;
    }
    previous = tau;
    return Array.from({ length: n }, (_, k) => {
      const a = p.omega * (k + 0.5) * tau,
        c = Math.cos(a),
        s = Math.sin(a);
      return [y[2 * k] * c + y[2 * k + 1] * s, y[2 * k + 1] * c - y[2 * k] * s];
    });
  };
}
export function consistentPulsedOscillatorResult(
  j: PulsedOscillatorJob,
  r: PulsedOscillatorResult,
) {
  const n = j.model.parameters.cutoff,
    initial = initialOscillatorCoefficients(n, j.initialState),
    p = j.model.parameters;
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
    Math.abs(r.analysis.energyOffset - p.omega / 2) < 1e-12 &&
    Math.abs(r.analysis.projectionProbability - initial.probability) < 1e-12 &&
    Math.abs(r.analysis.omittedProbability - initial.omitted) < 1e-12 &&
    Math.abs(r.analysis.startEnvelope - pulseEnvelope(p, 0).amplitude) <
      1e-12 &&
    Math.abs(
      r.analysis.endEnvelope -
        pulseEnvelope(p, j.solver.tStop - j.solver.tStart).amplitude,
    ) < 1e-12
  );
}
export function checkPulsedOscillatorData(
  r: PulsedOscillatorResult,
  bytes: Uint8Array,
) {
  const j: PulsedOscillatorJob = {
    schema: "quantum-job/v1",
    jobId: r.jobId,
    operation: "oscillator_pulse",
    model: r.model,
    initialState: r.initialState,
    solver: r.solver,
    engine: r.engine.name,
  };
  return checkForcedOscillatorData(r, bytes, {
    consistent: consistentPulsedOscillatorResult(j, r),
    at: finitePulseAt(r.model.parameters, r.initialState, r.solver.maxStep),
    reference: referenceAt(r.model.parameters, r.initialState),
    envelope: (t) => pulseEnvelope(r.model.parameters, t),
  });
}
/** Compare the same pulse at identical observation times, allowing only cutoff/maxStep changes. */
export function comparePulseConvergence(
  a: PulsedOscillatorResult,
  av: Float64Array,
  b: PulsedOscillatorResult,
  bv: Float64Array,
) {
  const { cutoff: an, ...ap } = a.model.parameters,
    { cutoff: bn, ...bp } = b.model.parameters,
    { maxStep: as, ...at } = a.solver,
    { maxStep: bs, ...bt } = b.solver;
  if (
    JSON.stringify(ap) !== JSON.stringify(bp) ||
    JSON.stringify(at) !== JSON.stringify(bt) ||
    JSON.stringify(a.initialState) !== JSON.stringify(b.initialState) ||
    a.engine.name !== b.engine.name ||
    av.length * 8 !== a.data.bytes ||
    bv.length * 8 !== b.data.bytes
  )
    throw new Error(
      "Convergence requires the same pulse, engine, initial definition and observation times",
    );
  const out = {
    q: 0,
    p: 0,
    number: 0,
    infidelity: 0,
    initialProjectionDifference: Math.abs(
      a.analysis.projectionProbability - b.analysis.projectionProbability,
    ),
  };
  for (let row = 0; row < a.data.rows; row++) {
    const x = row * a.data.columns.length,
      y = row * b.data.columns.length;
    if (Math.abs(av[x] - bv[y]) > 1e-12)
      throw new Error("Convergence observation times differ");
    out.q = Math.max(out.q, Math.abs(av[x + 1] - bv[y + 1]));
    out.p = Math.max(out.p, Math.abs(av[x + 2] - bv[y + 2]));
    out.number = Math.max(out.number, Math.abs(av[x + 5] - bv[y + 5]));
    let re = 0,
      im = 0;
    for (let k = 0; k < Math.min(an, bn); k++) {
      const ar = av[x + 13 + 2 * k],
        ai = av[x + 14 + 2 * k],
        br = bv[y + 13 + 2 * k],
        bi = bv[y + 14 + 2 * k];
      re += ar * br + ai * bi;
      im += ar * bi - ai * br;
    }
    out.infidelity = Math.max(
      out.infidelity,
      Math.max(0, 1 - (re * re + im * im) / (av[x + 7] * bv[y + 7])),
    );
  }
  return out;
}
