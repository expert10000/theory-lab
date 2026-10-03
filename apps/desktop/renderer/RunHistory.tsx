import React, { useEffect, useState } from "react";
import type { QuantumBridge, RunComparisonPins, RunExportFormat, RunSummary, SavedRunInspection } from "../../../packages/contracts";
import { MODEL_REGISTRY, type EvolutionModelId } from "../../../packages/models";
import { CAVITY_REGISTRY, type CavityModelId } from "../../../packages/models/cavity";

const evolutionModels:readonly EvolutionModelId[]=["driven_two_level","landau_zener","stuckelberg","strong_drive"];
function evolutionLabel(model:string){return evolutionModels.includes(model as EvolutionModelId)?MODEL_REGISTRY[model as EvolutionModelId].label:null;}
const cavityModels:readonly CavityModelId[]=["jaynes_cummings","quantum_rabi"];
function cavityLabel(model:string){return cavityModels.includes(model as CavityModelId)?CAVITY_REGISTRY[model as CavityModelId].label:null;}

export function RunHistory({ bridge,onOpenSpectrum,onOpenRabi,onOpenEvolution,onOpenCavity,onOpenLindblad,onOpenCircuit,onOpenManyBody,onOpenSweep,onOpenTopology,onOpenOrbital,onOpenOscillator,onAnalyze }: { bridge: QuantumBridge;onOpenSpectrum?:(runId:string)=>Promise<void>;onOpenRabi?:(runId:string)=>Promise<void>;onOpenEvolution?:(runId:string)=>Promise<void>;onOpenCavity?:(runId:string)=>Promise<void>;onOpenLindblad?:(runId:string)=>Promise<void>;onOpenCircuit?:(runId:string)=>Promise<void>;onOpenManyBody?:(runId:string)=>Promise<void>;onOpenSweep?:(runId:string)=>Promise<void>;onOpenTopology?:(runId:string)=>Promise<void>;onOpenOrbital?:(runId:string)=>Promise<void>;onOpenOscillator?:(runId:string)=>Promise<void>;onAnalyze?:()=>void }) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [opening,setOpening]=useState<string|null>(null);
  const [message, setMessage] = useState("");
  const [pins,setPins]=useState<RunComparisonPins>({a:null,b:null});
  const [pinning,setPinning]=useState(false);
  const [inspection,setInspection]=useState<SavedRunInspection|null>(null);
  const [inspecting,setInspecting]=useState<string|null>(null);
  const [rerunning,setRerunning]=useState(false);
  async function refresh() {
    setBusy(true);
    try { const [saved,selected]=await Promise.all([bridge.listRuns(),bridge.getRunComparisonPins()]);setRuns(saved);setPins(selected);setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, [bridge]);
  async function pin(side:"a"|"b",runId:string|null){
    if(pinning)return;
    setPinning(true);setMessage("");
    try{
      if(runId)await bridge.getVerifiedRun(runId);
      const next={...pins,[side]:runId};
      if(next.a&&next.a===next.b)throw new Error("Pin A and B must be different saved runs");
      setPins(await bridge.setRunComparisonPins(next));
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setPinning(false);}
  }
  async function exportOne(runId: string, format: RunExportFormat) {
    try {
      const path = await bridge.exportRun(runId, format);
      setMessage(path ? `Exported ${format.toUpperCase()}: ${path}` : "Export cancelled");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }
  async function inspectOne(runId:string){
    if(inspecting||rerunning)return;
    if(inspection?.summary.runId===runId){setInspection(null);return;}
    setInspecting(runId);setMessage("");
    try{setInspection(await bridge.inspectSavedRun(runId));}
    catch(error){setInspection(null);setMessage(error instanceof Error?error.message:String(error));}
    finally{setInspecting(null);}
  }
  async function rerunOne(){
    if(!inspection?.preflight.fingerprint||rerunning)return;
    setRerunning(true);setMessage("");
    try{
      const created=await bridge.rerunSaved(inspection.summary.runId,inspection.preflight.fingerprint);
      setMessage(`New saved run ${created.runId} created from ${inspection.summary.runId}. The original was not changed.`);
      setInspection(null);
      setRuns(await bridge.listRuns());
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setRerunning(false);}
  }
  async function openOne(runId:string,kind:"spectrum"|"rabi"|"evolution"|"cavity"|"lindblad"|"circuit"|"many_body"|"sweep"|"topology"|"orbital"|"oscillator"){
    const open=kind==="spectrum"?onOpenSpectrum:kind==="rabi"?onOpenRabi:kind==="cavity"?onOpenCavity:kind==="lindblad"?onOpenLindblad:kind==="circuit"?onOpenCircuit:kind==="many_body"?onOpenManyBody:kind==="sweep"?onOpenSweep:kind==="topology"?onOpenTopology:kind==="orbital"?onOpenOrbital:kind==="oscillator"?onOpenOscillator:onOpenEvolution;
    if(!open||opening)return;
    setOpening(runId);setMessage("");
    try{await open(runId);}
    catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setOpening(null);}
  }
  return <section className="runs-page" data-testid="runs-page">
    <div className="panel runs-intro"><div><p className="eyebrow">DURABLE RUNS / QLAB-016</p><h2>Every completed calculation, accounted for.</h2>
      <p>Jobs, results, engine versions and SHA-256-verified numerical artifacts survive an app restart. Reopen, inspect provenance, or rerun a verified job as a new saved run. You can also pin A/B comparisons and export data, figures and manifests.</p></div>
      <button type="button" className="text-button" onClick={() => void refresh()} disabled={busy}>Refresh runs ↻</button></div>
    <div className="panel runs-pins" data-testid="runs-pins"><div><p className="eyebrow">QLAB-UI-6 / SAVED RUN COMPARISON</p>
      <strong>A: {pins.a??"not pinned"}</strong><strong>B: {pins.b??"not pinned"}</strong>
      <small>Pins store run IDs only. A/B values are loaded and verified when Analysis opens.</small></div>
      <div><button type="button" onClick={()=>void pin("a",null)} disabled={!pins.a||pinning}>Clear A</button>
        <button type="button" onClick={()=>void pin("b",null)} disabled={!pins.b||pinning}>Clear B</button>
        <button type="button" className="run-open" onClick={onAnalyze} disabled={!pins.a||!pins.b||!onAnalyze} data-testid="open-comparison">Open A/B Analysis</button></div></div>
    {message && <p className="runs-message" role="status">{message}</p>}
    {runs.length === 0 ? <div className="panel runs-empty">{busy ? "Loading saved runs…" : "No saved runs yet. Run any laboratory to create one."}</div> :
      <div className="runs-list">{runs.map(run => <article className="panel run-row" key={run.runId} data-testid="saved-run">
        <div><p className="eyebrow">{run.operation.toUpperCase()} / {run.model}</p><h3>{run.model.replaceAll("_", " ")}</h3>
          <small>{new Date(run.computedAt).toLocaleString()} · {run.engine} {run.engineVersion} · {run.durationMs.toFixed(1)} ms</small>
          <code>{run.runId} · {run.artifactSha256 ? `${run.artifactSha256.slice(0, 16)}…` : "inline result"}</code>
          {run.parentRunId&&<small>Re-run of {run.parentRunId}</small>}</div>
        <div className="run-exports"><button type="button" aria-label={`Pin A ${run.runId}`} aria-pressed={pins.a===run.runId} disabled={pinning||pins.b===run.runId} onClick={()=>void pin("a",run.runId)}>{pins.a===run.runId?"A pinned":"Pin A"}</button>
          <button type="button" aria-label={`Pin B ${run.runId}`} aria-pressed={pins.b===run.runId} disabled={pinning||pins.a===run.runId} onClick={()=>void pin("b",run.runId)}>{pins.b===run.runId?"B pinned":"Pin B"}</button>
          <button type="button" aria-label={`Inspect provenance ${run.runId}`} aria-expanded={inspection?.summary.runId===run.runId}
            disabled={!!inspecting||rerunning} onClick={()=>void inspectOne(run.runId)}>{inspecting===run.runId?"Verifying…":inspection?.summary.runId===run.runId?"Close provenance":"Provenance / rerun"}</button>
          {run.operation==="diagonalize"&&onOpenSpectrum&&
          <button type="button" className="run-open" aria-label={`Open spectrum ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,"spectrum")}>{opening===run.runId?"Opening…":"Open spectrum"}</button>}
          {run.operation==="evolve"&&evolutionLabel(run.model)&&(onOpenEvolution||(run.model==="driven_two_level"&&onOpenRabi))&&
          <button type="button" className="run-open" aria-label={`Open ${run.model==="driven_two_level"?"Rabi":evolutionLabel(run.model)} evolution ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,onOpenEvolution?"evolution":"rabi")}>{opening===run.runId?"Opening…":`Open ${run.model==="driven_two_level"?"Rabi":evolutionLabel(run.model)} evolution`}</button>}
          {run.operation==="cavity"&&cavityLabel(run.model)&&onOpenCavity&&
          <button type="button" className="run-open" aria-label={`Open ${cavityLabel(run.model)} cavity ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,"cavity")}>{opening===run.runId?"Opening…":`Open ${cavityLabel(run.model)} cavity`}</button>}
          {run.operation==="lindblad"&&run.model==="open_jaynes_cummings"&&onOpenLindblad&&
          <button type="button" className="run-open" aria-label={`Open Lindblad dynamics ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,"lindblad")}>{opening===run.runId?"Opening…":"Open Lindblad dynamics"}</button>}
          {run.operation==="circuit"&&run.model==="transmon"&&onOpenCircuit&&
          <button type="button" className="run-open" aria-label={`Open Transmon circuit ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,"circuit")}>{opening===run.runId?"Opening…":"Open Transmon circuit"}</button>}
          {run.operation==="many_body"&&run.model==="ising_chain"&&onOpenManyBody&&
          <button type="button" className="run-open" aria-label={`Open Ising chain ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,"many_body")}>{opening===run.runId?"Opening…":"Open Ising chain"}</button>}
          {run.operation==="sweep"&&evolutionLabel(run.model)&&onOpenSweep&&
          <button type="button" className="run-open" aria-label={`Open ${evolutionLabel(run.model)} final-population sweep ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,"sweep")}>{opening===run.runId?"Opening…":`Open ${evolutionLabel(run.model)} final-population sweep`}</button>}
          {run.operation==="topology"&&(run.model==="ssh"||run.model==="qwz")&&onOpenTopology&&
          <button type="button" className="run-open" aria-label={`Open ${run.model.toUpperCase()} topology ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,"topology")}>{opening===run.runId?"Opening…":`Open ${run.model.toUpperCase()} topology`}</button>}
          {run.operation==="orbital"&&run.model==="hydrogenic"&&onOpenOrbital&&
          <button type="button" className="run-open" aria-label={`Open hydrogenic orbital ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,"orbital")}>{opening===run.runId?"Opening…":"Open hydrogenic orbital"}</button>}
          {(["oscillator","oscillator_evolve","oscillator_drive","oscillator_pulse","oscillator_damped","oscillator_parametric","oscillator_anharmonic"] as string[]).includes(run.operation)&&onOpenOscillator&&
          <button type="button" className="run-open" aria-label={`Open ${run.operation} ${run.runId}`} disabled={!!opening}
            onClick={()=>void openOne(run.runId,"oscillator")}>{opening===run.runId?"Opening…":`Open ${run.operation.replaceAll("_"," ")}`}</button>}
          {(["csv", "svg", "manifest"] as const).map(format =>
          <button type="button" key={format} aria-label={`Export ${format.toUpperCase()} ${run.runId}`} onClick={() => void exportOne(run.runId, format)}>{format.toUpperCase()}</button>)}</div>
        {inspection?.summary.runId===run.runId&&<div className="run-provenance" data-testid="run-provenance">
          <p className="eyebrow">QLAB-UI-7 / HASH-VERIFIED SOURCE RUN</p>
          <div className="run-provenance-grid">
            <div><strong>Stored input</strong><code>Job {inspection.job.jobId}</code><code>{inspection.job.schema} · {inspection.job.operation} · {inspection.job.engine}</code>
              <code>Model {inspection.job.model.type}</code><code>Job SHA-256 {inspection.hashes.job}</code></div>
            <div><strong>Stored environment</strong><code>Worker {inspection.provenance.workerVersion} · Python {inspection.provenance.pythonVersion}</code>
              <code>Engine {inspection.summary.engine} {inspection.summary.engineVersion}{"device" in inspection.engine&&inspection.engine.device?` · ${inspection.engine.device}`:""}</code>
              <code>Computed {inspection.provenance.computedAt} · {inspection.provenance.durationMs.toFixed(1)} ms</code></div>
            <div><strong>Result and lineage</strong><code>Result SHA-256 {inspection.hashes.result}</code>
              <code>Artifact SHA-256 {inspection.hashes.artifact??"inline result (no binary artifact)"}</code>
              <code>Parent {inspection.lineage?.parentRunId??"none"}</code>
              {inspection.lineage&&<><code>Parent job SHA-256 {inspection.lineage.parentJobSha256}</code>
                <code>Parent result SHA-256 {inspection.lineage.parentResultSha256}</code></>}</div>
          </div>
          <details><summary>Exact stored job JSON (model, solver and source)</summary><pre>{JSON.stringify(inspection.job,null,2)}</pre></details>
          <p>Source preset or Atlas revision is shown only if it was recorded in the job; older jobs may not contain one. Rerun changes only the job ID. Numerical results may differ across worker, engine, device or hardware versions.</p>
          {inspection.preflight.differences.length>0&&<div role="status"><strong>Environment differences</strong><ul>{inspection.preflight.differences.map(value=><li key={value}>{value}</li>)}</ul></div>}
          {inspection.preflight.reason&&<p role="status">Rerun unavailable: {inspection.preflight.reason}</p>}
          <button type="button" className="run-open" data-testid="rerun-saved" disabled={!inspection.preflight.ready||rerunning}
            onClick={()=>void rerunOne()}>{rerunning?"Running stored inputs…":"Re-run stored inputs as new run"}</button>
        </div>}
      </article>)}</div>}
  </section>;
}
