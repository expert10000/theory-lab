import React, { useEffect, useMemo, useRef, useState } from "react";
import type { EngineName, EvolutionProgress, LindbladJob, LindbladResult, QuantumBridge, WorkerStatus, WorkspaceSnapshot } from "../../../packages/contracts";
import { LINDBLAD_FIELDS, lindbladDefaults, lindbladJob } from "../../../packages/models/lindblad";
import type { OpenPreset } from "../../../packages/models/presets";
import { PresetCheck } from "./PresetCheck";
import { selectedLindbladSample, type LindbladRunContext } from "./lindblad-selection";

function decode(bytes: Uint8Array, rows: number): Float64Array {
  if (bytes.byteLength !== rows * 56) throw new Error("Invalid Lindblad artifact shape");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const values = new Float64Array(rows * 7);
  for (let i = 0; i < values.length; i++) values[i] = view.getFloat64(8 * i, true);
  return values;
}

function OpenChart({ data, rows, cutoff, selected, onSelect }: { data: Float64Array; rows: number; cutoff: number; selected: number; onSelect: (index: number) => void }) {
  const w = 760, h = 250, left = 40, top = 20, bottom = 25;
  const x = (i: number) => left + (w - left - 10) * i / (rows - 1);
  const y = (value: number) => top + (h - top - bottom) * (1 - Math.max(0, Math.min(1, value)));
  const lines = [
    { offset: 1, label: "Excited P", color: "#79d9c1", scale: 1 },
    { offset: 2, label: "Photon ⟨n⟩ / N−1", color: "#f2b36f", scale: Math.max(1, cutoff - 1) },
    { offset: 3, label: "Purity", color: "#a7b9e8", scale: 1 },
    { offset: 4, label: "Coherence |ρge|", color: "#dd9cc5", scale: 1 },
  ];
  return <div className="cavity-chart" data-testid="lindblad-chart">
    <div className="cavity-legend">{lines.map(line => <span key={line.offset} style={{ color: line.color }}>● {line.label}</span>)}</div>
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Lindblad population, photon number, purity and coherence"
      onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); onSelect(Math.max(0, Math.min(rows - 1, Math.round(((event.clientX - rect.left) / rect.width * w - left) / (w - left - 10) * (rows - 1))))); }}>
      {[0, .5, 1].map(value => <g key={value}><line x1={left} x2={w - 10} y1={y(value)} y2={y(value)} stroke="#344350" strokeDasharray="3 4"/><text x="4" y={y(value) + 4} fill="#9bb0bc" fontSize="11">{value.toFixed(1)}</text></g>)}
      {lines.map(line => <polyline key={line.offset} fill="none" stroke={line.color} strokeWidth="2" points={Array.from({ length: rows }, (_, i) => `${x(i)},${y(data[i * 7 + line.offset] / line.scale)}`).join(" ")} />)}
      <line x1={x(selected)} x2={x(selected)} y1={top} y2={h - bottom} stroke="#e6edf3" strokeDasharray="4 4" data-testid="lindblad-chart-cursor" />
    </svg>
  </div>;
}

export function OpenSystemLab({ bridge, status, preset, restored, restoreEpoch, onSnapshot, onLindbladContext, reopenedLindblad }: { bridge: QuantumBridge; status: WorkerStatus; preset?: OpenPreset | null; restored?: WorkspaceSnapshot["open"] | null; restoreEpoch?: number; onSnapshot?: (value: WorkspaceSnapshot["open"]) => void; onLindbladContext?:(context:LindbladRunContext|null)=>void; reopenedLindblad?:{epoch:number;result:LindbladResult;data:Uint8Array}|null }) {
  const [parameters, setParameters] = useState(lindbladDefaults);
  const [qubit, setQubit] = useState<LindbladJob["initialState"]["qubit"]>("excited");
  const [photons, setPhotons] = useState("0");
  const [start, setStart] = useState("0");
  const [stop, setStop] = useState("20");
  const [samples, setSamples] = useState("401");
  const [engine, setEngine] = useState<EngineName>("qutip");
  const [result, setResult] = useState<LindbladResult | null>(null);
  const [data, setData] = useState<Float64Array | null>(null);
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState<EvolutionProgress | null>(null);
  const [outcome, setOutcome] = useState("READY TO RUN");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const active = useRef<string | null>(null);
  const appliedReopenEpoch=useRef<number|null>(null);
  useEffect(() => {
    if (!preset) return;
    if (active.current) void bridge.cancel(active.current);
    setParameters(Object.fromEntries(Object.entries(preset.parameters).map(([key, value]) => [key, String(value)])));
    setQubit(preset.initialState.qubit); setPhotons(String(preset.initialState.photons));
    setStart(String(preset.solver.tStart)); setStop(String(preset.solver.tStop)); setSamples(String(preset.solver.samples));
    setEngine("qutip"); setResult(null); setData(null); setSelected(0); setOutcome("PRESET LOADED");
    onLindbladContext?.(null);
  }, [preset,onLindbladContext]);
  useEffect(() => {
    if (!restored || !restoreEpoch) return;
    setParameters(restored.parameters); setQubit(restored.qubit); setPhotons(restored.photons);
    setStart(restored.start); setStop(restored.stop); setSamples(restored.samples); setEngine(restored.engine);
    setResult(null); setData(null); setSelected(0); setOutcome("WORKSPACE RESTORED");
    onLindbladContext?.(null);
  }, [restoreEpoch,onLindbladContext]);
  useEffect(()=>{
    if(!reopenedLindblad||appliedReopenEpoch.current===reopenedLindblad.epoch)return;
    const {result:stored,data:bytes}=reopenedLindblad;
    if(bytes.byteLength!==stored.data.rows*7*8)return;
    if(active.current){void bridge.cancel(active.current);active.current=null;setRunning(false);}
    appliedReopenEpoch.current=reopenedLindblad.epoch;
    setParameters(Object.fromEntries(Object.entries(stored.model.parameters).map(([key,value])=>[key,String(value)])));
    setQubit(stored.initialState.qubit);setPhotons(String(stored.initialState.photons));
    setStart(String(stored.solver.tStart));setStop(String(stored.solver.tStop));setSamples(String(stored.solver.samples));
    setEngine(stored.engine.name);setResult(stored);setData(decode(bytes,stored.data.rows));setSelected(0);
    setError("");setOutcome("SAVED RUN OPENED");
  },[reopenedLindblad?.epoch,bridge]);
  useEffect(() => onSnapshot?.({ parameters, qubit, photons, start, stop, samples, engine }),
    [parameters, qubit, photons, start, stop, samples, engine, onSnapshot]);
  useEffect(() => bridge.onProgress(value => { if (value.jobId === active.current) setProgress(value); }), [bridge]);
  const solver = { type: "master" as const, tStart: Number(start), tStop: Number(stop), samples: Number(samples) };
  let valid = Boolean(photons.trim() && start.trim() && stop.trim() && samples.trim());
  try { lindbladJob("preview", parameters, { qubit, photons: Number(photons) }, solver, engine); }
  catch { valid = false; }
  const ready = status.state === "READY" && !!status.capabilities?.operations.includes("lindblad") && !!status.capabilities.engines[engine].available;
  const stale = result && (!valid || result.engine.name !== engine ||
    Object.entries(result.model.parameters).some(([key, value]) => Number(parameters[key]) !== value) ||
    result.initialState.qubit !== qubit || result.initialState.photons !== Number(photons) ||
    result.solver.tStart !== solver.tStart || result.solver.tStop !== solver.tStop || result.solver.samples !== solver.samples);
  const selectedSample=useMemo(()=>result&&data?selectedLindbladSample({kind:"time_sample",model:"open_jaynes_cummings",runId:result.runId,index:selected},result,data):null,[result,data,selected]);
  const row=selectedSample?[selectedSample.time,selectedSample.pExcited,selectedSample.meanPhoton,selectedSample.purity,selectedSample.coherence,selectedSample.boundaryProbability,selectedSample.trace]:null;
  const diagnostics = useMemo(() => {
    if (!data || !result) return null;
    let maxBoundary = 0, maxTraceDrift = 0, minPurity = 1;
    for (let i = 0; i < result.data.rows; i++) {
      maxBoundary = Math.max(maxBoundary, data[i * 7 + 5]);
      maxTraceDrift = Math.max(maxTraceDrift, Math.abs(data[i * 7 + 6] - 1));
      minPurity = Math.min(minPurity, data[i * 7 + 3]);
    }
    return { maxBoundary, maxTraceDrift, minPurity };
  }, [data, result]);
  useEffect(()=>{
    if(!result||!selectedSample||!diagnostics){onLindbladContext?.(null);return;}
    onLindbladContext?.({result,selection:{kind:"time_sample",model:"open_jaynes_cummings",runId:result.runId,index:selected},sample:selectedSample,diagnostics,stale:!!stale});
  },[result,selectedSample,diagnostics,stale,selected,onLindbladContext]);
  async function run() {
    if (!valid || !ready || running) return;
    setRunning(true); setError(""); setOutcome("RUNNING"); setResult(null); setData(null); setSelected(0); setProgress(null);
    onLindbladContext?.(null);
    const jobId = `job-${crypto.randomUUID()}`; active.current = jobId;
    try {
      const job = lindbladJob(jobId, parameters, { qubit, photons: Number(photons) }, solver, engine, preset?.source);
      const completed = await bridge.lindblad(job);
      if(active.current!==jobId)return;
      const bytes = await bridge.readData(jobId);
      if(active.current!==jobId)return;
      if (bytes.byteLength !== completed.data.bytes) throw new Error("Lindblad artifact size mismatch");
      setData(decode(bytes, completed.data.rows)); setResult(completed); setOutcome("COMPLETE");
    } catch (exception) {
      if(active.current!==jobId)return;
      const message = exception instanceof Error ? exception.message : String(exception);
      setOutcome(message.toLowerCase().includes("cancelled") ? "CANCELLED" : "FAILED");
      if (!message.toLowerCase().includes("cancelled")) setError(message);
    } finally { if(active.current===jobId){active.current = null; setRunning(false);} }
  }
  return <div className="cavity-lab">
    {preset && <div className="preset-loaded" data-testid="preset-loaded">VOLUME VIII PRESET · {preset.title}<small>{preset.reference}</small></div>}
    <section className="hamiltonian-card"><div><p className="eyebrow">LINDBLAD / OPEN ATOM–CAVITY MODEL</p><div className="formula">H = Δq |e⟩⟨e| + Δc a†a + g(σ₊a + σ₋a†) + F(a + a†)</div></div><div className="model-convention"><span>ROTATING FRAME</span><p>Master equation · ħ = 1</p></div></section>
    <section className="panel dynamics-settings">
      <div><p className="eyebrow">OPEN-SYSTEM LABORATORY / QLAB-013</p><h2>Loss, phase, and steady state.</h2><p>Relaxation, pure dephasing and cavity loss are independent collapse channels. Purity and qubit coherence are calculated from the evolving density matrix.</p></div>
      <div className="dynamics-fields">
        {LINDBLAD_FIELDS.map(([key, label, minimum, maximum, step]) => <label key={key}>{label}<input aria-label={label} type="number" min={minimum} max={maximum} step={step} value={parameters[key]} disabled={running} onChange={event => setParameters(current => ({ ...current, [key]: event.target.value }))}/></label>)}
        <label>Initial qubit<select aria-label="Open initial qubit" value={qubit} disabled={running} onChange={event => setQubit(event.target.value as typeof qubit)}><option value="excited">|e⟩</option><option value="ground">|g⟩</option><option value="plus_x">|+x⟩</option></select></label>
        <label>Initial photons<input aria-label="Open initial photons" type="number" min="0" step="1" value={photons} disabled={running} onChange={event => setPhotons(event.target.value)}/></label>
        <label>Start time<input aria-label="Open start time" type="number" value={start} disabled={running} onChange={event => setStart(event.target.value)}/></label>
        <label>End time<input aria-label="Open end time" type="number" value={stop} disabled={running} onChange={event => setStop(event.target.value)}/></label>
        <label>Samples<input aria-label="Open samples" type="number" min="2" max="5000" step="1" value={samples} disabled={running} onChange={event => setSamples(event.target.value)}/></label>
        <label>Engine<select aria-label="Open engine" value={engine} disabled={running} onChange={event => setEngine(event.target.value as EngineName)}><option value="qutip">QuTiP</option><option value="native">Native · NumPy/SciPy</option></select></label>
      </div>
      <div className="dynamics-actions"><button className="run-button" data-testid="run-lindblad" disabled={!valid || !ready || running} onClick={() => void run()}>▶ Run master equation</button>{running && <button className="cancel-button" onClick={() => { if (active.current) void bridge.cancel(active.current); }}>Cancel job</button>}<span data-testid="lindblad-state">{outcome}</span></div>
      {!valid && <p className="validation">Check finite model values, 3–12 Fock levels, initial photons below the cutoff, and 2–5000 samples.</p>}
      {status.state === "READY" && !ready && <p className="validation">Selected engine unavailable. Check Python setup, then restart the worker.</p>}
      {running && <div className="progress-wrap"><progress max="1" value={progress?.fraction ?? 0}/><span>{progress ? `${progress.completed} / ${progress.total}` : "Starting…"}</span></div>}
    </section>
    {error && <div className="error-message" role="alert">{error}</div>}
    <PresetCheck preset={preset} result={result} data={data} />
    {result && data && diagnostics && <section className="panel cavity-result" data-testid="lindblad-result">
      <div className="panel-heading"><div><p className="eyebrow">QUANTUM-LINDBLAD-DATA / V1</p><h2>Open-system observables</h2></div><span className={`result-badge ${stale ? "stale" : ""}`}>{stale ? "OUT OF DATE" : `${result.data.rows} SAMPLES`}</span></div>
      <div className="cavity-metrics"><div><span>MINIMUM PURITY</span><strong data-testid="minimum-purity">{diagnostics.minPurity.toFixed(6)}</strong></div><div><span>TRACE DRIFT / MAX</span><strong>{diagnostics.maxTraceDrift.toExponential(2)}</strong></div><div><span>FOCK BOUNDARY / MAX</span><strong>{diagnostics.maxBoundary.toExponential(2)}</strong><small>{diagnostics.maxBoundary > .02 ? "Increase cutoff" : "Cutoff appears adequate"}</small></div></div>
      <OpenChart data={data} rows={result.data.rows} cutoff={result.model.parameters.cutoff} selected={selected} onSelect={setSelected}/>
      <div className="dynamics-timeline"><div className="timeline-heading"><span className="eyebrow">SYNCHRONIZED TIME CURSOR</span><strong>t = {row?.[0].toFixed(4)}</strong></div><input aria-label="Open-system time cursor" type="range" min="0" max={result.data.rows - 1} value={selected} onChange={event => setSelected(Number(event.target.value))}/></div>
      <div className="cavity-readouts"><span>P(e)<strong data-testid="open-excited">{row?.[1].toFixed(5)}</strong></span><span>⟨n⟩<strong data-testid="open-photons">{row?.[2].toFixed(5)}</strong></span><span>Purity<strong data-testid="open-purity">{row?.[3].toFixed(5)}</strong></span><span>|ρge|<strong data-testid="open-coherence">{row?.[4].toFixed(5)}</strong></span><span>Boundary<strong data-testid="open-boundary">{row?.[5].toExponential(2)}</strong></span><span>Trace<strong data-testid="open-trace">{row?.[6].toFixed(5)}</strong></span></div>
      <div className="steady-card" data-testid="steady-state"><p className="eyebrow">STATIONARY OBSERVABLES</p><h3>Steady state</h3>{result.steadyState ? <div className="cavity-readouts"><span>P(e)<strong>{result.steadyState.pExcited.toFixed(5)}</strong></span><span>⟨n⟩<strong>{result.steadyState.meanPhoton.toFixed(5)}</strong></span><span>Purity<strong>{result.steadyState.purity.toFixed(5)}</strong></span><span>|ρge|<strong>{result.steadyState.coherence.toFixed(5)}</strong></span></div> : <p>Not reported: both atom relaxation and cavity loss must be positive to use the unique-steady-state check.</p>}</div>
      <div className="plot-caption"><span>{result.engine.name} {result.engine.version} · {result.provenance.durationMs.toFixed(1)} ms</span><span>Rotating frame · SHA-256 verified</span></div>
    </section>}
  </div>;
}
