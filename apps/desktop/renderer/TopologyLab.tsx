import React, { useEffect, useRef, useState } from "react";
import type { QuantumBridge, TopologyResult, WorkerStatus, WorkspaceSnapshot } from "../../../packages/contracts";
import { TOPOLOGY_DEFAULTS, topologyJob, type TopologyDraft } from "../../../packages/models/topology";
import {selectedTopologySample,type TopologySelection,type TopologyRunContext} from "./topology-selection";

function SSHFigure({ result,selection,onSelect }: { result: TopologyResult;selection:TopologySelection|null;onSelect:(selection:TopologySelection)=>void }) {
  const a = result.analysis;
  if (a.kind !== "ssh") return null;
  const span = Math.max(0.01, ...a.upperBand);
  const path = (values: number[]) => values.map((value, index) => `${index ? "L" : "M"}${50 + index * 700 / (values.length - 1)} ${160 - value * 105 / span}`).join(" ");
  return <div className="topology-figures"><div className="sweep-visual"><p className="eyebrow">BULK BANDS / PERIODIC UNIT CELL</p>
    <svg viewBox="0 0 800 320" role="img" aria-label="SSH Bloch bands" onClick={event=>{const rect=event.currentTarget.getBoundingClientRect();const fraction=(event.clientX-rect.left)/rect.width;onSelect({kind:"ssh_band",runId:result.runId,index:Math.max(0,Math.min(a.kValues.length-1,Math.round((fraction*800-50)/700*(a.kValues.length-1))))});}}><path d="M50 30 V270 H750" stroke="#526875" fill="none"/>
      <path d={path(a.lowerBand)} stroke="#f2b36f" fill="none" strokeWidth="2"/><path d={path(a.upperBand)} stroke="#79d9c1" fill="none" strokeWidth="2"/>
      {selection?.kind==="ssh_band"&&selection.runId===result.runId&&<line data-testid="topology-selected-band" x1={50+selection.index*700/(a.kValues.length-1)} x2={50+selection.index*700/(a.kValues.length-1)} y1="30" y2="270" stroke="#ffffff" strokeDasharray="5 4"/>}
      <text x="50" y="295" fill="#a7bbc4" fontSize="12">−π</text><text x="385" y="295" fill="#a7bbc4" fontSize="12">k</text><text x="730" y="295" fill="#a7bbc4" fontSize="12">π</text></svg></div>
    <div className="sweep-visual"><label>Stored band sample <input aria-label="SSH band sample" type="range" min="0" max={a.kValues.length-1} value={selection?.kind==="ssh_band"&&selection.runId===result.runId?selection.index:0} onChange={event=>onSelect({kind:"ssh_band",runId:result.runId,index:Number(event.target.value)})}/></label><p className="eyebrow">OPEN CHAIN / MID-SPECTRUM PAIR DENSITY</p><div className="topology-density">{a.edgeDensity.map((value, index) => <button type="button" key={index} aria-label={`Select SSH edge site ${index+1}`} aria-pressed={selection?.kind==="ssh_site"&&selection.runId===result.runId&&selection.index===index} title={`site ${index + 1}: ${value.toFixed(5)}`} style={{ height: `${Math.max(2, value * 1800)}px` }} onClick={()=>onSelect({kind:"ssh_site",runId:result.runId,index})}/>)}</div>
      <p>Mid-spectrum energies {a.edgeEnergies.map(value => value.toFixed(6)).join(" / ")}; exposed-site weight {a.edgeWeight.toFixed(4)}.</p></div></div>;
}

function QWZFigure({ result,selection,onSelect }: { result: TopologyResult;selection:TopologySelection|null;onSelect:(selection:TopologySelection)=>void }) {
  const a = result.analysis;
  if (a.kind !== "qwz" || result.model.type !== "qwz" || a.gapClosed) return null;
  const grid = result.model.parameters.grid;
  const max = Math.max(1e-9, ...a.berryCurvature.map(Math.abs));
  return <div className="sweep-visual"><p className="eyebrow">LOWER-BAND BERRY CURVATURE / BRILLOUIN ZONE</p>
    <svg viewBox="0 0 520 520" role="img" aria-label="QWZ lower-band Berry curvature heatmap">
      {a.berryCurvature.map((value, index) => { const x = Math.floor(index / grid), y = index % grid;
        const intensity = Math.round(40 + 210 * Math.min(1, Math.abs(value) / max));
        const color = value >= 0 ? `rgb(${intensity},85,90)` : `rgb(70,${intensity},180)`;
        return <rect key={index} data-testid={selection?.kind==="qwz_cell"&&selection.runId===result.runId&&selection.xIndex===x&&selection.yIndex===y?"topology-selected-cell":undefined}
          role="button" tabIndex={0} aria-label={`Select QWZ cell kx ${x}, ky ${y}`} aria-pressed={selection?.kind==="qwz_cell"&&selection.runId===result.runId&&selection.xIndex===x&&selection.yIndex===y}
          onClick={()=>onSelect({kind:"qwz_cell",runId:result.runId,xIndex:x,yIndex:y})}
          onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelect({kind:"qwz_cell",runId:result.runId,xIndex:x,yIndex:y});}}}
          x={50 + x * 420 / grid} y={50 + (grid - 1 - y) * 420 / grid}
          width={421 / grid} height={421 / grid} fill={color} stroke={selection?.kind==="qwz_cell"&&selection.runId===result.runId&&selection.xIndex===x&&selection.yIndex===y?"#ffffff":undefined} strokeWidth="2"><title>{`kx ${x}, ky ${y}: ${value.toFixed(6)}`}</title></rect>;
      })}
      <path d="M50 50 V470 H470" fill="none" stroke="#c2d5d9"/>
      <text x="50" y="493" fill="#c2d5d9" fontSize="13">−π</text><text x="250" y="493" fill="#c2d5d9" fontSize="13">kₓ</text><text x="455" y="493" fill="#c2d5d9" fontSize="13">π</text>
      <text x="9" y="260" fill="#c2d5d9" fontSize="13">kᵧ</text>
    </svg><p>Blue: negative curvature · red: positive curvature. Numerical quadrature should approach the integer lattice Chern value as the grid is refined away from a gap closure.</p></div>;
}

export function TopologyLab({ bridge, status, restored, restoreEpoch, atlasDraft, atlasEpoch, onSnapshot, onTopologyContext, reopenedRun }: {
  bridge: QuantumBridge; status: WorkerStatus; restored?: TopologyDraft | null; restoreEpoch?: number;
  atlasDraft?: TopologyDraft | null; atlasEpoch?: number; onSnapshot?: (value: TopologyDraft) => void;
  onTopologyContext?:(context:TopologyRunContext|null)=>void; reopenedRun?:{epoch:number;result:TopologyResult}|null;
}) {
  const [draft, setDraft] = useState<TopologyDraft>(TOPOLOGY_DEFAULTS);
  const [result, setResult] = useState<TopologyResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [selection,setSelection]=useState<TopologySelection|null>(null);
  const appliedReopen=useRef<number|null>(null),runEpoch=useRef(0);
  useEffect(() => { if (restoreEpoch) { runEpoch.current++;setRunning(false);setDraft(restored ?? TOPOLOGY_DEFAULTS); setResult(null);setSelection(null); } }, [restoreEpoch]);
  useEffect(() => { if (atlasEpoch && atlasDraft) { runEpoch.current++;setRunning(false);setDraft(atlasDraft); setResult(null);setSelection(null); } }, [atlasEpoch]);
  useEffect(()=>{
    if(!reopenedRun||appliedReopen.current===reopenedRun.epoch)return;
    const saved=reopenedRun.result;
    runEpoch.current++;setRunning(false);appliedReopen.current=reopenedRun.epoch;
    setDraft(saved.model.type==="ssh"?{...TOPOLOGY_DEFAULTS,modelId:"ssh",t1:String(saved.model.parameters.t1),t2:String(saved.model.parameters.t2),cells:String(saved.model.parameters.cells),kPoints:String(saved.model.parameters.kPoints)}:
      {...TOPOLOGY_DEFAULTS,modelId:"qwz",mass:String(saved.model.parameters.mass),grid:String(saved.model.parameters.grid)});
    setResult(saved);setSelection(null);setError("");
  },[reopenedRun?.epoch]);
  useEffect(() => onSnapshot?.(draft), [draft, onSnapshot]);
  const change = <K extends keyof TopologyDraft>(key: K, value: TopologyDraft[K]) => {
    if(key==="modelId"){runEpoch.current++;setRunning(false);setResult(null);setSelection(null);}
    setDraft(old => ({ ...old, [key]: value }));
  };
  let preview: ReturnType<typeof topologyJob> | null = null;
  try { preview = topologyJob("preview", draft); } catch { /* Show validation message. */ }
  const ready = status.state === "READY" && !!status.capabilities?.operations.includes("topology") && !!status.capabilities.engines.native.available;
  const stale = !!result && (!preview || JSON.stringify(preview.model) !== JSON.stringify(result.model));
  const sample=selectedTopologySample(selection,result);
  useEffect(()=>onTopologyContext?.(result?{result,selection:sample?selection:null,sample,stale}:null),
    [result,selection,sample?.kind,stale,onTopologyContext]);
  async function run() {
    if (!preview || !ready || running) return;
    const epoch=++runEpoch.current;
    setRunning(true); setError("");setResult(null);setSelection(null);onTopologyContext?.(null);
    try { const completed=await bridge.topology({ ...preview, jobId: `job-${crypto.randomUUID()}` });if(runEpoch.current===epoch)setResult(completed); }
    catch (failure) { if(runEpoch.current===epoch)setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { if(runEpoch.current===epoch)setRunning(false); }
  }
  return <div className="cavity-lab" data-testid="topology-lab"><section className="hamiltonian-card"><div><p className="eyebrow">TOPOLOGICAL LATTICE LABORATORY / QLAB-027–028</p>
    <div className="formula">{draft.modelId === "ssh" ? "H(k) = (t₁ + t₂ cos k)σₓ + t₂ sin k σᵧ" : "H(k) = sin kₓ σₓ + sin kᵧ σᵧ + (m + cos kₓ + cos kᵧ)σᶻ"}</div></div><div className="model-convention"><span>{draft.modelId === "ssh" ? "1D SSH CHAIN" : "2D QWZ CHERN MODEL"}</span><p>Two-band Bloch Hamiltonian · normalized units</p></div></section>
    <section className="panel dynamics-settings"><div><p className="eyebrow">{draft.modelId.toUpperCase()} / NATIVE NUMPY ENGINE</p><h2>{draft.modelId === "ssh" ? "Bulk winding meets finite edges." : "Berry curvature becomes a Chern number."}</h2><p>{draft.modelId === "ssh" ? "Periodic Bloch bands and a chiral winding are compared with the mid-spectrum pair of a finite open chain. At a bulk gap closure the winding is undefined. Finite-chain edge energies split at finite size." : "The gauge-invariant Fukui–Hatsugai–Suzuki lattice Chern number is checked against an independent midpoint integral of the lower-band Berry curvature. The gap closes at m = −2, 0, +2; no Chern number is assigned there."}</p></div>
      <div className="dynamics-fields"><label>Model<select aria-label="Topology model" value={draft.modelId} onChange={event => change("modelId", event.target.value as TopologyDraft["modelId"])}><option value="ssh">SSH · 1D chain</option><option value="qwz">QWZ · 2D Chern insulator</option></select></label>
        {draft.modelId === "ssh" ? <><label>Intracell hopping t₁<input aria-label="SSH intracell hopping" type="number" step="0.1" value={draft.t1} onChange={event => change("t1", event.target.value)}/></label>
        <label>Intercell hopping t₂<input aria-label="SSH intercell hopping" type="number" step="0.1" value={draft.t2} onChange={event => change("t2", event.target.value)}/></label>
        <label>Open-chain cells<input aria-label="SSH cells" type="number" min="4" max="40" value={draft.cells} onChange={event => change("cells", event.target.value)}/></label>
        <label>Band samples<input aria-label="SSH band samples" type="number" min="21" max="201" value={draft.kPoints} onChange={event => change("kPoints", event.target.value)}/></label></> : <><label>Mass m<input aria-label="QWZ mass" type="number" min="-6" max="6" step="0.1" value={draft.mass} onChange={event => change("mass", event.target.value)}/></label>
        <label>Momentum grid<input aria-label="QWZ grid" type="number" min="11" max="31" step="1" value={draft.grid} onChange={event => change("grid", event.target.value)}/></label></>}</div>
      <div className="dynamics-actions"><button className="run-button" data-testid="run-topology" disabled={!preview || !ready || running} onClick={() => void run()}>{running ? "Calculating…" : `▶ Run ${draft.modelId.toUpperCase()}`}</button><span>{ready ? "NATIVE ENGINE READY" : "WORKER NOT READY"}</span></div>
      {!preview && <p className="validation">SSH: hoppings ±10, 4–40 cells, 21–201 samples. QWZ: mass ±6 and 11–31 momentum points per axis.</p>}</section>
    {error && <p className="error-message" role="alert">{error}</p>}
    {result && result.analysis.kind === "ssh" && <section className="panel cavity-result" data-testid="topology-result"><div className="panel-heading"><div><p className="eyebrow">COMPUTED SSH RESULT</p><h2>Band, winding & edge diagnostics</h2></div><span className={`result-badge ${stale ? "stale" : ""}`}>{stale ? "OUT OF DATE" : "SAVED RUN"}</span></div>
      <div className="cavity-metrics"><div><span>BULK GAP</span><strong>{result.analysis.bulkGap.toFixed(6)}</strong></div><div><span>WINDING</span><strong>{result.analysis.winding ?? "undefined"}</strong></div><div><span>EDGE WEIGHT</span><strong>{result.analysis.edgeWeight.toFixed(4)}</strong></div></div>
      <SSHFigure result={result} selection={selection} onSelect={setSelection}/><p className="plot-caption">Atlas SSH convention · ħ = 1 · finite open chain · {result.engine.name} {result.engine.version}</p></section>}
    {result && result.analysis.kind === "qwz" && <section className="panel cavity-result" data-testid="topology-result"><div className="panel-heading"><div><p className="eyebrow">COMPUTED QWZ RESULT</p><h2>Curvature, Chern number & gap</h2></div><span className={`result-badge ${stale ? "stale" : ""}`}>{stale ? "OUT OF DATE" : "SAVED RUN"}</span></div>
      <div className="cavity-metrics"><div><span>BULK GAP</span><strong>{result.analysis.bulkGap.toFixed(6)}</strong></div><div><span>VERIFIED CHERN</span><strong data-testid="qwz-chern">{result.analysis.chern ?? (result.analysis.gapClosed ? "undefined" : "unresolved")}</strong></div><div><span>MIDPOINT INTEGRAL</span><strong>{result.analysis.chernIntegral?.toFixed(6) ?? "undefined"}</strong></div></div>
      {result.analysis.gapClosed ? <p className="validation">The bulk gap closes at this mass. Berry curvature and the Chern invariant of an isolated lower band are undefined here.</p> : <><QWZFigure result={result} selection={selection} onSelect={setSelection}/>{!result.analysis.meshResolved && <p className="validation">Momentum mesh unresolved: raw lattice Chern {result.analysis.latticeChern}, while the independent mass-sign phase check gives {result.analysis.analyticChern}. Increase the grid; do not use this run as a phase label.</p>}
        <p>Grid convergence error |midpoint integral − mass-sign phase value| = {Math.abs(result.analysis.chernIntegral! - result.analysis.analyticChern!).toExponential(3)}. Increase the grid to check convergence, especially near a transition.</p></>}
      <p className="plot-caption">Pinned Atlas QWZ convention · lower occupied band · ħ = 1 · {result.engine.name} {result.engine.version}</p></section>}
  </div>;
}
