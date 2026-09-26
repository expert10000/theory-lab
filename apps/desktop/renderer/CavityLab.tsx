import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CavityResult, EngineName, EvolutionProgress, QuantumBridge, WorkerStatus } from "../../../packages/contracts";
import { CAVITY_REGISTRY, cavityDefaults, cavityJob, type CavityModelId } from "../../../packages/models/cavity";

function readF64(bytes: Uint8Array): Float64Array {
  if (bytes.byteLength % 8) throw new Error("Invalid cavity artifact length");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const values = new Float64Array(bytes.byteLength / 8);
  for (let i = 0; i < values.length; i++) values[i] = view.getFloat64(i * 8, true);
  return values;
}
function CavityPlot({ data, rows, selected, onSelect }: { data: Float64Array; rows: number; selected: number; onSelect: (index: number) => void }) {
  const width = 760, height = 250, left = 40, top = 20, bottom = 25;
  const x = (i: number) => left + (width - left - 10) * i / Math.max(1, rows - 1);
  const y = (value: number) => top + (height - top - bottom) * (1 - Math.min(1, Math.max(0, value)));
  const maxPhoton = Math.max(1, ...Array.from({ length: rows }, (_, i) => data[i * 6 + 2]));
  const lines = [
    { offset: 1, color: "#79d9c1", scale: 1, label: "Excited population" },
    { offset: 2, color: "#f2b36f", scale: maxPhoton, label: `Mean photon / ${maxPhoton.toFixed(2)}` },
  ];
  return <div className="cavity-chart">
    <div className="cavity-legend">{lines.map(line => <span key={line.offset} style={{ color: line.color }}>● {line.label}</span>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cavity population and photon dynamics"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const position = event.clientX - rect.left;
        onSelect(Math.max(0, Math.min(rows - 1, Math.round((position / rect.width * width - left) / (width - left - 10) * (rows - 1)))));
      }}>
      {[0, .5, 1].map(value => <g key={value}><line x1={left} x2={width - 10} y1={y(value)} y2={y(value)} stroke="#344350" strokeDasharray="3 4"/><text x="4" y={y(value) + 4} fill="#9bb0bc" fontSize="11">{value.toFixed(1)}</text></g>)}
      {lines.map(line => <polyline key={line.offset} fill="none" stroke={line.color} strokeWidth="2.2" points={Array.from({ length: rows }, (_, i) => `${x(i)},${y(data[i * 6 + line.offset] / line.scale)}`).join(" ")} />)}
      <line x1={x(selected)} x2={x(selected)} y1={top} y2={height - bottom} stroke="#e6edf3" strokeDasharray="4 4" />
    </svg>
  </div>;
}

export function CavityLab({ bridge, status, modelId }: { bridge: QuantumBridge; status: WorkerStatus; modelId: CavityModelId }) {
  const definition = CAVITY_REGISTRY[modelId];
  const [parameters, setParameters] = useState(() => cavityDefaults(modelId));
  const [qubit, setQubit] = useState<"ground" | "excited">("excited");
  const [photons, setPhotons] = useState("0");
  const [engine, setEngine] = useState<EngineName>("qutip");
  const [start, setStart] = useState("0");
  const [stop, setStop] = useState("25");
  const [samples, setSamples] = useState("401");
  const [result, setResult] = useState<CavityResult | null>(null);
  const [data, setData] = useState<Float64Array | null>(null);
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState<EvolutionProgress | null>(null);
  const [outcome, setOutcome] = useState("READY TO RUN");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const activeJob = useRef<string | null>(null);
  useEffect(() => {
    setParameters(cavityDefaults(modelId)); setResult(null); setData(null); setSelected(0);
    setOutcome("READY TO RUN"); setError("");
  }, [modelId]);
  useEffect(() => bridge.onProgress(update => { if (update.jobId === activeJob.current) setProgress(update); }), [bridge]);
  const solver = { type: "schrodinger" as const, tStart: Number(start), tStop: Number(stop), samples: Number(samples) };
  let valid = Boolean(photons.trim() && start.trim() && stop.trim() && samples.trim());
  try { cavityJob(modelId, "preview", parameters, { qubit, photons: Number(photons) }, solver, engine); }
  catch { valid = false; }
  const ready = status.state === "READY" && !!status.capabilities?.operations.includes("cavity") && !!status.capabilities.engines[engine].available;
  const stale = result && (result.engine.name !== engine || result.model.type !== modelId ||
    Object.entries(result.model.parameters).some(([key, value]) => Number(parameters[key]) !== value) ||
    result.initialState.qubit !== qubit || result.initialState.photons !== Number(photons) ||
    result.solver.tStart !== solver.tStart || result.solver.tStop !== solver.tStop || result.solver.samples !== solver.samples || !valid);
  const row = data ? Array.from(data.slice(selected * 6, selected * 6 + 6)) : null;
  const diagnostics = useMemo(() => {
    if (!data || !result) return null;
    let maxBoundary = 0, maxNormDrift = 0, maxParityDrift = 0, maxReferenceError = 0;
    const p = result.model.parameters;
    const delta = p.qubitFrequency - p.cavityFrequency;
    const generalized = Math.hypot(delta, 2 * p.coupling);
    const contrast = generalized ? 4 * p.coupling ** 2 / generalized ** 2 : 0;
    for (let i = 0; i < result.data.rows; i++) {
      maxBoundary = Math.max(maxBoundary, data[i * 6 + 3]);
      maxNormDrift = Math.max(maxNormDrift, Math.abs(data[i * 6 + 4] - 1));
      maxParityDrift = Math.max(maxParityDrift, Math.abs(data[i * 6 + 5] - data[5]));
      if (result.model.type === "jaynes_cummings" && result.initialState.qubit === "excited" && result.initialState.photons === 0)
        maxReferenceError = Math.max(maxReferenceError, Math.abs(data[i * 6 + 1] - (1 - contrast * Math.sin(generalized * (data[i * 6] - result.solver.tStart) / 2) ** 2)));
    }
    return { maxBoundary, maxNormDrift, maxParityDrift, maxReferenceError,
      dressedSplitting: generalized };
  }, [data, result]);
  async function run() {
    if (!valid || !ready || running) return;
    setRunning(true); setError(""); setOutcome("RUNNING"); setResult(null); setData(null); setSelected(0); setProgress(null);
    const jobId = `job-${crypto.randomUUID()}`; activeJob.current = jobId;
    try {
      const job = cavityJob(modelId, jobId, parameters, { qubit, photons: Number(photons) }, solver, engine);
      const completed = await bridge.cavity(job);
      const bytes = await bridge.readData(jobId);
      if (bytes.byteLength !== completed.data.bytes) throw new Error("Cavity artifact size mismatch");
      const values = readF64(bytes);
      if (values.length !== completed.data.rows * 6) throw new Error("Cavity artifact shape mismatch");
      setResult(completed); setData(values); setOutcome("COMPLETE");
    } catch (exception) {
      const message = exception instanceof Error ? exception.message : String(exception);
      setOutcome(message.includes("cancelled") ? "CANCELLED" : "FAILED");
      if (!message.includes("cancelled")) setError(message);
    } finally { activeJob.current = null; setRunning(false); }
  }
  return <div className="cavity-lab">
    <section className="hamiltonian-card"><div><p className="eyebrow">CAVITY QED / {definition.label.toUpperCase()}</p><div className="formula">{definition.hamiltonian}</div></div><div className="model-convention"><span>ATOM × FOCK</span><p>|g⟩ = |0⟩ · |e⟩ = |1⟩ · ħ = 1</p></div></section>
    <section className="panel dynamics-settings">
      <div><p className="eyebrow">CLOSED-SYSTEM LABORATORY</p><h2>{definition.label}</h2><p>{definition.description}. Set the Fock cutoff high enough that the boundary population remains small.</p></div>
      <div className="dynamics-fields">
        {([ ["qubitFrequency", "Qubit frequency ωq"], ["cavityFrequency", "Cavity frequency ωc"], ["coupling", "Coupling g"], ["cutoff", "Fock cutoff N"] ] as const).map(([key, label]) => <label key={key}>{label}<input aria-label={label} type="number" min="0" max={key === "cutoff" ? "20" : "1000"} step={key === "cutoff" ? "1" : "0.05"} value={parameters[key]} disabled={running} onChange={event => setParameters(current => ({ ...current, [key]: event.target.value }))}/></label>)}
        <label>Initial qubit<select aria-label="Initial qubit" value={qubit} disabled={running} onChange={event => setQubit(event.target.value as "ground" | "excited")}><option value="excited">|e⟩</option><option value="ground">|g⟩</option></select></label>
        <label>Initial photons<input aria-label="Initial photons" type="number" min="0" step="1" value={photons} disabled={running} onChange={event => setPhotons(event.target.value)}/></label>
        <label>Start time<input aria-label="Cavity start time" type="number" value={start} disabled={running} onChange={event => setStart(event.target.value)}/></label>
        <label>End time<input aria-label="Cavity end time" type="number" value={stop} disabled={running} onChange={event => setStop(event.target.value)}/></label>
        <label>Samples<input aria-label="Cavity samples" type="number" min="2" max="5000" step="1" value={samples} disabled={running} onChange={event => setSamples(event.target.value)}/></label>
        <label>Engine<select aria-label="Cavity engine" value={engine} disabled={running} onChange={event => setEngine(event.target.value as EngineName)}><option value="qutip">QuTiP</option><option value="native">Native · NumPy</option></select></label>
      </div>
      <div className="dynamics-actions"><button className="run-button" data-testid="run-cavity" disabled={!valid || !ready || running} onClick={() => void run()}>▶ Run cavity</button>{running && <button className="cancel-button" onClick={() => { if (activeJob.current) void bridge.cancel(activeJob.current); }}>Cancel job</button>}<span data-testid="cavity-state">{outcome}</span></div>
      {!valid && <p className="validation">Check finite parameters, 3 ≤ cutoff ≤ 20, initial photons &lt; cutoff, and 2–5000 samples.</p>}
      {status.state === "READY" && !ready && <p className="validation">The selected cavity engine is unavailable. Check Python setup, then restart the worker.</p>}
      {running && <div className="progress-wrap"><progress max="1" value={progress?.fraction ?? 0}/><span>{progress ? `${progress.completed} / ${progress.total}` : "Starting…"}</span></div>}
    </section>
    {error && <div className="error-message" role="alert">{error}</div>}
    {result && data && diagnostics && <section className="panel cavity-result" data-testid="cavity-result">
      <div className="panel-heading"><div><p className="eyebrow">QUANTUM-CAVITY-DATA / V1</p><h2>Dressed spectrum & dynamics</h2></div><span className={`result-badge ${stale ? "stale" : ""}`} data-testid="cavity-result-state">{stale ? "OUT OF DATE" : `${result.data.rows} SAMPLES`}</span></div>
      <div className="cavity-metrics"><div><span>BOUNDARY POPULATION / MAX</span><strong data-testid="cavity-boundary">{diagnostics.maxBoundary.toExponential(3)}</strong><small>{diagnostics.maxBoundary > 0.02 ? "Increase cutoff; truncation may affect results" : "Fock cutoff appears adequate for this run"}</small></div><div><span>NORM DRIFT / MAX</span><strong>{diagnostics.maxNormDrift.toExponential(3)}</strong></div><div><span>PARITY DRIFT / MAX</span><strong>{diagnostics.maxParityDrift.toExponential(3)}</strong></div>{result.model.type === "jaynes_cummings" && <div><span>VACUUM-RABI REFERENCE</span><strong data-testid="jc-reference">{result.initialState.qubit === "excited" && result.initialState.photons === 0 ? diagnostics.maxReferenceError.toExponential(3) : "|e,0⟩ only"}</strong><small>√(Δ²+4g²) = {diagnostics.dressedSplitting.toFixed(4)}</small></div>}</div>
      <div className="cavity-spectrum" data-testid="dressed-spectrum"><p className="eyebrow">SORTED DRESSED ENERGIES / {result.dressedSpectrum.length} LEVELS</p><div>{result.dressedSpectrum.map((energy, i) => <span key={i} title={`E${i} = ${energy.toFixed(8)}`}>{energy.toFixed(3)}</span>)}</div></div>
      <CavityPlot data={data} rows={result.data.rows} selected={selected} onSelect={setSelected}/>
      <div className="dynamics-timeline"><div className="timeline-heading"><span className="eyebrow">SYNCHRONIZED TIME CURSOR</span><strong>t = {row?.[0].toFixed(4)}</strong></div><input aria-label="Cavity time cursor" type="range" min="0" max={result.data.rows - 1} value={selected} onChange={event => setSelected(Number(event.target.value))}/></div>
      <div className="cavity-readouts"><span>P(e) <strong data-testid="cavity-excited">{row?.[1].toFixed(5)}</strong></span><span>⟨n⟩ <strong data-testid="cavity-photons">{row?.[2].toFixed(5)}</strong></span><span>Boundary <strong>{row?.[3].toExponential(2)}</strong></span><span>Parity <strong>{row?.[5].toFixed(5)}</strong></span></div>
      <div className="plot-caption"><span>{result.engine.name} {result.engine.version} · {result.provenance.durationMs.toFixed(1)} ms</span><span>atom × Fock · SHA-256 verified · {result.model.type === "jaynes_cummings" ? "theory Commit 691 reference" : "full Rabi Hamiltonian"}</span></div>
    </section>}
  </div>;
}
