import React, { useEffect, useRef, useState } from "react";
import type { ManyBodyEngineName, ManyBodyResult, QuantumBridge, WorkerStatus,
  WorkspaceSnapshot } from "../../../packages/contracts";
import type {IsingStateArtifact} from "../../../packages/contracts/ising-state";
import { MANY_BODY_DEFAULTS, manyBodyJob } from "../../../packages/models/many_body";
import { selectedManyBodyItem, type ManyBodySelection, type ManyBodyRunContext } from "./many-body-selection";
import {IsingStatePanel} from "./IsingStatePanel";

type Draft = NonNullable<WorkspaceSnapshot["manyBody"]>;

function ManyBodyFigure({ result, selection, onSelect }: { result: ManyBodyResult; selection:ManyBodySelection|null; onSelect:(kind:ManyBodySelection["kind"],index:number)=>void }) {
  const energies = result.spectrum.lowEnergies;
  const bottom = energies[0], span = Math.max(1e-9, energies[energies.length - 1] - bottom);
  return <div className="many-figures">
    <div className="sweep-visual"><p className="eyebrow">LOW-ENERGY SPECTRUM / NORMALIZED UNITS</p>
      <svg viewBox="0 0 800 250" role="img" aria-label="Many-body low-energy spectrum">
        <path d="M45 20 V215 H760" stroke="#506575" fill="none"/>
        {energies.map((energy, index) => {
          const x = 65 + index * 690 / Math.max(1, energies.length - 1);
          const y = 195 - (energy - bottom) * 155 / span;
          return <g key={index} data-testid={`many-body-level-mark-${index}`}><line x1={x - 20} x2={x + 20} y1={y} y2={y} stroke={selection?.kind==="energy_level"&&selection.index===index?"#f2b36f":"#79d9c1"} strokeWidth={selection?.kind==="energy_level"&&selection.index===index?"6":"4"}/>
            <text x={x} y="230" textAnchor="middle" fill="#acc1ca" fontSize="11">E{index}</text>
            <title>{`E${index} = ${energy.toFixed(8)}`}</title></g>;
        })}
      </svg>
      <div className="state-view-levels" aria-label="Stored Ising-chain levels">{energies.map((energy,index)=><button type="button" key={index} aria-label={`Select Ising E${index}`} aria-pressed={selection?.kind==="energy_level"&&selection.index===index} onClick={()=>onSelect("energy_level",index)}>E{index} · {energy.toFixed(4)}</button>)}</div>
    </div>
    <div className="sweep-visual"><p className="eyebrow">GROUND-STATE SITE MAGNETIZATION / ⟨σᶻᵢ⟩</p>
      <div className="many-magnetization">{result.groundState.siteMagnetization.map((value, index) =>
        <div key={index}><button type="button" className="many-site-button" aria-label={`Select Ising site ${index+1}`} aria-pressed={selection?.kind==="site_magnetization"&&selection.index===index} onClick={()=>onSelect("site_magnetization",index)}>Site {index + 1}</button><meter min={-1} max={1} low={-0.3} high={0.3} optimum={1} value={value}/><strong data-testid={`many-body-site-value-${index}`}>{value.toFixed(4)}</strong></div>)}</div>
    </div>
  </div>;
}

export function ManyBodyLab({ bridge, status, restored, restoreEpoch, atlasDraft, atlasEpoch, onSnapshot, onManyBodyContext, reopenedManyBody }: {
  bridge: QuantumBridge; status: WorkerStatus; restored?: Draft | null; restoreEpoch?: number;
  atlasDraft?: Draft | null; atlasEpoch?: number;
  onSnapshot?: (value: Draft) => void;
  onManyBodyContext?:(context:ManyBodyRunContext|null)=>void;
  reopenedManyBody?:{epoch:number;result:ManyBodyResult}|null;
}) {
  const [draft, setDraft] = useState<Draft>(MANY_BODY_DEFAULTS);
  const [result, setResult] = useState<ManyBodyResult | null>(null);
  const [reference, setReference] = useState<ManyBodyResult | null>(null);
  const [resultMode, setResultMode] = useState<Draft["engine"] | null>(null);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState("READY TO CALCULATE");
  const [error, setError] = useState("");
  const [selection,setSelection]=useState<ManyBodySelection|null>(null);
  const [stateArtifact,setStateArtifact]=useState<IsingStateArtifact|null>(null);
  const [stateLoading,setStateLoading]=useState(false);
  const [stateError,setStateError]=useState("");
  const appliedReopenEpoch=useRef<number|null>(null);
  const runEpoch=useRef(0);
  useEffect(() => {
    if (!restoreEpoch) return;
    runEpoch.current++;setRunning(false);
    setDraft(restored ?? MANY_BODY_DEFAULTS);
    setResult(null); setReference(null); setOutcome("WORKSPACE RESTORED");
    setSelection(null);setStateArtifact(null);setStateError("");setStateLoading(false);onManyBodyContext?.(null);
  }, [restoreEpoch,onManyBodyContext]);
  useEffect(() => {
    if (!atlasEpoch || !atlasDraft) return;
    runEpoch.current++;setRunning(false);
    setDraft(atlasDraft); setResult(null); setReference(null); setOutcome("ATLAS BINDING LOADED");
    setSelection(null);setStateArtifact(null);setStateError("");setStateLoading(false);onManyBodyContext?.(null);
  }, [atlasEpoch,onManyBodyContext]);
  useEffect(()=>{
    if(!reopenedManyBody||appliedReopenEpoch.current===reopenedManyBody.epoch)return;
    const stored=reopenedManyBody.result,p=stored.model.parameters;
    runEpoch.current++;setRunning(false);appliedReopenEpoch.current=reopenedManyBody.epoch;
    setDraft({sites:String(p.sites),interaction:String(p.interaction),transverse:String(p.transverse),longitudinal:String(p.longitudinal),boundary:p.boundary,engine:stored.engine.name});
    setResult(stored);setReference(null);setResultMode(stored.engine.name);setSelection(null);
    setStateArtifact(null);setStateError("");setStateLoading(false);
    setError("");setOutcome("SAVED RUN OPENED");
  },[reopenedManyBody?.epoch]);
  useEffect(() => onSnapshot?.(draft), [draft, onSnapshot]);
  function change<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(current => ({ ...current, [key]: value })); }
  let preview: ReturnType<typeof manyBodyJob> | null = null;
  try { preview = manyBodyJob("preview", draft, draft.boundary, draft.engine === "compare" ? "quspin" : draft.engine); }
  catch { /* Contextual validation is shown below. */ }
  const capabilities = status.capabilities;
  const ready = status.state === "READY" && !!capabilities?.operations.includes("many_body") &&
    (draft.engine === "compare" ? !!capabilities.engines.quspin?.available && capabilities.engines.native.available
      : !!capabilities.engines[draft.engine]?.available);
  const stale = result && (!preview || resultMode !== draft.engine ||
    JSON.stringify(result.model) !== JSON.stringify(preview.model));
  const item=selectedManyBodyItem(selection,result);
  useEffect(()=>{
    onManyBodyContext?.(result?{result,selection:item?selection:null,item,stale:!!stale,stateArtifact}:null);
  },[result,selection,item?.kind,item?.index,stale,stateArtifact,onManyBodyContext]);
  async function inspectState(){
    if(!result||stateLoading)return;
    const epoch=runEpoch.current,runId=result.runId;
    setStateLoading(true);setStateError("");
    try{
      const state=await bridge.getIsingState(runId);
      if(runEpoch.current!==epoch)return;
      if(state.source.runId!==runId)throw new Error("State artifact source run mismatch");
      setStateArtifact(state);
    }catch(exception){
      if(runEpoch.current===epoch)setStateError(exception instanceof Error?exception.message:String(exception));
    }finally{if(runEpoch.current===epoch)setStateLoading(false)}
  }
  async function run() {
    if (!preview || !ready || running) return;
    const epoch=++runEpoch.current;
    setRunning(true); setError(""); setOutcome("RUNNING");setResult(null);setReference(null);setSelection(null);
    setStateArtifact(null);setStateError("");setStateLoading(false);onManyBodyContext?.(null);
    try {
      const first = await bridge.manyBody({ ...preview, jobId: `job-${crypto.randomUUID()}` });
      if(runEpoch.current!==epoch)return;
      let second: ManyBodyResult | null = null;
      if (draft.engine === "compare") second = await bridge.manyBody(manyBodyJob(
        `job-${crypto.randomUUID()}`, draft, draft.boundary, "native"));
      if(runEpoch.current!==epoch)return;
      setResult(first); setReference(second); setResultMode(draft.engine); setOutcome("COMPLETE");
    } catch (exception) {
      if(runEpoch.current!==epoch)return;
      setOutcome("FAILED"); setError(exception instanceof Error ? exception.message : String(exception));
    } finally { if(runEpoch.current===epoch)setRunning(false); }
  }
  const comparison = result && reference ? {
    energy: Math.max(...result.spectrum.lowEnergies.map((value, index) => Math.abs(value - reference.spectrum.lowEnergies[index]))),
    magnetization: Math.max(...result.groundState.siteMagnetization.map((value, index) => Math.abs(value - reference.groundState.siteMagnetization[index]))),
    entropy: Math.abs(result.groundState.halfChainEntropy - reference.groundState.halfChainEntropy),
  } : null;
  return <div className="cavity-lab" data-testid="many-body-lab">
    <section className="hamiltonian-card"><div><p className="eyebrow">MANY-BODY LABORATORY / QLAB-021</p>
      <div className="formula">H = −J Σσᶻᵢσᶻᵢ₊₁ − hₓ Σσˣᵢ − hᶻ Σσᶻᵢ</div></div>
      <div className="model-convention"><span>FINITE SPIN CHAIN</span><p>2–8 spin-½ sites · ħ = 1</p></div></section>
    <section className="panel dynamics-settings"><div><p className="eyebrow">ISING-CHAIN JOB</p><h2>From one qubit to a chain.</h2>
      <p>Inspect a finite chain in the full 2ᴺ-dimensional basis. Open and periodic boundaries share the same Pauli convention. The gap is finite-size, not a thermodynamic phase transition.</p></div>
      <div className="dynamics-fields">
        <label>Sites N<input aria-label="Many-body sites" type="number" min="2" max="8" step="1" value={draft.sites} disabled={running} onChange={event => change("sites", event.target.value)}/></label>
        <label>Interaction J<input aria-label="Many-body interaction" type="number" min="-10" max="10" step="0.1" value={draft.interaction} disabled={running} onChange={event => change("interaction", event.target.value)}/></label>
        <label>Transverse field hₓ<input aria-label="Many-body transverse field" type="number" min="-10" max="10" step="0.1" value={draft.transverse} disabled={running} onChange={event => change("transverse", event.target.value)}/></label>
        <label>Longitudinal field hᶻ<input aria-label="Many-body longitudinal field" type="number" min="-10" max="10" step="0.1" value={draft.longitudinal} disabled={running} onChange={event => change("longitudinal", event.target.value)}/></label>
        <label>Boundary<select aria-label="Many-body boundary" value={draft.boundary} disabled={running} onChange={event => change("boundary", event.target.value as Draft["boundary"])}><option value="open">Open chain</option><option value="periodic">Periodic ring</option></select></label>
        <label>Engine<select aria-label="Many-body engine" value={draft.engine} disabled={running} onChange={event => change("engine", event.target.value as Draft["engine"])}><option value="native">Native · NumPy</option><option value="quspin" disabled={!capabilities?.engines.quspin?.available}>QuSpin</option><option value="compare" disabled={!capabilities?.engines.quspin?.available}>Compare QuSpin / Native</option></select></label>
      </div>
      <div className="dynamics-actions"><button className="run-button" data-testid="run-many-body" disabled={!preview || !ready || running} onClick={() => void run()}>▶ Run chain</button><span data-testid="many-body-state">{outcome}</span></div>
      {!preview && <p className="validation">Enter 2–8 sites and finite fields/coupling within ±10.</p>}
      {status.state === "READY" && !ready && <p className="validation">Selected engine unavailable. Install QuSpin and restart the worker, or use Native.</p>}
    </section>
    {error && <div className="error-message" role="alert">{error}</div>}
    {result && <section className="panel cavity-result" data-testid="many-body-result">
      <div className="panel-heading"><div><p className="eyebrow">FINITE-CHAIN RESULT / {result.engine.name.toUpperCase()}</p><h2>Low spectrum & ground state</h2></div>
        <span className={`result-badge ${stale ? "stale" : ""}`}>{stale ? "OUT OF DATE" : `${2 ** result.model.parameters.sites} STATES`}</span></div>
      <div className="cavity-metrics"><div><span>FINITE-SIZE GAP</span><strong data-testid="many-body-gap">{result.spectrum.gap.toFixed(6)}</strong></div>
        <div><span>GROUND ENERGY</span><strong>{result.spectrum.lowEnergies[0].toFixed(6)}</strong></div>
        <div><span>HALF-CHAIN ENTROPY</span><strong data-testid="many-body-entropy">{result.groundState.halfChainEntropy.toFixed(6)}</strong><small>natural-log von Neumann</small></div></div>
      {comparison && <div className="comparison-report" data-testid="many-body-compare"><h3>QuSpin versus Native</h3><p>Max |ΔE| {comparison.energy.toExponential(3)} · max |Δ⟨σᶻ⟩| {comparison.magnetization.toExponential(3)} · |ΔS| {comparison.entropy.toExponential(3)}</p></div>}
      <ManyBodyFigure result={result} selection={item?selection:null} onSelect={(kind,index)=>setSelection({kind,runId:result.runId,index})}/>
      <div className="dynamics-actions"><button type="button" className="run-button" data-testid="inspect-ising-state"
        disabled={stateLoading} onClick={()=>void inspectState()}>{stateLoading?"Inspecting saved state…":stateArtifact?"Reopen verified state view":"Inspect saved ground state"}</button>
        <span>Run-bound, bounded 2–8-site state summary</span></div>
      {stateError&&<p className="error-message" role="alert" data-testid="ising-state-error">{stateError}</p>}
      {stateArtifact&&<IsingStatePanel state={stateArtifact} selectedSite={item?.kind==="site_magnetization"?item.index:null}
        onSelectSite={index=>setSelection({kind:"site_magnetization",runId:result.runId,index})}/>}
      <div className="plot-caption"><span>{result.engine.name} {result.engine.version} · {result.provenance.durationMs.toFixed(1)} ms</span><span>Full basis · finite chain · saved run</span></div>
    </section>}
  </div>;
}
