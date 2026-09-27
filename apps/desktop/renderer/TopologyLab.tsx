import React, { useEffect, useState } from "react";
import type { QuantumBridge, TopologyResult, WorkerStatus, WorkspaceSnapshot } from "../../../packages/contracts";
import { TOPOLOGY_DEFAULTS, topologyJob, type TopologyDraft } from "../../../packages/models/topology";

function SSHFigure({ result }: { result: TopologyResult }) {
  const a = result.analysis;
  if (a.kind !== "ssh") return null;
  const span = Math.max(0.01, ...a.upperBand);
  const path = (values: number[]) => values.map((value, index) => `${index ? "L" : "M"}${50 + index * 700 / (values.length - 1)} ${160 - value * 105 / span}`).join(" ");
  return <div className="topology-figures"><div className="sweep-visual"><p className="eyebrow">BULK BANDS / PERIODIC UNIT CELL</p>
    <svg viewBox="0 0 800 320" role="img" aria-label="SSH Bloch bands"><path d="M50 30 V270 H750" stroke="#526875" fill="none"/>
      <path d={path(a.lowerBand)} stroke="#f2b36f" fill="none" strokeWidth="2"/><path d={path(a.upperBand)} stroke="#79d9c1" fill="none" strokeWidth="2"/>
      <text x="50" y="295" fill="#a7bbc4" fontSize="12">−π</text><text x="385" y="295" fill="#a7bbc4" fontSize="12">k</text><text x="730" y="295" fill="#a7bbc4" fontSize="12">π</text></svg></div>
    <div className="sweep-visual"><p className="eyebrow">OPEN CHAIN / MID-SPECTRUM PAIR DENSITY</p><div className="topology-density">{a.edgeDensity.map((value, index) => <div key={index} title={`site ${index + 1}: ${value.toFixed(5)}`} style={{ height: `${Math.max(2, value * 1800)}px` }}/>)}</div>
      <p>Mid-spectrum energies {a.edgeEnergies.map(value => value.toFixed(6)).join(" / ")}; exposed-site weight {a.edgeWeight.toFixed(4)}.</p></div></div>;
}

export function TopologyLab({ bridge, status, restored, restoreEpoch, atlasDraft, atlasEpoch, onSnapshot }: {
  bridge: QuantumBridge; status: WorkerStatus; restored?: TopologyDraft | null; restoreEpoch?: number;
  atlasDraft?: TopologyDraft | null; atlasEpoch?: number; onSnapshot?: (value: TopologyDraft) => void;
}) {
  const [draft, setDraft] = useState<TopologyDraft>(TOPOLOGY_DEFAULTS);
  const [result, setResult] = useState<TopologyResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (restoreEpoch) { setDraft(restored ?? TOPOLOGY_DEFAULTS); setResult(null); } }, [restoreEpoch]);
  useEffect(() => { if (atlasEpoch && atlasDraft) { setDraft(atlasDraft); setResult(null); } }, [atlasEpoch]);
  useEffect(() => onSnapshot?.(draft), [draft, onSnapshot]);
  const change = <K extends keyof TopologyDraft>(key: K, value: TopologyDraft[K]) => setDraft(old => ({ ...old, [key]: value }));
  let preview: ReturnType<typeof topologyJob> | null = null;
  try { preview = topologyJob("preview", draft); } catch { /* Show validation message. */ }
  const ready = status.state === "READY" && !!status.capabilities?.operations.includes("topology") && !!status.capabilities.engines.native.available;
  const stale = !!result && (!preview || JSON.stringify(preview.model) !== JSON.stringify(result.model));
  async function run() {
    if (!preview || !ready || running) return;
    setRunning(true); setError("");
    try { setResult(await bridge.topology({ ...preview, jobId: `job-${crypto.randomUUID()}` })); }
    catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setRunning(false); }
  }
  return <div className="cavity-lab" data-testid="topology-lab"><section className="hamiltonian-card"><div><p className="eyebrow">TOPOLOGICAL LATTICE LABORATORY / QLAB-027</p>
    <div className="formula">H(k) = (t₁ + t₂ cos k)σₓ + t₂ sin k σᵧ</div></div><div className="model-convention"><span>1D SSH CHAIN</span><p>Two orbitals per cell · open and periodic geometries</p></div></section>
    <section className="panel dynamics-settings"><div><p className="eyebrow">SSH CHAIN / NUMPY EIGENSOLVER</p><h2>Bulk winding meets finite edges.</h2><p>Periodic Bloch bands and a chiral winding are compared with the mid-spectrum pair of a finite open chain. At a bulk gap closure the winding is undefined. Finite-chain edge energies split at finite size.</p></div>
      <div className="dynamics-fields"><label>Intracell hopping t₁<input aria-label="SSH intracell hopping" type="number" step="0.1" value={draft.t1} onChange={event => change("t1", event.target.value)}/></label>
        <label>Intercell hopping t₂<input aria-label="SSH intercell hopping" type="number" step="0.1" value={draft.t2} onChange={event => change("t2", event.target.value)}/></label>
        <label>Open-chain cells<input aria-label="SSH cells" type="number" min="4" max="40" value={draft.cells} onChange={event => change("cells", event.target.value)}/></label>
        <label>Band samples<input aria-label="SSH band samples" type="number" min="21" max="201" value={draft.kPoints} onChange={event => change("kPoints", event.target.value)}/></label></div>
      <div className="dynamics-actions"><button className="run-button" data-testid="run-topology" disabled={!preview || !ready || running} onClick={() => void run()}>{running ? "Calculating…" : "▶ Run SSH chain"}</button><span>{ready ? "NATIVE ENGINE READY" : "WORKER NOT READY"}</span></div>
      {!preview && <p className="validation">Use finite hoppings within ±10, 4–40 cells and 21–201 band samples.</p>}</section>
    {error && <p className="error-message" role="alert">{error}</p>}
    {result && result.analysis.kind === "ssh" && <section className="panel cavity-result" data-testid="topology-result"><div className="panel-heading"><div><p className="eyebrow">COMPUTED SSH RESULT</p><h2>Band, winding & edge diagnostics</h2></div><span className={`result-badge ${stale ? "stale" : ""}`}>{stale ? "OUT OF DATE" : "SAVED RUN"}</span></div>
      <div className="cavity-metrics"><div><span>BULK GAP</span><strong>{result.analysis.bulkGap.toFixed(6)}</strong></div><div><span>WINDING</span><strong>{result.analysis.winding ?? "undefined"}</strong></div><div><span>EDGE WEIGHT</span><strong>{result.analysis.edgeWeight.toFixed(4)}</strong></div></div>
      <SSHFigure result={result}/><p className="plot-caption">Atlas SSH convention · ħ = 1 · finite open chain · {result.engine.name} {result.engine.version}</p></section>}
  </div>;
}
