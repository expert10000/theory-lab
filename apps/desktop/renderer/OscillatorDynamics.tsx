import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  EvolutionProgress,
  OscillatorEvolutionResult,
  DrivenOscillatorResult,
  QuantumBridge,
  WorkerStatus,
} from "../../../packages/contracts";
import {
  OSCILLATOR_DYNAMICS_DEFAULTS,
  oscillatorEvolutionJob,
  oscillatorDensity,
  checkOscillatorEvolutionData,
  compareOscillatorMotion,
  type OscillatorDynamicsDraft,
} from "../../../packages/models/oscillator-dynamics";
import { oscillatorAmplitude } from "../../../packages/models/oscillator";

type Computed = { result: OscillatorEvolutionResult; data: Float64Array };
export type OscillatorComputed = {
  result: OscillatorEvolutionResult | DrivenOscillatorResult;
  data: Float64Array;
};
export function MotionFigures({
  computed,
  reference,
  selected,
}: {
  computed: OscillatorComputed;
  reference: OscillatorComputed | null;
  selected: number;
}) {
  const { result: r, data } = computed,
    stride = r.data.columns.length,
    o = selected * stride;
  const field = useMemo(
    () => oscillatorDensity(r, data, selected),
    [r, data, selected],
  );
  const other = useMemo(
    () =>
      reference
        ? oscillatorDensity(reference.result, reference.data, selected)
        : null,
    [reference, selected],
  );
  const p = r.model.parameters,
    i = r.initialState,
    t = data[o],
    qe = data[o + 8];
  const exact = field.q.map((q) =>
    i.type === "fock"
      ? oscillatorAmplitude(i.index, q - qe) ** 2
      : Math.exp(-((q - qe) ** 2)) / Math.sqrt(Math.PI),
  );
  const line = (values: number[]) =>
    values
      .map(
        (v, k) =>
          `${k ? "L" : "M"}${50 + (680 * k) / (values.length - 1)},${200 - 160 * v}`,
      )
      .join(" ");
  const quadratureRange = r.operation === "oscillator_drive" ? 6 : 3;
  const trajectory = (col: number) =>
    Array.from(
      { length: r.data.rows },
      (_, k) =>
        `${k ? "L" : "M"}${50 + (680 * k) / (r.data.rows - 1)},${130 - (90 / quadratureRange) * data[k * stride + col]}`,
    ).join(" ");
  return (
    <>
      <div className="sweep-visual">
        <p className="eyebrow">DENSITY AT SELECTED SAMPLE / DIMENSIONLESS q</p>
        <svg
          viewBox="0 0 800 245"
          role="img"
          aria-label="Moving oscillator density"
        >
          <path d="M50 40 V200 H730" stroke="#506575" fill="none" />
          <path
            d={line(exact)}
            stroke="#8597ae"
            strokeDasharray="5 5"
            fill="none"
          />
          {other && (
            <path
              d={line(other.density)}
              stroke="#edae8f"
              strokeWidth="3"
              fill="none"
            />
          )}
          <path
            d={line(field.density)}
            stroke="#79d9c1"
            strokeWidth="2"
            fill="none"
          />
          {[0, 0.5, 1].map((v) => (
            <text key={v} x="20" y={204 - 160 * v} fill="#acc1ca" fontSize="12">
              {v}
            </text>
          ))}
          {[-p.extent, 0, p.extent].map((q, k) => (
            <text
              key={q}
              x={50 + 340 * k}
              y="230"
              fill="#acc1ca"
              textAnchor="middle"
              fontSize="12"
            >
              {q}
            </text>
          ))}
          <text x="750" y="230" fill="#acc1ca" fontSize="12">
            q
          </text>
        </svg>
        <p>
          Mint: {r.engine.name} · peach: Native comparison (when present) ·
          dashed: full analytic state. No finite-box renormalization.
          Reconstructed probability:{" "}
          <span data-testid="motion-box-probability">
            {field.probability.toFixed(8)}
          </span>
          .
        </p>
      </div>
      <div className="sweep-visual">
        <p className="eyebrow">QUADRATURE TRAJECTORIES / ELAPSED TIME t−t₀</p>
        <svg
          viewBox="0 0 800 260"
          role="img"
          aria-label="Oscillator quadrature trajectories"
        >
          <path
            d="M50 35 V225 H730 M50 130 H730"
            stroke="#506575"
            fill="none"
          />
          <path
            d={trajectory(8)}
            stroke="#8597ae"
            strokeDasharray="5 5"
            fill="none"
          />
          <path
            d={trajectory(9)}
            stroke="#8597ae"
            strokeDasharray="5 5"
            fill="none"
          />
          <path
            d={trajectory(1)}
            stroke="#79d9c1"
            fill="none"
            strokeWidth="2"
          />
          <path
            d={trajectory(2)}
            stroke="#edae8f"
            fill="none"
            strokeWidth="2"
          />
          <line
            x1={50 + (680 * selected) / (r.data.rows - 1)}
            x2={50 + (680 * selected) / (r.data.rows - 1)}
            y1="35"
            y2="225"
            stroke="#eef7f5"
            strokeDasharray="2 3"
          />
          {[-quadratureRange, 0, quadratureRange].map((v) => (
            <text
              key={v}
              x="20"
              y={134 - (90 / quadratureRange) * v}
              fill="#acc1ca"
              fontSize="12"
            >
              {v}
            </text>
          ))}
          <text x="50" y="250" fill="#acc1ca" fontSize="12">
            0
          </text>
          <text x="730" y="250" fill="#acc1ca" textAnchor="end" fontSize="12">
            {(r.solver.tStop - r.solver.tStart).toFixed(4)}
          </text>
        </svg>
        <p>
          Mint ⟨q⟩ · peach ⟨p⟩ · dashed full-state reference. Sample t=
          {t.toFixed(4)}, elapsed {(t - r.solver.tStart).toFixed(4)}. Points are
          computed samples, not interpolated states.
        </p>
      </div>
      <div className="cavity-readouts">
        <span>
          ⟨q⟩ <strong data-testid="motion-q">{data[o + 1].toFixed(6)}</strong>
        </span>
        <span>
          ⟨p⟩ <strong data-testid="motion-p">{data[o + 2].toFixed(6)}</strong>
        </span>
        <span>
          Var(q) <strong>{data[o + 3].toFixed(6)}</strong>
        </span>
        <span>
          Var(p) <strong>{data[o + 4].toFixed(6)}</strong>
        </span>
        <span>
          ⟨N⟩ <strong>{data[o + 5].toFixed(6)}</strong>
        </span>
        <span>
          Norm <strong>{data[o + 7].toFixed(9)}</strong>
        </span>
      </div>
    </>
  );
}

export function OscillatorDynamics({
  bridge,
  status,
  restored,
  restoreEpoch,
  onSnapshot,
}: {
  bridge: QuantumBridge;
  status: WorkerStatus;
  restored?: OscillatorDynamicsDraft;
  restoreEpoch?: number;
  onSnapshot?: (draft: OscillatorDynamicsDraft) => void;
}) {
  const [draft, setDraft] = useState<OscillatorDynamicsDraft>(
      OSCILLATOR_DYNAMICS_DEFAULTS,
    ),
    [computed, setComputed] = useState<Computed | null>(null),
    [reference, setReference] = useState<Computed | null>(null);
  const [mode, setMode] = useState<OscillatorDynamicsDraft["engine"] | null>(
      null,
    ),
    [selected, setSelected] = useState(0),
    [running, setRunning] = useState(false),
    [error, setError] = useState(""),
    [outcome, setOutcome] = useState("READY TO RUN"),
    [progress, setProgress] = useState<EvolutionProgress | null>(null);
  const active = useRef<string | null>(null),
    generation = useRef(0),
    cancelled = useRef(false);
  useEffect(
    () =>
      bridge.onProgress((p) => {
        if (p.jobId === active.current) setProgress(p);
      }),
    [bridge],
  );
  useEffect(
    () => () => {
      generation.current++;
      cancelled.current = true;
      if (active.current) void bridge.cancel(active.current).catch(() => {});
    },
    [bridge],
  );
  useEffect(() => {
    if (!restoreEpoch) return;
    generation.current++;
    cancelled.current = true;
    if (active.current) void bridge.cancel(active.current).catch(() => {});
    setDraft(restored ?? OSCILLATOR_DYNAMICS_DEFAULTS);
    setComputed(null);
    setReference(null);
    setSelected(0);
    setError("");
    setOutcome("WORKSPACE RESTORED");
  }, [restoreEpoch]);
  useEffect(() => onSnapshot?.(draft), [draft, onSnapshot]);
  let preview: ReturnType<typeof oscillatorEvolutionJob> | null = null;
  try {
    preview = oscillatorEvolutionJob(
      "preview",
      draft,
      draft.engine === "compare" ? "qutip" : draft.engine,
    );
  } catch {
    /* input bounds shown below */
  }
  const c = status.capabilities,
    ready =
      status.state === "READY" &&
      !!c?.operations.includes("oscillator_evolve") &&
      (draft.engine === "compare"
        ? c.engines.qutip.available && c.engines.native.available
        : !!c.engines[draft.engine].available);
  const stale =
    computed &&
    (!preview ||
      mode !== draft.engine ||
      JSON.stringify([
        computed.result.model,
        computed.result.initialState,
        computed.result.solver,
      ]) !==
        JSON.stringify([preview.model, preview.initialState, preview.solver]));
  const comparison = useMemo(
    () =>
      computed && reference
        ? compareOscillatorMotion(
            computed.result,
            computed.data,
            reference.result,
            reference.data,
          )
        : null,
    [computed, reference],
  );
  async function run() {
    if (!preview || !ready || running) return;
    const epoch = ++generation.current;
    cancelled.current = false;
    setRunning(true);
    setError("");
    setOutcome("RUNNING");
    setProgress(null);
    try {
      async function solve(engine: "qutip" | "native") {
        const job = oscillatorEvolutionJob(
          `job-${crypto.randomUUID()}`,
          draft,
          engine,
        );
        active.current = job.jobId;
        const result = await bridge.oscillatorEvolve(job),
          bytes = await bridge.readData(job.jobId);
        return { result, data: checkOscillatorEvolutionData(result, bytes) };
      }
      const first = await solve(
        draft.engine === "compare" ? "qutip" : draft.engine,
      );
      if (generation.current !== epoch) return;
      if (cancelled.current) throw new Error("Evolution cancelled");
      const second = draft.engine === "compare" ? await solve("native") : null;
      if (generation.current !== epoch) return;
      if (cancelled.current) throw new Error("Evolution cancelled");
      setComputed(first);
      setReference(second);
      setMode(draft.engine);
      setSelected(0);
      setOutcome("COMPLETE");
    } catch (e) {
      if (generation.current === epoch) {
        const message = e instanceof Error ? e.message : String(e);
        setOutcome(
          message.toLowerCase().includes("cancelled") ? "CANCELLED" : "FAILED",
        );
        if (!message.toLowerCase().includes("cancelled")) setError(message);
      }
    } finally {
      active.current = null;
      setRunning(false);
    }
  }
  async function cancel() {
    cancelled.current = true;
    setOutcome("CANCELLING");
    try {
      if (active.current) await bridge.cancel(active.current);
    } catch (e) {
      setError(String(e));
    }
  }
  const fields = [
    ["omega", "Frequency ω", 0.01, 20, 0.01],
    ["cutoff", "Fock cutoff", 8, 64, 1],
    ["extent", "q half-extent", 2, 12, 0.1],
    ["points", "Plot points (odd)", 101, 401, 2],
    ["start", "Start time", -100, 100, 0.1],
    ["stop", "End time", -100, 100, 0.1],
    ["samples", "Time samples", 3, 1001, 1],
  ] as const;
  return (
    <div data-testid="oscillator-motion">
      <section className="panel dynamics-settings">
        <div>
          <p className="eyebrow">FREE HARMONIC MOTION / D1-005–006</p>
          <h2>A coherent packet moves; a number-state density stays still.</h2>
          <p>
            H=ω(N+½), ℏ=1. Coherent input is an explicitly normalized
            finite-Fock projection; omitted Poisson probability is reported.
            QuTiP integrates with output normalization off; Native uses exact
            spectral phases.
          </p>
        </div>
        <div className="dynamics-fields">
          {fields.map(([key, label, min, max, step]) => (
            <label key={key}>
              {label}
              <input
                aria-label={`Motion ${key}`}
                type="number"
                min={min}
                max={max}
                step={step}
                value={draft[key]}
                disabled={running}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [key]: e.target.value }))
                }
              />
            </label>
          ))}
          <label>
            Initial state
            <select
              aria-label="Motion initial state"
              value={draft.initial}
              disabled={running}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  initial: e.target.value as OscillatorDynamicsDraft["initial"],
                }))
              }
            >
              <option value="coherent">Coherent · projected |α⟩</option>
              <option value="fock">Fock · |n⟩</option>
            </select>
          </label>
          {draft.initial === "fock" ? (
            <label>
              Number state n
              <input
                aria-label="Motion index"
                type="number"
                min="0"
                max="10"
                step="1"
                value={draft.index}
                disabled={running}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, index: e.target.value }))
                }
              />
            </label>
          ) : (
            <>
              {(["alphaRe", "alphaIm"] as const).map((key) => (
                <label key={key}>
                  {key === "alphaRe" ? "Re α" : "Im α"}
                  <input
                    aria-label={`Motion ${key}`}
                    type="number"
                    min="-2"
                    max="2"
                    step=".1"
                    value={draft[key]}
                    disabled={running}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </>
          )}
          <label>
            Engine
            <select
              aria-label="Motion engine"
              value={draft.engine}
              disabled={running}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  engine: e.target.value as OscillatorDynamicsDraft["engine"],
                }))
              }
            >
              <option value="native" disabled={!c?.engines.native.available}>
                Native · spectral phases
              </option>
              <option value="qutip" disabled={!c?.engines.qutip.available}>
                QuTiP · SESolver
              </option>
              <option
                value="compare"
                disabled={
                  !c?.engines.qutip.available || !c?.engines.native.available
                }
              >
                Compare QuTiP / Native
              </option>
            </select>
          </label>
        </div>
        <div className="dynamics-actions">
          <button
            className="run-button"
            data-testid="run-oscillator-motion"
            disabled={!preview || !ready || running}
            onClick={() => void run()}
          >
            ▶ Run oscillator dynamics
          </button>
          {running && (
            <button
              className="cancel-button"
              data-testid="cancel-oscillator-motion"
              onClick={() => void cancel()}
            >
              Cancel dynamics
            </button>
          )}
          <span data-testid="oscillator-motion-state">{outcome}</span>
        </div>
        {!preview && (
          <p className="validation">
            Check ω .01–20, cutoff 8–64, |α|≤2 or n 0–10 below cutoff−1, times
            ±100 with 0&lt;ω duration≤100, samples 3–1001, extent 2–12 and odd
            plot points 101–401.
          </p>
        )}
        {status.state === "READY" && !ready && (
          <p className="validation">
            Selected engine unavailable. Choose an installed engine and restart
            the worker.
          </p>
        )}
        {running && (
          <div className="progress-wrap">
            <progress max="1" value={progress?.fraction ?? 0} />
            <span data-testid="motion-progress">
              {progress
                ? `${progress.completed} / ${progress.total}`
                : "Starting…"}
            </span>
          </div>
        )}
      </section>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {computed && (
        <section
          className="panel cavity-result"
          data-testid="oscillator-motion-result"
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                VERIFIED FOCK AMPLITUDES /{" "}
                {computed.result.engine.name.toUpperCase()}
              </p>
              <h2>Free evolution</h2>
            </div>
            <span
              className={`result-badge ${stale ? "stale" : ""}`}
              data-testid="motion-result-state"
            >
              {stale
                ? "OUT OF DATE"
                : running
                  ? "LAST VERIFIED RESULT"
                  : `${computed.result.data.rows} SAMPLES`}
            </span>
          </div>
          <div className="cavity-metrics">
            <div>
              <span>OMITTED COHERENT PROBABILITY</span>
              <strong data-testid="motion-omitted">
                {computed.result.analysis.omittedProbability.toExponential(3)}
              </strong>
            </div>
            <div>
              <span>MAX NORM DRIFT (UNRECTIFIED)</span>
              <strong data-testid="motion-norm">
                {computed.result.analysis.maxNormDrift.toExponential(3)}
              </strong>
            </div>
            <div>
              <span>MAX BOUNDARY OCCUPATION</span>
              <strong>
                {computed.result.analysis.maxBoundaryOccupation.toExponential(
                  3,
                )}
              </strong>
            </div>
            <div>
              <span>MAX FULL-STATE q/p ERROR</span>
              <strong>
                {Math.max(
                  computed.result.analysis.maxQError,
                  computed.result.analysis.maxPError,
                ).toExponential(3)}
              </strong>
            </div>
          </div>
          {computed.result.analysis.omittedProbability > 1e-5 && (
            <p className="validation" data-testid="motion-truncation-warning">
              Significant initial projection loss. Increase cutoff and rerun;
              the full coherent reference is not the same as the finite
              projected state.
            </p>
          )}
          <div className="dynamics-timeline">
            <div className="timeline-heading">
              <span className="eyebrow">SYNCHRONIZED COMPUTED SAMPLE</span>
              <strong>
                {selected + 1} / {computed.result.data.rows}
              </strong>
            </div>
            <input
              aria-label="Oscillator motion time cursor"
              type="range"
              min="0"
              max={computed.result.data.rows - 1}
              value={selected}
              onChange={(e) => setSelected(Number(e.target.value))}
            />
          </div>
          <MotionFigures
            computed={computed}
            reference={reference}
            selected={selected}
          />
          {comparison && (
            <div
              className="comparison-report"
              data-testid="oscillator-motion-compare"
            >
              <h3>QuTiP versus Native</h3>
              <p>
                Max |Δ⟨q⟩|{" "}
                <span data-testid="motion-compare-q">
                  {comparison.q.toExponential(3)}
                </span>{" "}
                · max |Δ⟨p⟩| {comparison.p.toExponential(3)} · max
                phase-independent infidelity{" "}
                {comparison.infidelity.toExponential(3)}. Evolution engines are
                independent; Hermite reconstruction is shared.
              </p>
            </div>
          )}
          <p>
            Energy drift:{" "}
            {computed.result.analysis.maxEnergyDrift.toExponential(3)}.
            Projection retention:{" "}
            {computed.result.analysis.projectionProbability.toFixed(9)}. Solver
            norm and cutoff diagnostics do not establish spatial-grid
            convergence. Variances use the finite-basis q/p operators; at
            non-negligible boundary occupation they differ from continuum
            Hermite-space variances.
          </p>
          <div className="plot-caption">
            <span>
              {computed.result.engine.name} {computed.result.engine.version} ·
              Python {computed.result.provenance.pythonVersion} ·{" "}
              {computed.result.provenance.durationMs.toFixed(1)} ms
            </span>
            <span>f64le · SHA-256 verified · dimensionless q,p</span>
          </div>
        </section>
      )}
    </div>
  );
}
