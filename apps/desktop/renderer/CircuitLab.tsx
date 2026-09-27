import React, { useEffect, useState } from "react";
import type { CircuitResult, QuantumBridge, WorkerStatus, WorkspaceSnapshot } from "../../../packages/contracts";
import { CIRCUIT_DEFAULTS, circuitJob } from "../../../packages/models/circuit";

type Draft = NonNullable<WorkspaceSnapshot["circuit"]>;

function EnergyFigure({ result }: { result: CircuitResult }) {
  const values = result.spectrum.energies;
  const origin = values[0], span = Math.max(1e-9, values[values.length - 1] - origin);
  return <div className="sweep-visual"><p className="eyebrow">CHARGE-BASIS LEVELS / E−E₀ IN GHz</p>
    <svg viewBox="0 0 800 260" role="img" aria-label="Transmon energy levels">
      <path d="M42 20 V215 H760" stroke="#506575" fill="none"/>
      {values.map((energy, index) => {
        const x = 75 + index * 665 / Math.max(1, values.length - 1);
        const y = 195 - (energy - origin) * 155 / span;
        return <g key={index}><line x1={x - 25} x2={x + 25} y1={y} y2={y} stroke="#79d9c1" strokeWidth="4"/>
          <text x={x} y="235" textAnchor="middle" fill="#acc1ca" fontSize="11">E{index}</text>
          <title>{`E${index} = ${energy.toFixed(8)} GHz`}</title></g>;
      })}
    </svg>
  </div>;
}

export function CircuitLab({ bridge, status, restored, restoreEpoch, onSnapshot }: {
  bridge: QuantumBridge; status: WorkerStatus; restored?: Draft | null; restoreEpoch?: number;
  onSnapshot?: (value: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(CIRCUIT_DEFAULTS);
  const [result, setResult] = useState<CircuitResult | null>(null);
  const [reference, setReference] = useState<CircuitResult | null>(null);
  const [resultMode, setResultMode] = useState<Draft["engine"] | null>(null);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState("READY TO CALCULATE");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!restoreEpoch) return;
    setDraft(restored ?? CIRCUIT_DEFAULTS); setResult(null); setReference(null);
    setOutcome("WORKSPACE RESTORED");
  }, [restoreEpoch]);
  useEffect(() => onSnapshot?.(draft), [draft, onSnapshot]);
  function change<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(current => ({ ...current, [key]: value })); }
  let preview: ReturnType<typeof circuitJob> | null = null;
  try { preview = circuitJob("preview", draft, draft.engine === "compare" ? "scqubits" : draft.engine); }
  catch { /* The validation note below explains the bounds. */ }
  const capabilities = status.capabilities;
  const ready = status.state === "READY" && !!capabilities?.operations.includes("circuit") &&
    (draft.engine === "compare" ? !!capabilities.engines.scqubits?.available && capabilities.engines.native.available
      : !!capabilities.engines[draft.engine]?.available);
  const stale = result && (!preview || resultMode !== draft.engine ||
    JSON.stringify(result.model) !== JSON.stringify(preview.model));
  async function run() {
    if (!preview || !ready || running) return;
    setRunning(true); setError(""); setOutcome("RUNNING"); setReference(null);
    try {
      const first = await bridge.circuit({ ...preview, jobId: `job-${crypto.randomUUID()}` });
      let second: CircuitResult | null = null;
      if (draft.engine === "compare") second = await bridge.circuit(circuitJob(`job-${crypto.randomUUID()}`, draft, "native"));
      setResult(first); setReference(second); setResultMode(draft.engine); setOutcome("COMPLETE");
    } catch (exception) {
      setOutcome("FAILED"); setError(exception instanceof Error ? exception.message : String(exception));
    } finally { setRunning(false); }
  }
  const comparison = result && reference ? {
    levels: Math.max(...result.spectrum.energies.map((value, index) => Math.abs(value - reference.spectrum.energies[index]))),
    n01: Math.abs(result.spectrum.chargeMatrixElement01 - reference.spectrum.chargeMatrixElement01),
  } : null;
  return <div className="cavity-lab" data-testid="circuit-lab">
    <section className="hamiltonian-card"><div><p className="eyebrow">SUPERCONDUCTING CIRCUIT / QLAB-023</p>
      <div className="formula">H/h = 4E<sub>C</sub>(n−n<sub>g</sub>)² − E<sub>J</sub> cos φ</div></div>
      <div className="model-convention"><span>TRANSMON / CHARGE BASIS</span><p>n = −ncut … +ncut · energies in GHz</p></div></section>
    <section className="panel dynamics-settings"><div><p className="eyebrow">CIRCUIT SPECTRUM JOB</p><h2>Josephson energy meets charging energy.</h2>
      <p>Diagonalize a finite charge basis. Compare scqubits with a separate NumPy matrix; inspect how E₀₁ changes when the cutoff grows by two. Always check convergence yourself.</p></div>
      <div className="dynamics-fields">
        <label>Josephson energy EJ/h (GHz)<input aria-label="Circuit EJ" type="number" min="0" max="100" step="0.1" value={draft.EJ} disabled={running} onChange={event => change("EJ", event.target.value)}/></label>
        <label>Charging energy EC/h (GHz)<input aria-label="Circuit EC" type="number" min="0.001" max="10" step="0.01" value={draft.EC} disabled={running} onChange={event => change("EC", event.target.value)}/></label>
        <label>Offset charge ng<input aria-label="Circuit ng" type="number" min="-1" max="1" step="0.01" value={draft.ng} disabled={running} onChange={event => change("ng", event.target.value)}/></label>
        <label>Charge cutoff ncut<input aria-label="Circuit ncut" type="number" min="3" max="40" step="1" value={draft.ncut} disabled={running} onChange={event => change("ncut", event.target.value)}/></label>
        <label>Reported levels<input aria-label="Circuit levels" type="number" min="3" max="8" step="1" value={draft.levels} disabled={running} onChange={event => change("levels", event.target.value)}/></label>
        <label>Engine<select aria-label="Circuit engine" value={draft.engine} disabled={running} onChange={event => change("engine", event.target.value as Draft["engine"])}>
          <option value="native">Native · NumPy</option><option value="scqubits" disabled={!capabilities?.engines.scqubits?.available}>scqubits</option>
          <option value="compare" disabled={!capabilities?.engines.scqubits?.available}>Compare scqubits / Native</option>
        </select></label>
      </div>
      <div className="dynamics-actions"><button className="run-button" data-testid="run-circuit" disabled={!preview || !ready || running} onClick={() => void run()}>▶ Run circuit</button>
        <span data-testid="circuit-state">{outcome}</span></div>
      {!preview && <p className="validation">Use EJ 0–100, EC &gt;0–10, ng ±1, ncut 3–40, and 3–8 levels within the charge basis.</p>}
      {status.state === "READY" && !ready && <p className="validation">Selected engine unavailable. Install scqubits and restart the worker, or use Native.</p>}
    </section>
    {error && <div className="error-message" role="alert">{error}</div>}
    {result && <section className="panel cavity-result" data-testid="circuit-result">
      <div className="panel-heading"><div><p className="eyebrow">TRANSMON RESULT / {result.engine.name.toUpperCase()}</p><h2>Levels & circuit diagnostics</h2></div>
        <span className={`result-badge ${stale ? "stale" : ""}`}>{stale ? "OUT OF DATE" : `${2 * result.model.parameters.ncut + 1} CHARGE STATES`}</span></div>
      <div className="cavity-metrics"><div><span>E₀₁ / GHz</span><strong data-testid="circuit-e01">{result.spectrum.e01.toFixed(6)}</strong></div>
        <div><span>ANHARMONICITY / GHz</span><strong data-testid="circuit-anharmonicity">{result.spectrum.anharmonicity.toFixed(6)}</strong></div>
        <div><span>|⟨0|n|1⟩|</span><strong>{result.spectrum.chargeMatrixElement01.toFixed(6)}</strong></div>
        <div><span>|ΔE₀₁| AT NCUT+2 / GHz</span><strong data-testid="circuit-cutoff">{result.spectrum.cutoffDriftE01.toExponential(3)}</strong><small>Diagnostic only; not a convergence proof</small></div></div>
      {comparison && <div className="comparison-report" data-testid="circuit-compare"><h3>scqubits versus Native</h3>
        <p>Max |ΔE| {comparison.levels.toExponential(3)} GHz · |Δn₀₁| {comparison.n01.toExponential(3)}</p></div>}
      <EnergyFigure result={result}/>
      <div className="plot-caption"><span>{result.engine.name} {result.engine.version} · {result.provenance.durationMs.toFixed(1)} ms</span><span>Finite charge basis · saved run</span></div>
    </section>}
  </div>;
}
