import React, { useEffect, useRef, useState } from "react";
import type {
  QuantumBridge,
  WorkerStatus,
  DrivenOscillatorResult,
  EvolutionProgress,
} from "../../../packages/contracts";
import {
  DRIVEN_OSCILLATOR_DEFAULTS,
  drivenOscillatorJob,
  checkDrivenOscillatorData,
  type DrivenOscillatorDraft,
} from "../../../packages/models/oscillator-drive";
import { compareOscillatorMotion } from "../../../packages/models/oscillator-dynamics";
import { MotionFigures } from "./OscillatorDynamics";

type Computed = { result: DrivenOscillatorResult; data: Float64Array };
export function DrivenOscillator({
  bridge,
  status,
  restored,
  restoreEpoch,
  onSnapshot,
  atlasDraft,
  atlasEpoch,
}: {
  bridge: QuantumBridge;
  status: WorkerStatus;
  restored?: DrivenOscillatorDraft;
  restoreEpoch?: number;
  onSnapshot?: (draft: DrivenOscillatorDraft) => void;
  atlasDraft?: DrivenOscillatorDraft;
  atlasEpoch?: number;
}) {
  const [draft, setDraft] = useState(DRIVEN_OSCILLATOR_DEFAULTS),
    [computed, setComputed] = useState<Computed | null>(null),
    [reference, setReference] = useState<Computed | null>(null);
  const [mode, setMode] = useState<DrivenOscillatorDraft["engine"] | null>(
      null,
    ),
    [selected, setSelected] = useState(0),
    [running, setRunning] = useState(false),
    [error, setError] = useState(""),
    [outcome, setOutcome] = useState("READY TO CALCULATE"),
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
  function reset(value: DrivenOscillatorDraft, message: string) {
    generation.current++;
    cancelled.current = true;
    if (active.current) void bridge.cancel(active.current).catch(() => {});
    setDraft(value);
    setComputed(null);
    setReference(null);
    setSelected(0);
    setError("");
    setOutcome(message);
  }
  useEffect(() => {
    if (restoreEpoch)
      reset(restored ?? DRIVEN_OSCILLATOR_DEFAULTS, "WORKSPACE RESTORED");
  }, [restoreEpoch]);
  useEffect(() => {
    if (atlasEpoch && atlasDraft) reset(atlasDraft, "ATLAS PRESET LOADED");
  }, [atlasEpoch]);
  useEffect(() => onSnapshot?.(draft), [draft, onSnapshot]);
  let preview: ReturnType<typeof drivenOscillatorJob> | null = null;
  try {
    preview = drivenOscillatorJob(
      "preview",
      draft,
      draft.engine === "compare" ? "qutip" : draft.engine,
    );
  } catch {
    /* bounded validation displayed below */
  }
  const c = status.capabilities,
    ready =
      status.state === "READY" &&
      !!c?.operations.includes("oscillator_drive") &&
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
  const comparison =
    computed && reference
      ? compareOscillatorMotion(
          computed.result,
          computed.data,
          reference.result,
          reference.data,
        )
      : null;
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
        const j = drivenOscillatorJob(
          `job-${crypto.randomUUID()}`,
          draft,
          engine,
        );
        active.current = j.jobId;
        const result = await bridge.oscillatorDrive(j),
          bytes = await bridge.readData(j.jobId);
        return { result, data: checkDrivenOscillatorData(result, bytes) };
      }
      const first = await solve(
        draft.engine === "compare" ? "qutip" : draft.engine,
      );
      if (generation.current !== epoch) return;
      if (cancelled.current) throw new Error("Driven evolution cancelled");
      const second = draft.engine === "compare" ? await solve("native") : null;
      if (generation.current !== epoch) return;
      if (cancelled.current) throw new Error("Driven evolution cancelled");
      setComputed(first);
      setReference(second);
      setMode(draft.engine);
      setSelected(0);
      setOutcome("COMPLETE");
    } catch (e) {
      if (generation.current === epoch) {
        const message = e instanceof Error ? e.message : String(e);
        setOutcome(/cancelled/i.test(message) ? "CANCELLED" : "FAILED");
        if (!/cancelled/i.test(message)) setError(message);
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
    ["omega", "Mode frequency ω", 0.1, 5, 0.01],
    ["epsilonRe", "Re ε₀", -0.5, 0.5, 0.01],
    ["epsilonIm", "Im ε₀", -0.5, 0.5, 0.01],
    ["driveFrequency", "Drive frequency ν", 0, 5, 0.01],
    ["cutoff", "Fock cutoff", 8, 64, 1],
    ["extent", "q half-extent", 2, 12, 0.1],
    ["points", "Plot points (odd)", 101, 401, 2],
    ["start", "Start time", -100, 100, 0.1],
    ["stop", "End time", -100, 100, 0.1],
    ["samples", "Time samples", 3, 1001, 1],
  ] as const;
  const row = computed ? Math.min(selected, computed.result.data.rows - 1) : 0,
    o = computed ? row * computed.result.data.columns.length : 0;
  return (
    <div data-testid="driven-oscillator">
      <section className="panel dynamics-settings">
        <div>
          <p className="eyebrow">MONOCHROMATIC COHERENT FORCING / D1-008–009</p>
          <h2>A linear drive displaces the oscillator.</h2>
          <p>
            H=ω(N+½)+ε(t)a†+ε*(t)a, ε(t)=ε₀ exp[−iν(t−t₀)], ℏ=1. Lab energy adds
            ω/2 to Atlas; the global phase is retained. This mode does not
            accept arbitrary envelopes, damping or parametric drives.
          </p>
          <p>
            Initial coherent input is an explicitly normalized finite-Fock
            projection; solver and box density are never renormalized. Native
            uses a finite rotating-frame eigensystem; QuTiP independently
            integrates the lab-frame Hamiltonian.
          </p>
        </div>
        <div className="dynamics-fields">
          {fields.map(([key, label, min, max, step]) => (
            <label key={key}>
              {label}
              <input
                aria-label={`Drive ${key}`}
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
              aria-label="Drive initial state"
              value={draft.initial}
              disabled={running}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  initial: e.target.value as DrivenOscillatorDraft["initial"],
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
                aria-label="Drive index"
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
            (["alphaRe", "alphaIm"] as const).map((key) => (
              <label key={key}>
                {key === "alphaRe" ? "Re α" : "Im α"}
                <input
                  aria-label={`Drive ${key}`}
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
            ))
          )}
          <label>
            Engine
            <select
              aria-label="Drive engine"
              value={draft.engine}
              disabled={running}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  engine: e.target.value as DrivenOscillatorDraft["engine"],
                }))
              }
            >
              <option value="compare">Compare QuTiP / Native</option>
              <option value="qutip">QuTiP</option>
              <option value="native">Native NumPy / SciPy</option>
            </select>
          </label>
        </div>
        <div className="run-bar">
          <button
            className="primary-button"
            data-testid="run-oscillator-drive"
            disabled={!preview || !ready || running}
            onClick={() => void run()}
          >
            ▶ Run driven oscillator
          </button>
          {running && (
            <button
              data-testid="cancel-oscillator-drive"
              onClick={() => void cancel()}
            >
              Cancel
            </button>
          )}
          <span data-testid="oscillator-drive-state">{outcome}</span>
        </div>
        {!preview && (
          <p className="validation">
            Check ω .1–5, cutoff 8–64, |ε₀|≤.5, ν 0–5, |α|≤2 or n 0–10 below
            cutoff−1; duration≤20, ω duration≤50, |α|+|ε₀| duration≤4; 3–1001
            samples, extent 2–12 and odd points 101–401.
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
            <span data-testid="drive-progress">
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
          data-testid="oscillator-drive-result"
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                VERIFIED FOCK AMPLITUDES /{" "}
                {computed.result.engine.name.toUpperCase()}
              </p>
              <h2>Driven evolution</h2>
            </div>
            <span
              className={`result-badge ${stale ? "stale" : ""}`}
              data-testid="drive-result-state"
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
              <span>MAX BOUNDARY OCCUPATION</span>
              <strong data-testid="drive-boundary">
                {computed.result.analysis.maxBoundaryOccupation.toExponential(
                  3,
                )}
              </strong>
            </div>
            <div>
              <span>MAX FULL-STATE OCCUPATION ERROR</span>
              <strong data-testid="drive-number-error">
                {computed.result.analysis.maxNumberError.toExponential(3)}
              </strong>
            </div>
            <div>
              <span>MAX NORM DRIFT (RAW)</span>
              <strong>
                {computed.result.analysis.maxNormDrift.toExponential(3)}
              </strong>
            </div>
            <div>
              <span>WORK BALANCE / TRAPEZOID ERROR</span>
              <strong data-testid="drive-work-error">
                {computed.result.analysis.maxWorkBalanceError.toExponential(3)}
              </strong>
            </div>
          </div>
          {(computed.result.analysis.maxBoundaryOccupation > 1e-4 ||
            computed.result.analysis.maxNumberError > 1e-3 ||
            computed.result.analysis.omittedProbability > 1e-5) && (
            <p className="validation" data-testid="drive-truncation-warning">
              Finite cutoff differs from the full-space driven reference.
              Increase cutoff and compare; zero initial projection loss does not
              guarantee later convergence.
            </p>
          )}
          <div className="dynamics-timeline">
            <div className="timeline-heading">
              <span className="eyebrow">SYNCHRONIZED COMPUTED SAMPLE</span>
              <strong>
                {row + 1} / {computed.result.data.rows}
              </strong>
            </div>
            <input
              aria-label="Driven oscillator time cursor"
              type="range"
              min="0"
              max={computed.result.data.rows - 1}
              value={row}
              onChange={(e) => setSelected(Number(e.target.value))}
            />
          </div>
          <MotionFigures
            computed={computed}
            reference={reference}
            selected={row}
          />
          <div className="sweep-visual">
            <p className="eyebrow">OCCUPATION / COMPUTED SAMPLES</p>
            <Occupation
              computed={computed}
              reference={reference}
              selected={row}
            />
          </div>
          <div className="cavity-readouts">
            <span>
              ⟨N⟩{" "}
              <strong data-testid="drive-number">
                {computed.data[o + 5].toFixed(6)}
              </strong>
            </span>
            <span>
              Lab energy{" "}
              <strong data-testid="drive-energy">
                {computed.data[o + 11].toFixed(6)}
              </strong>
            </span>
            <span>
              Drive power{" "}
              <strong data-testid="drive-power">
                {computed.data[o + 12].toFixed(6)}
              </strong>
            </span>
          </div>
          {comparison && (
            <div
              className="comparison-report"
              data-testid="oscillator-drive-compare"
            >
              <h3>QuTiP versus Native</h3>
              <p>
                Max |Δ⟨q⟩|{" "}
                <span data-testid="drive-compare-q">
                  {comparison.q.toExponential(3)}
                </span>{" "}
                · max |Δ⟨p⟩| {comparison.p.toExponential(3)} · max
                phase-independent infidelity{" "}
                {comparison.infidelity.toExponential(3)}. Independent evolution;
                shared Hermite reconstruction.
              </p>
            </div>
          )}
          <p>
            Energy is not conserved under rotating forcing. Work-balance error
            includes time-sample trapezoid error; refine samples to check it.
            Initial omitted probability{" "}
            {computed.result.analysis.omittedProbability.toExponential(3)}.
            Variances use finite projected q/p operators. No box correction or
            spatial-grid convergence claim.
          </p>
          <div className="plot-caption">
            <span>
              {computed.result.engine.name} {computed.result.engine.version} ·
              Python {computed.result.provenance.pythonVersion} ·{" "}
              {computed.result.provenance.durationMs.toFixed(1)} ms
            </span>
            <span>
              f64le · SHA-256 verified · dimensionless q,p · Atlas energy offset{" "}
              {computed.result.analysis.energyOffset}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
function Occupation({
  computed,
  reference,
  selected,
}: {
  computed: Computed;
  reference: Computed | null;
  selected: number;
}) {
  const r = computed.result,
    stride = r.data.columns.length,
    max = Math.max(
      1,
      ...Array.from({ length: r.data.rows }, (_, k) =>
        Math.max(computed.data[k * stride + 5], computed.data[k * stride + 10]),
      ),
    );
  const line = (data: Float64Array, col: number) =>
    Array.from(
      { length: r.data.rows },
      (_, k) =>
        `${k ? "L" : "M"}${50 + (680 * k) / (r.data.rows - 1)},${200 - (160 * data[k * stride + col]) / max}`,
    ).join(" ");
  return (
    <>
      <svg
        viewBox="0 0 800 245"
        role="img"
        aria-label="Driven oscillator occupation"
      >
        <path d="M50 35 V200 H730" stroke="#506575" fill="none" />
        <path
          d={line(computed.data, 10)}
          stroke="#8597ae"
          strokeDasharray="5 5"
          fill="none"
        />
        {reference && (
          <path
            d={line(reference.data, 5)}
            stroke="#edae8f"
            fill="none"
            strokeWidth="3"
          />
        )}
        <path
          d={line(computed.data, 5)}
          stroke="#79d9c1"
          fill="none"
          strokeWidth="2"
        />
        <path
          d={`M${50 + (680 * selected) / (r.data.rows - 1)} 35 V200`}
          stroke="#eef7f5"
          strokeDasharray="2 3"
        />
        <text x="15" y="45" fill="#acc1ca">
          {max.toFixed(2)}
        </text>
        <text x="25" y="205" fill="#acc1ca">
          0
        </text>
        <text x="50" y="230" fill="#acc1ca">
          0
        </text>
        <text x="730" y="230" fill="#acc1ca" textAnchor="end">
          {(r.solver.tStop - r.solver.tStart).toFixed(4)} elapsed time
        </text>
      </svg>
      <p>
        Mint: occupation · peach: Native (when present) · dashed: full
        Fock/coherent reference. No damping or steady-state assumption.
      </p>
    </>
  );
}
