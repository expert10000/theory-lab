import React, { useCallback, useEffect, useRef, useState } from "react";
import { OscillatorDynamics } from "./OscillatorDynamics";
import { DrivenOscillator } from "./DrivenOscillator";
import { DampedOscillator } from "./DampedOscillator";
import { ParametricOscillator } from "./ParametricOscillator";
import { AnharmonicOscillator } from "./AnharmonicOscillator";
import type { DampedOscillatorDraft } from "../../../packages/models/oscillator-damped";
import type { DrivenOscillatorDraft } from "../../../packages/models/oscillator-drive";
import type { PulsedOscillatorDraft } from "../../../packages/models/oscillator-pulse";
import type { OscillatorDynamicsDraft } from "../../../packages/models/oscillator-dynamics";
import type {
  OscillatorResult,
  OscillatorFamilyResult,
  QuantumBridge,
  WorkerStatus,
} from "../../../packages/contracts";
import {selectedOscillatorItem,type OscillatorSelection,type OscillatorRunContext} from "./oscillator-selection";
import {
  OSCILLATOR_DEFAULTS,
  oscillatorJob,
  type OscillatorDraft,
} from "../../../packages/models/oscillator";

function StationaryFigure({ result }: { result: OscillatorResult }) {
  const { q, amplitude, density } = result.state;
  const extent = result.model.parameters.extent,
    peak = Math.max(...density),
    amp = Math.max(...amplitude.map(Math.abs));
  const path = (values: number[], scale: number, center: number) =>
    values
      .map(
        (v, i) =>
          `${i ? "L" : "M"}${(50 + (680 * (q[i] + extent)) / (2 * extent)).toFixed(2)},${(center - v * scale).toFixed(2)}`,
      )
      .join(" ");
  return (
    <div className="sweep-visual">
      <p className="eyebrow">STATIONARY NUMBER STATE / DIMENSIONLESS q</p>
      <svg
        viewBox="0 0 800 420"
        role="img"
        aria-label="Oscillator stationary density and real amplitude"
      >
        <path
          d="M50 30 V180 H730 M50 225 V370 H730 M50 295 H730"
          stroke="#506575"
          fill="none"
        />
        <path
          d={path(density, 140 / peak, 180)}
          stroke="#79d9c1"
          strokeWidth="2"
          fill="none"
        />
        <path
          d={path(amplitude, 65 / amp, 295)}
          stroke="#edae8f"
          strokeWidth="2"
          fill="none"
        />
        <text x="55" y="20" fill="#acc1ca" fontSize="12">
          |ψₙ(q)|² · density
        </text>
        <text x="55" y="215" fill="#acc1ca" fontSize="12">
          ψₙ(q) · real amplitude (separate vertical scale)
        </text>
        {[-extent, 0, extent].map((v) => (
          <text
            key={v}
            x={50 + (680 * (v + extent)) / (2 * extent)}
            y="395"
            textAnchor="middle"
            fill="#acc1ca"
            fontSize="12"
          >
            {v}
          </text>
        ))}
        <text x="750" y="395" fill="#acc1ca" fontSize="12">
          q
        </text>
      </svg>
      <p>
        No box renormalization. q is not a physical length; density and
        amplitude have separate vertical scales.
      </p>
    </div>
  );
}

export function OscillatorLab({
  bridge,
  status,
  restored,
  restoreEpoch,
  atlasDraft,
  atlasEpoch,
  onSnapshot,
  restoredMotion,
  onMotionSnapshot,
  restoredMode,
  onModeSnapshot,
  restoredDriven,
  onDrivenSnapshot,
  atlasDrivenDraft,
  atlasDrivenEpoch,
  restoredPulse,
  onPulseSnapshot,
  restoredDamped,
  onDampedSnapshot,
  restoredParametric,
  onParametricSnapshot,
  atlasParametricDraft,
  atlasParametricEpoch,
  restoredAnharmonic,
  onAnharmonicSnapshot,
  onOscillatorContext,
  reopenedRun,
}: {
  bridge: QuantumBridge;
  status: WorkerStatus;
  restored?: OscillatorDraft | null;
  restoreEpoch?: number;
  atlasDraft?: OscillatorDraft;
  atlasEpoch?: number;
  onSnapshot?: (draft: OscillatorDraft) => void;
  restoredMotion?: OscillatorDynamicsDraft;
  onMotionSnapshot?: (draft: OscillatorDynamicsDraft) => void;
  restoredMode?: "static" | "dynamics" | "driven" | "pulse" | "damped" | "parametric" | "anharmonic";
  onModeSnapshot?: (mode: "static" | "dynamics" | "driven" | "pulse" | "damped" | "parametric" | "anharmonic") => void;
  restoredDriven?: DrivenOscillatorDraft;
  onDrivenSnapshot?: (draft: DrivenOscillatorDraft) => void;
  atlasDrivenDraft?: DrivenOscillatorDraft;
  atlasDrivenEpoch?: number;
  restoredPulse?:PulsedOscillatorDraft;
  onPulseSnapshot?:(draft:PulsedOscillatorDraft)=>void;
  restoredDamped?:DampedOscillatorDraft;
  onDampedSnapshot?:(draft:DampedOscillatorDraft)=>void;
  restoredParametric?:import("../../../packages/models/oscillator-parametric").ParametricOscillatorDraft;
  onParametricSnapshot?:(draft:import("../../../packages/models/oscillator-parametric").ParametricOscillatorDraft)=>void;
  atlasParametricDraft?:import("../../../packages/models/oscillator-parametric").ParametricOscillatorDraft;
  atlasParametricEpoch?:number;
  restoredAnharmonic?:import("../../../packages/models/oscillator-anharmonic").AnharmonicDraft;
  onAnharmonicSnapshot?:(draft:import("../../../packages/models/oscillator-anharmonic").AnharmonicDraft)=>void;
  onOscillatorContext?:(context:OscillatorRunContext|null)=>void;
  reopenedRun?:{epoch:number;result:OscillatorFamilyResult;data:Uint8Array|null}|null;
}) {
  const [view, setView] = useState<"static" | "dynamics" | "driven" | "pulse" | "damped" | "parametric" | "anharmonic">("static");
  const [draft, setDraft] = useState<OscillatorDraft>(OSCILLATOR_DEFAULTS);
  const [result, setResult] = useState<OscillatorResult | null>(null),
    [reference, setReference] = useState<OscillatorResult | null>(null);
  const [mode, setMode] = useState<OscillatorDraft["engine"] | null>(null),
    [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState("READY TO CALCULATE"),
    [error, setError] = useState("");
  const [selection,setSelection]=useState<OscillatorSelection|null>(null);
  const appliedReopen=useRef<number|null>(null),runEpoch=useRef(0);
  const emit=useCallback((mode:typeof view,context:OscillatorRunContext|null)=>{
    if(mode===view)onOscillatorContext?.(context);
  },[view,onOscillatorContext]);
  const motionContext=useCallback((context:OscillatorRunContext|null)=>emit("dynamics",context),[emit]);
  const drivenContext=useCallback((context:OscillatorRunContext|null)=>emit("driven",context),[emit]);
  const pulseContext=useCallback((context:OscillatorRunContext|null)=>emit("pulse",context),[emit]);
  const dampedContext=useCallback((context:OscillatorRunContext|null)=>emit("damped",context),[emit]);
  const parametricContext=useCallback((context:OscillatorRunContext|null)=>emit("parametric",context),[emit]);
  const anharmonicContext=useCallback((context:OscillatorRunContext|null)=>emit("anharmonic",context),[emit]);
  function switchView(next:typeof view){onOscillatorContext?.(null);setView(next);}
  function reset(value: OscillatorDraft) {
    setView("static");
    setDraft(value);
    setResult(null);
    setReference(null);
    setSelection(null);
    setError("");
    setOutcome("READY TO CALCULATE");
  }
  useEffect(() => {
    if (restoreEpoch) {
      reset(restored ?? OSCILLATOR_DEFAULTS);
      setView(restoredMode ?? "static");
    }
  }, [restoreEpoch]);
  useEffect(() => {
    if (atlasEpoch && atlasDraft) reset(atlasDraft);
  }, [atlasEpoch]);
  useEffect(() => {
    if (atlasDrivenEpoch && atlasDrivenDraft) setView("driven");
  }, [atlasDrivenEpoch]);
  useEffect(()=>{
    if(!reopenedRun||appliedReopen.current===reopenedRun.epoch)return;
    appliedReopen.current=reopenedRun.epoch;runEpoch.current++;setRunning(false);
    const saved=reopenedRun.result;
    const nextView=saved.operation==="oscillator"?"static":saved.operation==="oscillator_evolve"?"dynamics":
      saved.operation==="oscillator_drive"?"driven":saved.operation==="oscillator_pulse"?"pulse":
      saved.operation==="oscillator_damped"?"damped":saved.operation==="oscillator_parametric"?"parametric":"anharmonic";
    setView(nextView);
    if(saved.operation==="oscillator"){
      const p=saved.model.parameters;
      setDraft({omega:String(p.omega),cutoff:String(p.cutoff),levels:String(p.levels),state:String(p.state),extent:String(p.extent),points:String(p.points),engine:saved.engine.name});
      setResult(saved);setReference(null);setMode(saved.engine.name);setSelection(null);setError("");setOutcome("SAVED RUN OPENED");
    }
  },[reopenedRun?.epoch]);
  useEffect(() => onSnapshot?.(draft), [draft, onSnapshot]);
  useEffect(() => onModeSnapshot?.(view), [view, onModeSnapshot]);
  let preview: ReturnType<typeof oscillatorJob> | null = null;
  try {
    preview = oscillatorJob(
      "preview",
      draft,
      draft.engine === "compare" ? "qutip" : draft.engine,
    );
  } catch {
    /* bounded input note below */
  }
  const c = status.capabilities;
  const ready =
    status.state === "READY" &&
    !!c?.operations.includes("oscillator") &&
    (draft.engine === "compare"
      ? c.engines.qutip.available && c.engines.native.available
      : !!c.engines[draft.engine].available);
  const stale =
    result &&
    (!preview ||
      mode !== draft.engine ||
      JSON.stringify(result.model) !== JSON.stringify(preview.model));
  const item=selectedOscillatorItem(selection,result,null);
  useEffect(()=>{
    if(view==="static")onOscillatorContext?.(result?{result,selection:item?selection:null,item,stale:!!stale}:null);
  },[view,result,selection,stale,onOscillatorContext]);
  async function run() {
    if (!preview || !ready || running) return;
    const epoch=++runEpoch.current;
    setRunning(true);
    setError("");
    setOutcome("RUNNING");
    setResult(null);setSelection(null);onOscillatorContext?.(null);
    try {
      const first = await bridge.oscillator({
        ...preview,
        jobId: `job-${crypto.randomUUID()}`,
      });
      const second =
        draft.engine === "compare"
          ? await bridge.oscillator(
              oscillatorJob(`job-${crypto.randomUUID()}`, draft, "native"),
            )
          : null;
      if(epoch!==runEpoch.current)return;
      setResult(first);
      setReference(second);
      setMode(draft.engine);
      setOutcome("COMPLETE");
    } catch (e) {
      if(epoch!==runEpoch.current)return;
      setOutcome("FAILED");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if(epoch===runEpoch.current)setRunning(false);
    }
  }
  const comparison =
    result && reference
      ? {
          energy: Math.max(
            ...result.spectrum.energies.map((v, i) =>
              Math.abs(v - reference.spectrum.energies[i]),
            ),
          ),
          moments: Math.max(
            Math.abs(result.analysis.qVariance - reference.analysis.qVariance),
            Math.abs(result.analysis.pVariance - reference.analysis.pVariance),
          ),
        }
      : null;
  const fields = [
    ["omega", "Frequency ω", 0.01, 20, 0.01],
    ["cutoff", "Fock cutoff", 8, 64, 1],
    ["levels", "Reported levels", 3, 12, 1],
    ["state", "Number state n", 0, 10, 1],
    ["extent", "q half-extent", 2, 12, 0.1],
    ["points", "Grid points (odd)", 101, 401, 2],
  ] as const;
  return (
    <div className="cavity-lab" data-testid="oscillator-lab">
      <div className="tabs" role="tablist" aria-label="Oscillator mode">
        <button
          role="tab"
          aria-selected={view === "static"}
          onClick={() => switchView("static")}
        >
          Stationary spectrum
        </button>
        <button
          role="tab"
          aria-selected={view === "dynamics"}
          onClick={() => switchView("dynamics")}
        >
          Free dynamics
        </button>
        <button
          role="tab"
          aria-selected={view === "driven"}
          onClick={() => switchView("driven")}
        >
          Driven dynamics
        </button>
        <button role="tab" aria-selected={view === "pulse"} onClick={() => switchView("pulse")}>
          Gaussian pulse
        </button>
        <button role="tab" aria-selected={view === "damped"} onClick={() => switchView("damped")}>Damped / thermal</button>
        <button role="tab" aria-selected={view === "parametric"} onClick={() => switchView("parametric")}>Parametric squeezing</button>
        <button role="tab" aria-selected={view === "anharmonic"} onClick={() => switchView("anharmonic")}>Quartic anharmonic</button>
      </div>
      <div hidden={view !== "static"}>
        <section className="hamiltonian-card">
          <div>
            <p className="eyebrow">STANDALONE OSCILLATOR / D1</p>
            <div className="formula">H = ω (a†a + ½)</div>
          </div>
          <div className="model-convention">
            <span>1D / FOCK BASIS</span>
            <p>ℏ = 1 · q = (a + a†)/√2</p>
          </div>
        </section>
        <section className="panel dynamics-settings">
          <div>
            <p className="eyebrow">STATIC SPECTRUM & NUMBER STATE</p>
            <h2>A ladder and a stationary wavefunction.</h2>
            <p>
              Independent QuTiP/NumPy Fock operators; shared analytic Hermite
              plotting. No time evolution, physical length calibration or
              arbitrary initial wavefunction.
            </p>
          </div>
          <div className="dynamics-fields">
            {fields.map(([key, label, min, max, step]) => (
              <label key={key}>
                {label}
                <input
                  aria-label={`Oscillator ${key}`}
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
              Engine
              <select
                aria-label="Oscillator engine"
                value={draft.engine}
                disabled={running}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    engine: e.target.value as OscillatorDraft["engine"],
                  }))
                }
              >
                <option value="native" disabled={!c?.engines.native.available}>
                  Native · NumPy/SciPy
                </option>
                <option value="qutip" disabled={!c?.engines.qutip.available}>
                  QuTiP
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
              data-testid="run-oscillator"
              disabled={!preview || !ready || running}
              onClick={() => void run()}
            >
              ▶ Run oscillator
            </button>
            <span data-testid="oscillator-state">{outcome}</span>
          </div>
          {!preview && (
            <p className="validation">
              ω 0.01–20; cutoff 8–64; 3–12 levels ≤ cutoff; state 0–10 below
              cutoff−1; extent 2–12; odd points 101–401.
            </p>
          )}
          {status.state === "READY" && !ready && (
            <p className="validation">
              Selected engine unavailable. Use an installed engine and restart
              the worker.
            </p>
          )}
        </section>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        {result && (
          <section
            className="panel cavity-result"
            data-testid="oscillator-result"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">
                  {result.engine.name.toUpperCase()} / n ={" "}
                  {result.model.parameters.state}
                </p>
                <h2>Oscillator result</h2>
              </div>
              <span className={`result-badge ${stale ? "stale" : ""}`}>
                {stale ? "OUT OF DATE" : "COMPUTED"}
              </span>
            </div>
            <div className="cavity-metrics">
              <div>
                <span>ZERO-POINT ENERGY E₀</span>
                <strong data-testid="oscillator-e0">
                  {result.spectrum.energies[0].toFixed(6)}
                </strong>
              </div>
              <div>
                <span>⟨q²⟩ = ⟨p²⟩</span>
                <strong data-testid="oscillator-variance">
                  {result.analysis.qVariance.toFixed(6)}
                </strong>
              </div>
              <div>
                <span>FINITE-BOX PROBABILITY</span>
                <strong>{result.analysis.gridProbability.toFixed(8)}</strong>
              </div>
              <div>
                <span>MAX LADDER ERROR</span>
                <strong>{result.analysis.ladderError.toExponential(3)}</strong>
              </div>
            </div>
            <div className="sweep-visual">
              <p className="eyebrow">Eₖ = ω(k + ½) / NORMALIZED ENERGY</p>
              <svg
                viewBox="0 0 800 220"
                role="img"
                aria-label="Oscillator energy ladder"
              >
                {result.spectrum.energies.map((v, i) => {
                  const x =
                      70 + (660 * i) / (result.spectrum.energies.length - 1),
                    y = 180 - (150 * v) / result.spectrum.energies.at(-1)!;
                  return (
                    <g key={i}>
                      <line
                        x1={x - 25}
                        x2={x + 25}
                        y1={y}
                        y2={y}
                        stroke="#79d9c1"
                        strokeWidth="3"
                      />
                      <text
                        x={x}
                        y="205"
                        textAnchor="middle"
                        fill="#acc1ca"
                        fontSize="12"
                      >
                        {i}: {v.toFixed(3)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="state-view-levels" aria-label="Stored oscillator energy levels">{result.spectrum.energies.map((energy,index)=><button type="button" key={index} aria-label={`Select oscillator E${index}`} aria-pressed={selection?.kind==="energy"&&selection.runId===result.runId&&selection.index===index} onClick={()=>setSelection({kind:"energy",runId:result.runId,index})}>E{index} · {energy.toFixed(4)}</button>)}</div>
            </div>
            <StationaryFigure result={result} />
            <label>Stored q sample <input aria-label="Oscillator q sample" type="range" min="0" max={result.state.q.length-1} value={selection?.kind==="position"&&selection.runId===result.runId?selection.index:0} onChange={event=>setSelection({kind:"position",runId:result.runId,index:Number(event.target.value)})}/></label>
            <p>
              Cutoff +4 drift: {result.analysis.cutoffDrift.toExponential(3)}.
              Exact low Fock energies are cutoff-independent here; this is not a
              general convergence test. Boundary occupation:{" "}
              {result.analysis.boundaryOccupation.toExponential(2)}.
            </p>
            {comparison && (
              <div
                className="comparison-report"
                data-testid="oscillator-compare"
              >
                <h3>QuTiP versus Native</h3>
                <p>
                  Max |ΔE| {comparison.energy.toExponential(3)} · max quadrature
                  variance difference {comparison.moments.toExponential(3)}.
                  Hermite plotting is shared, not an independent spatial solver.
                </p>
              </div>
            )}
            <div className="plot-caption">
              <span>
                {result.engine.name} {result.engine.version} · Python{" "}
                {result.provenance.pythonVersion} ·{" "}
                {result.provenance.durationMs.toFixed(1)} ms
              </span>
              <span>Saved run · CSV/SVG/manifest in Saved runs</span>
            </div>
          </section>
        )}
      </div>
      <div hidden={view !== "dynamics"}>
        <OscillatorDynamics
          bridge={bridge}
          status={status}
          restored={restoredMotion}
          restoreEpoch={restoreEpoch}
          onSnapshot={onMotionSnapshot}
          onRunContext={motionContext}
          reopenedRun={reopenedRun?.result.operation==="oscillator_evolve"&&reopenedRun.data?{epoch:reopenedRun.epoch,result:reopenedRun.result,data:reopenedRun.data}:null}
        />
      </div>
      <div hidden={view !== "driven"}>
        <DrivenOscillator
          bridge={bridge}
          status={status}
          restored={restoredDriven}
          restoreEpoch={restoreEpoch}
          onSnapshot={onDrivenSnapshot}
          atlasDraft={atlasDrivenDraft}
          atlasEpoch={atlasDrivenEpoch}
          onRunContext={drivenContext}
          reopenedRun={reopenedRun?.result.operation==="oscillator_drive"&&reopenedRun.data?{epoch:reopenedRun.epoch,result:reopenedRun.result,data:reopenedRun.data}:null}
        />
      </div>
      <div hidden={view !== "pulse"}>
        <DrivenOscillator bridge={bridge} status={status} forcing="gaussian" restoredPulse={restoredPulse} restoreEpoch={restoreEpoch} onPulseSnapshot={onPulseSnapshot} onRunContext={pulseContext} reopenedRun={reopenedRun?.result.operation==="oscillator_pulse"&&reopenedRun.data?{epoch:reopenedRun.epoch,result:reopenedRun.result,data:reopenedRun.data}:null}/>
      </div>
      <div hidden={view !== "damped"}><DampedOscillator bridge={bridge} status={status} restored={restoredDamped} restoreEpoch={restoreEpoch} onSnapshot={onDampedSnapshot} onRunContext={dampedContext} reopenedRun={reopenedRun?.result.operation==="oscillator_damped"&&reopenedRun.data?{epoch:reopenedRun.epoch,result:reopenedRun.result,data:reopenedRun.data}:null}/></div>
      <div hidden={view !== "parametric"}><ParametricOscillator bridge={bridge} status={status} restored={restoredParametric} restoreEpoch={restoreEpoch} onSnapshot={onParametricSnapshot} atlasDraft={atlasParametricDraft} atlasEpoch={atlasParametricEpoch} onRunContext={parametricContext} reopenedRun={reopenedRun?.result.operation==="oscillator_parametric"&&reopenedRun.data?{epoch:reopenedRun.epoch,result:reopenedRun.result,data:reopenedRun.data}:null}/></div>
      <div hidden={view !== "anharmonic"}><AnharmonicOscillator bridge={bridge} status={status} restored={restoredAnharmonic} restoreEpoch={restoreEpoch} onSnapshot={onAnharmonicSnapshot} onRunContext={anharmonicContext} reopenedRun={reopenedRun?.result.operation==="oscillator_anharmonic"?{epoch:reopenedRun.epoch,result:reopenedRun.result}:null}/></div>
    </div>
  );
}
