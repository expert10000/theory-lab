import React, { useState } from "react";
import type { TopologyJob, TopologyResult, WorkerStatus } from "../../packages/contracts";
import { topologyJob, type TopologyDraft } from "../../packages/models/topology";

function SSHPlots({ result }: { result: TopologyResult }) {
  if (result.analysis.kind !== "ssh") return null;
  const a = result.analysis;
  const span = Math.max(0.01, ...a.upperBand);
  const path = (values: number[]) => values.map((value, index) =>
    `${index ? "L" : "M"}${34 + index * 660 / (values.length - 1)} ${150 - value * 105 / span}`).join(" ");
  return <div className="topo-plots"><div><div className="eyebrow">PERIODIC BLOCH BANDS</div><svg viewBox="0 0 730 310" role="img" aria-label="SSH Bloch bands">
    <path d="M34 25 V270 H694" fill="none" stroke="#667f92"/><path d={path(a.lowerBand)} fill="none" stroke="#f1b476" strokeWidth="2.5"/>
    <path d={path(a.upperBand)} fill="none" stroke="#7de2d5" strokeWidth="2.5"/><text x="34" y="295">−π</text><text x="355" y="295">k</text><text x="678" y="295">π</text></svg></div>
    <div><div className="eyebrow">OPEN-CHAIN MID-SPECTRUM DENSITY</div><div className="topo-density" role="img" aria-label="SSH finite-chain mid-spectrum density">{a.edgeDensity.map((value, index) =>
      <div key={index} title={`site ${index + 1}: ${value.toFixed(6)}`} style={{ height: `${Math.max(2, value * 1500)}px` }}/>)}</div>
      <p>Finite-chain pair: {a.edgeEnergies.map(value => value.toFixed(6)).join(" / ")}. Edge-orbital weight: {a.edgeWeight.toFixed(4)}.</p></div></div>;
}

function QWZPlot({ result }: { result: TopologyResult }) {
  if (result.analysis.kind !== "qwz" || result.model.type !== "qwz" || result.analysis.gapClosed) return null;
  const a = result.analysis, grid = result.model.parameters.grid;
  const maximum = Math.max(1e-9, ...a.berryCurvature.map(Math.abs));
  return <div className="topo-heatmap"><div className="eyebrow">LOWER-BAND BERRY CURVATURE / BRILLOUIN ZONE</div>
    <svg viewBox="0 0 520 520" role="img" aria-label="QWZ Berry curvature heatmap">{a.berryCurvature.map((value, index) => {
      const x = Math.floor(index / grid), y = index % grid;
      const intensity = Math.round(40 + 210 * Math.min(1, Math.abs(value) / maximum));
      return <rect key={index} x={50 + x * 420 / grid} y={50 + (grid - 1 - y) * 420 / grid} width={421 / grid} height={421 / grid}
        fill={value >= 0 ? `rgb(${intensity},85,90)` : `rgb(70,${intensity},180)`}><title>{`kx ${x}, ky ${y}: ${value.toFixed(6)}`}</title></rect>;
    })}<path d="M50 50 V470 H470" fill="none" stroke="#c2d5d9"/><text x="50" y="493">−π</text><text x="250" y="493">kₓ</text><text x="455" y="493">π</text><text x="9" y="260">kᵧ</text></svg>
    <p>Blue: negative curvature · red: positive curvature. Refine the mesh near a gap closing.</p></div>;
}

export function TopologyLab({ draft, onDraft, status, runJob }: {
  draft: TopologyDraft; onDraft: (draft: TopologyDraft) => void; status: WorkerStatus | null;
  runJob: (job: TopologyJob) => Promise<TopologyResult>;
}) {
  const [result, setResult] = useState<TopologyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = <K extends keyof TopologyDraft>(key: K, value: TopologyDraft[K]) => onDraft({ ...draft, [key]: value });
  let preview: TopologyJob | null = null;
  try { preview = topologyJob("preview", draft); } catch { /* Show bounded input guidance. */ }
  const ready = status?.state === "READY" && !!status.capabilities?.operations.includes("topology") && !!status.capabilities.engines.native.available;
  const stale = !!result && (!preview || JSON.stringify(preview.model) !== JSON.stringify(result.model));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!preview || !ready || busy) return;
    setBusy(true); setError("");
    try { setResult(await runJob({ ...preview, jobId: `web-${crypto.randomUUID()}` })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setBusy(false); }
  }
  return <div className="web-topology" data-testid="web-topology"><div className="page-intro"><div><div className="eyebrow">LIVE COMPUTATION / LATTICE TOPOLOGY</div><h1>SSH &amp; QWZ laboratories</h1>
    <p>Native NumPy worker · source-pinned Atlas Hamiltonians · finite grids, explicit diagnostics.</p></div><div className="model-badge">1D winding / 2D Chern</div></div>
    <div className="grid"><form className="card controls" onSubmit={submit}><div className="eyebrow">01 / CONFIGURE</div><h2>{draft.modelId === "ssh" ? "SSH chain" : "QWZ Chern insulator"}</h2>
      <div className="field"><label htmlFor="topology-model">Model</label><select id="topology-model" aria-label="Topology model" value={draft.modelId} onChange={event => change("modelId", event.target.value as TopologyDraft["modelId"])}><option value="ssh">SSH · 1D chain</option><option value="qwz">QWZ · 2D Chern insulator</option></select></div>
      {draft.modelId === "ssh" ? <><div className="field"><label htmlFor="ssh-t1">Intracell hopping t₁</label><input id="ssh-t1" type="number" step="any" value={draft.t1} onChange={event => change("t1", event.target.value)}/></div>
        <div className="field"><label htmlFor="ssh-t2">Intercell hopping t₂</label><input id="ssh-t2" type="number" step="any" value={draft.t2} onChange={event => change("t2", event.target.value)}/></div>
        <div className="field"><label htmlFor="ssh-cells">Open-chain cells</label><input id="ssh-cells" type="number" min="4" max="40" step="1" value={draft.cells} onChange={event => change("cells", event.target.value)}/></div>
        <div className="field"><label htmlFor="ssh-points">Band samples</label><input id="ssh-points" type="number" min="21" max="201" step="1" value={draft.kPoints} onChange={event => change("kPoints", event.target.value)}/></div></> : <>
        <div className="field"><label htmlFor="qwz-mass">Mass m</label><input id="qwz-mass" type="number" min="-6" max="6" step="any" value={draft.mass} onChange={event => change("mass", event.target.value)}/></div>
        <div className="field"><label htmlFor="qwz-grid">Momentum grid</label><input id="qwz-grid" type="number" min="11" max="31" step="1" value={draft.grid} onChange={event => change("grid", event.target.value)}/></div></>}
      <button className="primary run" data-testid="run-web-topology" disabled={!preview || !ready || busy}>{busy ? "Computing…" : `Run ${draft.modelId.toUpperCase()} →`}</button>
      {!preview && <p className="topo-warning">SSH: hoppings ±10, 4–40 cells, 21–201 samples. QWZ: mass ±6, grid 11–31.</p>}
      <div className="control-foot">{ready ? "Native engine ready" : "Connect to a ready native worker"} · ħ = 1</div></form>
      <div className="right-column"><div className="card result"><div className="eyebrow">02 / COMPUTED RESULT</div><h2>{result ? result.analysis.kind === "ssh" ? "Band winding & finite edges" : "Berry curvature & Chern number" : "Awaiting calculation"}</h2>
        {result && <><span className={stale ? "topo-state stale" : "topo-state"}>{stale ? "OUT OF DATE" : "SAVED RUN"}</span>
          {result.analysis.kind === "ssh" ? <><div className="topo-metrics"><div><span>BULK GAP</span><strong>{result.analysis.bulkGap.toFixed(6)}</strong></div><div><span>WINDING</span><strong data-testid="web-ssh-winding">{result.analysis.winding ?? "undefined"}</strong></div><div><span>EDGE WEIGHT</span><strong>{result.analysis.edgeWeight.toFixed(4)}</strong></div></div>
            <p>At a bulk gap closure the winding is undefined. Finite-size edge energies need not be exactly zero.</p><SSHPlots result={result}/></> : <><div className="topo-metrics"><div><span>BULK GAP</span><strong>{result.analysis.bulkGap.toFixed(6)}</strong></div><div><span>VERIFIED CHERN</span><strong data-testid="web-qwz-chern">{result.analysis.chern ?? (result.analysis.gapClosed ? "undefined" : "unresolved")}</strong></div><div><span>MIDPOINT INTEGRAL</span><strong>{result.analysis.chernIntegral?.toFixed(6) ?? "undefined"}</strong></div></div>
            {result.analysis.gapClosed ? <p className="topo-warning">The bulk gap closes at this mass. Lower-band Berry curvature and Chern invariant are undefined.</p> : <>{!result.analysis.meshResolved && <p className="topo-warning">Mesh unresolved: raw lattice Chern {result.analysis.latticeChern}, independent mass-sign phase {result.analysis.analyticChern}. Refine the momentum grid.</p>}
              <p>Midpoint-integral error from mass-sign value: {Math.abs(result.analysis.chernIntegral! - result.analysis.analyticChern!).toExponential(3)}.</p><QWZPlot result={result}/></>}</>}
          <div className="provenance">{result.engine.name} {result.engine.version} · {result.provenance.durationMs.toFixed(1)} ms<br/>Run {result.runId}<br/>{result.model.source?.sourceRepository}</div></>}
        {!result && <div className="empty-state"><div className="orbital">◇</div><p>Choose an Atlas-bound lattice model and run a numerical calculation.</p></div>}
      </div></div></div>{error && <div className="error" role="alert">{error}</div>}
  </div>;
}
