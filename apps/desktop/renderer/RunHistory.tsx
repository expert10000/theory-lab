import React, { useEffect, useState } from "react";
import type { QuantumBridge, RunExportFormat, RunSummary } from "../../../packages/contracts";
import { MODEL_REGISTRY, type EvolutionModelId } from "../../../packages/models";

const evolutionModels:readonly EvolutionModelId[]=["driven_two_level","landau_zener","stuckelberg","strong_drive"];
function evolutionLabel(model:string){return evolutionModels.includes(model as EvolutionModelId)?MODEL_REGISTRY[model as EvolutionModelId].label:null;}

export function RunHistory({ bridge,onOpenSpectrum,onOpenRabi,onOpenEvolution }: { bridge: QuantumBridge;onOpenSpectrum?:(runId:string)=>Promise<void>;onOpenRabi?:(runId:string)=>Promise<void>;onOpenEvolution?:(runId:string)=>Promise<void> }) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [opening,setOpening]=useState<string|null>(null);
  const [message, setMessage] = useState("");
  async function refresh() {
    setBusy(true);
    try { setRuns(await bridge.listRuns()); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, [bridge]);
  async function exportOne(runId: string, format: RunExportFormat) {
    try {
      const path = await bridge.exportRun(runId, format);
      setMessage(path ? `Exported ${format.toUpperCase()}: ${path}` : "Export cancelled");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }
  async function openOne(runId:string,kind:"spectrum"|"rabi"|"evolution"){
    const open=kind==="spectrum"?onOpenSpectrum:kind==="rabi"?onOpenRabi:onOpenEvolution;
    if(!open||opening)return;
    setOpening(runId);setMessage("");
    try{await open(runId);}
    catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setOpening(null);}
  }
  return <section className="runs-page" data-testid="runs-page">
    <div className="panel runs-intro"><div><p className="eyebrow">DURABLE RUNS / QLAB-016</p><h2>Every completed calculation, accounted for.</h2>
      <p>Jobs, results, engine versions and SHA-256-verified numerical artifacts survive an app restart. Reopen a verified two-level spectrum or evolution run, or export a run as data, a figure, or a provenance manifest.</p></div>
      <button type="button" className="text-button" onClick={() => void refresh()} disabled={busy}>Refresh runs ↻</button></div>
    {message && <p className="runs-message" role="status">{message}</p>}
    {runs.length === 0 ? <div className="panel runs-empty">{busy ? "Loading saved runs…" : "No saved runs yet. Run any laboratory to create one."}</div> :
      <div className="runs-list">{runs.map(run => <article className="panel run-row" key={run.runId} data-testid="saved-run">
        <div><p className="eyebrow">{run.operation.toUpperCase()} / {run.model}</p><h3>{run.model.replaceAll("_", " ")}</h3>
          <small>{new Date(run.computedAt).toLocaleString()} · {run.engine} {run.engineVersion} · {run.durationMs.toFixed(1)} ms</small>
          <code>{run.runId} · {run.artifactSha256 ? `${run.artifactSha256.slice(0, 16)}…` : "inline spectrum"}</code></div>
        <div className="run-exports">{run.operation==="diagonalize"&&onOpenSpectrum&&
          <button type="button" className="run-open" aria-label={`Open spectrum ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,"spectrum")}>{opening===run.runId?"Opening…":"Open spectrum"}</button>}
          {run.operation==="evolve"&&evolutionLabel(run.model)&&(onOpenEvolution||(run.model==="driven_two_level"&&onOpenRabi))&&
          <button type="button" className="run-open" aria-label={`Open ${run.model==="driven_two_level"?"Rabi":evolutionLabel(run.model)} evolution ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,onOpenEvolution?"evolution":"rabi")}>{opening===run.runId?"Opening…":`Open ${run.model==="driven_two_level"?"Rabi":evolutionLabel(run.model)} evolution`}</button>}
          {(["csv", "svg", "manifest"] as const).map(format =>
          <button type="button" key={format} aria-label={`Export ${format.toUpperCase()} ${run.runId}`} onClick={() => void exportOne(run.runId, format)}>{format.toUpperCase()}</button>)}</div>
      </article>)}</div>}
  </section>;
}
