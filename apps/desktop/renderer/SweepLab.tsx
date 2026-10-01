import React, { useEffect, useRef, useState } from "react";
import type { SweepEngineName, EvolutionProgress, QuantumBridge, SweepAxis, SweepResult, WorkerStatus, WorkspaceSnapshot } from "../../../packages/contracts";
import { MODEL_REGISTRY, defaultsFor, type EvolutionModelId } from "../../../packages/models";
import { SWEEP_DEFAULTS, sweepJob } from "../../../packages/models/sweep";

function AxisEditor({ axis, setAxis, modelId, title, disabled }: { axis: SweepAxis; setAxis: (axis: SweepAxis) => void; modelId: EvolutionModelId; title: string; disabled: boolean }) {
  return <div className="sweep-axis"><p className="eyebrow">{title}</p><div className="dynamics-fields">
    <label>Parameter<select aria-label={`${title} parameter`} value={axis.parameter} disabled={disabled} onChange={event => setAxis({ ...axis, parameter: event.target.value as SweepAxis["parameter"] })}>{MODEL_REGISTRY[modelId].parameters.map(parameter => <option value={parameter.key} key={parameter.key}>{parameter.label}</option>)}</select></label>
    <label>From<input aria-label={`${title} from`} type="number" value={axis.start} disabled={disabled} onChange={event => setAxis({ ...axis, start: Number(event.target.value) })}/></label>
    <label>To<input aria-label={`${title} to`} type="number" value={axis.stop} disabled={disabled} onChange={event => setAxis({ ...axis, stop: Number(event.target.value) })}/></label>
    <label>Points<input aria-label={`${title} points`} type="number" min="2" max="101" step="1" value={axis.points} disabled={disabled} onChange={event => setAxis({ ...axis, points: Number(event.target.value) })}/></label>
  </div></div>;
}

function SweepView({ result, values }: { result: SweepResult; values: Float64Array }) {
  const xCount = result.data.shape.x;
  const yCount = result.data.shape.y;
  const [selected, setSelected] = useState<[number, number]>([0, 0]);
  const xValue = (i: number) => result.sweep.x.start + (result.sweep.x.stop - result.sweep.x.start) * i / (xCount - 1);
  const yValue = (i: number) => result.sweep.y ? result.sweep.y.start + (result.sweep.y.stop - result.sweep.y.start) * i / (yCount - 1) : 0;
  if (yCount === 1) {
    const w = 760, h = 250;
    const polyline = Array.from({ length: xCount }, (_, i) => `${35 + i * 700 / (xCount - 1)},${20 + (1 - values[i]) * 205}`).join(" ");
    return <div className="sweep-visual" data-testid="sweep-line"><p className="eyebrow">FINAL P₁ / {result.sweep.x.parameter} →</p><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="One-dimensional final population sweep"><line x1="35" x2="735" y1="225" y2="225" stroke="#536777"/><line x1="35" x2="35" y1="20" y2="225" stroke="#536777"/><polyline points={polyline} fill="none" stroke="#79d9c1" strokeWidth="3"/>{Array.from({ length: xCount }, (_, i) => <circle key={i} cx={35 + i * 700 / (xCount - 1)} cy={20 + (1 - values[i]) * 205} r="4" fill="#79d9c1"><title>{`${result.sweep.x.parameter}=${xValue(i).toFixed(4)}; P₁=${values[i].toFixed(5)}`}</title></circle>)}</svg><div className="plot-caption"><span>{xValue(0).toFixed(3)}</span><span>{xValue(xCount - 1).toFixed(3)}</span></div></div>;
  }
  return <div className="sweep-visual" data-testid="sweep-heatmap"><p className="eyebrow">FINAL P₁ / {result.sweep.y?.parameter} ↑ · {result.sweep.x.parameter} →</p><div className="sweep-heatmap" style={{ gridTemplateColumns: `repeat(${xCount},minmax(0,1fr))` }}>
    {Array.from({ length: xCount * yCount }, (_, displayIndex) => {
      const col = displayIndex % xCount;
      const row = yCount - 1 - Math.floor(displayIndex / xCount);
      const value = values[row * xCount + col];
      return <button type="button" key={displayIndex} aria-label={`x ${col}, y ${row}, population ${value.toFixed(4)}`} className={selected[0] === col && selected[1] === row ? "selected" : ""} title={`${result.sweep.x.parameter}=${xValue(col).toFixed(4)}, ${result.sweep.y?.parameter}=${yValue(row).toFixed(4)}, P₁=${value.toFixed(5)}`} style={{ background: `rgba(121,217,193,${.08 + .92 * value})` }} onClick={() => setSelected([col, row])}/>;
    })}
  </div><div className="sweep-selection"><span>{result.sweep.x.parameter} = {xValue(selected[0]).toFixed(4)}</span><span>{result.sweep.y?.parameter} = {yValue(selected[1]).toFixed(4)}</span><strong data-testid="sweep-selected-value">P₁ = {values[selected[1] * xCount + selected[0]].toFixed(6)}</strong></div><div className="plot-caption"><span>{xCount} × {yCount} parameter grid</span><span>Click a cell for exact coordinates</span></div></div>;
}

export function SweepLab({ bridge, status, selectedModel, onModelChange, restored, restoreEpoch, onSnapshot }: { bridge: QuantumBridge; status: WorkerStatus; selectedModel?: EvolutionModelId; onModelChange?: (value: EvolutionModelId) => void; restored?: WorkspaceSnapshot["sweep"] | null; restoreEpoch?: number; onSnapshot?: (value: WorkspaceSnapshot["sweep"]) => void }) {
  const [modelId, setModelId] = useState<EvolutionModelId>("driven_two_level");
  const [parameters, setParameters] = useState(() => defaultsFor("driven_two_level"));
  const [x, setX] = useState<SweepAxis>(SWEEP_DEFAULTS.driven_two_level.x);
  const [y, setY] = useState<SweepAxis>(SWEEP_DEFAULTS.driven_two_level.y);
  const [twoD, setTwoD] = useState(false);
  const [start, setStart] = useState("0");
  const [stop, setStop] = useState("20");
  const [initialIndex, setInitialIndex] = useState<0 | 1>(0);
  const [engine, setEngine] = useState<SweepEngineName>("qutip");
  const [result, setResult] = useState<SweepResult | null>(null);
  const [values, setValues] = useState<Float64Array | null>(null);
  const [progress, setProgress] = useState<EvolutionProgress | null>(null);
  const [outcome, setOutcome] = useState("READY TO SWEEP");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const active = useRef<string | null>(null);
  useEffect(() => bridge.onProgress(value => { if (value.jobId === active.current) setProgress(value); }), [bridge]);
  useEffect(() => {
    if (selectedModel && selectedModel !== modelId) changeModel(selectedModel);
  }, [selectedModel]);
  useEffect(() => {
    if (!restored || !restoreEpoch) return;
    setModelId(restored.modelId); setParameters(restored.parameters); setX(restored.x); setY(restored.y);
    setTwoD(restored.twoD); setStart(restored.start); setStop(restored.stop);
    setInitialIndex(restored.initialIndex); setEngine(restored.engine);
    setResult(null); setValues(null); setOutcome("WORKSPACE RESTORED");
  }, [restoreEpoch]);
  useEffect(() => onSnapshot?.({ modelId, parameters, x, y, twoD, start, stop, initialIndex, engine }),
    [modelId, parameters, x, y, twoD, start, stop, initialIndex, engine, onSnapshot]);
  function changeModel(id: EvolutionModelId) {
    setModelId(id); setParameters(defaultsFor(id)); setX(SWEEP_DEFAULTS[id].x); setY(SWEEP_DEFAULTS[id].y);
    const solver = MODEL_REGISTRY[id].solverDefaults!; setStart(String(solver.tStart)); setStop(String(solver.tStop));
    setResult(null); setValues(null); setOutcome("READY TO SWEEP");
  }
  let preview: ReturnType<typeof sweepJob> | null = null;
  try {
    if (start.trim() && stop.trim()) preview = sweepJob(modelId, "preview", parameters, x, twoD ? y : null, Number(start), Number(stop), initialIndex, engine);
  } catch { /* validation is shown below */ }
  const ready = status.state === "READY" && !!status.capabilities?.operations.includes("sweep") && !!status.capabilities.engines[engine]?.available;
  const stale = result && (!preview || result.engine.name !== engine || JSON.stringify(result.model) !== JSON.stringify(preview.model) || JSON.stringify(result.sweep) !== JSON.stringify(preview.sweep));
  async function run() {
    if (!preview || !ready || running) return;
    setRunning(true); setError(""); setOutcome("RUNNING"); setResult(null); setValues(null); setProgress(null);
    const jobId = `job-${crypto.randomUUID()}`; active.current = jobId;
    try {
      const job = { ...preview, jobId };
      const completed = await bridge.sweep(job);
      const bytes = await bridge.readData(jobId);
      if (bytes.byteLength !== completed.data.bytes) throw new Error("Sweep artifact size mismatch");
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const decoded = new Float64Array(bytes.byteLength / 8);
      for (let i = 0; i < decoded.length; i++) decoded[i] = view.getFloat64(8 * i, true);
      if (decoded.length !== completed.data.shape.x * completed.data.shape.y) throw new Error("Sweep artifact shape mismatch");
      setResult(completed); setValues(decoded); setOutcome("COMPLETE");
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : String(exception);
      setOutcome(message.toLowerCase().includes("cancelled") ? "CANCELLED · RUN AGAIN TO RESUME" : "FAILED");
      if (!message.toLowerCase().includes("cancelled")) setError(message);
    } finally { active.current = null; setRunning(false); }
  }
  return <div className="cavity-lab">
    <section className="hamiltonian-card"><div><p className="eyebrow">CHECKPOINTED PARAMETER SWEEP / QLAB-014 + 019</p><div className="formula">Model → parameter grid → final P₁</div></div><div className="model-convention"><span>1D / 2D</span><p>QuTiP / native / GPU batch · ħ = 1</p></div></section>
    <section className="panel dynamics-settings"><div><p className="eyebrow">SWEEP JOB</p><h2>Map a quantum response.</h2><p>Choose a two-level model and vary one or two parameters. Completed cells are cached by model, engine and grid; rerun the same settings to resume after cancellation.</p></div>
      <div className="dynamics-fields"><label>Model<select aria-label="Sweep model" value={modelId} disabled={running} onChange={event => { const id=event.target.value as EvolutionModelId;changeModel(id);onModelChange?.(id); }}>{(["driven_two_level", "landau_zener", "stuckelberg", "strong_drive"] as const).map(id => <option value={id} key={id}>{MODEL_REGISTRY[id].label}</option>)}</select></label>
        <label>Dimension<select aria-label="Sweep dimension" value={twoD ? "2d" : "1d"} disabled={running} onChange={event => setTwoD(event.target.value === "2d")}><option value="1d">1D curve</option><option value="2d">2D heatmap</option></select></label>
        <label>Initial state<select aria-label="Sweep initial state" value={initialIndex} disabled={running} onChange={event => setInitialIndex(Number(event.target.value) as 0 | 1)}><option value={0}>|0⟩</option><option value={1}>|1⟩</option></select></label>
        <label>Engine<select aria-label="Sweep engine" value={engine} disabled={running} onChange={event => setEngine(event.target.value as SweepEngineName)}><option value="qutip">QuTiP</option><option value="native">Native · SciPy</option><option value="dynamiqs" disabled={!status.capabilities?.engines.dynamiqs?.available}>Dynamiqs · GPU batched</option></select></label>
      </div>
      <div className="sweep-axis-grid"><AxisEditor axis={x} setAxis={setX} modelId={modelId} title="X axis" disabled={running}/>{twoD && <AxisEditor axis={y} setAxis={setY} modelId={modelId} title="Y axis" disabled={running}/>}</div>
      <div className="dynamics-fields">{MODEL_REGISTRY[modelId].parameters.map(parameter => <label key={parameter.key}>Base {parameter.label}<input aria-label={`Base ${parameter.label}`} type="number" value={parameters[parameter.key]} disabled={running} onChange={event => setParameters(current => ({ ...current, [parameter.key]: event.target.value }))}/></label>)}
        <label>Start time<input aria-label="Sweep start time" type="number" value={start} disabled={running} onChange={event => setStart(event.target.value)}/></label><label>End time<input aria-label="Sweep end time" type="number" value={stop} disabled={running} onChange={event => setStop(event.target.value)}/></label>
      </div>
      <div className="dynamics-actions"><button className="run-button" data-testid="run-sweep" disabled={!preview || !ready || running} onClick={() => void run()}>▶ Run / resume sweep</button>{running && <button className="cancel-button" onClick={() => { if (active.current) void bridge.cancel(active.current); }}>Cancel job</button>}<span data-testid="sweep-state">{outcome}</span></div>
      {!preview && <p className="validation">Use distinct registered axes, ascending ranges within model bounds, and at most 10,000 cells.</p>}
      {status.state === "READY" && !ready && <p className="validation">Selected sweep engine unavailable.</p>}
      {running && <div className="progress-wrap"><progress max="1" value={progress?.fraction ?? 0}/><span data-testid="sweep-progress">{progress ? `${progress.completed} / ${progress.total}` : "Starting…"}</span></div>}
    </section>
    {error && <div className="error-message" role="alert">{error}</div>}
    {result && values && <section className="panel cavity-result" data-testid="sweep-result"><div className="panel-heading"><div><p className="eyebrow">QUANTUM-SWEEP-DATA / V1</p><h2>{result.data.shape.y === 1 ? "Response curve" : "Response heatmap"}</h2></div><span className={`result-badge ${stale ? "stale" : ""}`}>{stale ? "OUT OF DATE" : `${values.length} CELLS`}</span></div>
      <div className="cavity-metrics"><div><span>REUSED FROM CACHE</span><strong data-testid="sweep-reused">{result.cache.reusedPoints}</strong></div><div><span>NEWLY COMPUTED</span><strong>{result.cache.computedPoints}</strong></div><div><span>RESULT RANGE</span><strong>{Math.min(...values).toFixed(3)} – {Math.max(...values).toFixed(3)}</strong></div></div>
      <SweepView key={result.jobId} result={result} values={values}/><div className="plot-caption"><span>{result.engine.name} {result.engine.version} · {result.provenance.durationMs.toFixed(1)} ms</span><span>SHA-256 verified · resume key {result.cache.key.slice(0, 12)}…</span></div>
    </section>}
  </div>;
}
