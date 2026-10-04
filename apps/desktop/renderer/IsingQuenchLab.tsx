import React,{useEffect,useState} from "react";
import type {QuantumBridge,RunSummary,WorkerStatus,WorkspaceSnapshot} from "../../../packages/contracts";
import {isIsingQuenchRequest,type IsingQuenchArtifact} from "../../../packages/contracts/ising-quench";
import {DynamicsFlow} from "./DynamicsFlow";

export function IsingQuenchLab({bridge,status,preferredRunId,restored,restoreEpoch,onSnapshot}:{bridge:QuantumBridge;status:WorkerStatus;preferredRunId:string|null;
  restored?:WorkspaceSnapshot["isingQuench"];restoreEpoch?:number;onSnapshot?:(draft:NonNullable<WorkspaceSnapshot["isingQuench"]>)=>void}){
  const [runs,setRuns]=useState<RunSummary[]>([]);
  const [runId,setRunId]=useState("");
  const [target,setTarget]=useState("1.2"),[duration,setDuration]=useState("10"),[samples,setSamples]=useState("51");
  const [artifact,setArtifact]=useState<IsingQuenchArtifact|null>(null);
  const [selected,setSelected]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const refresh=()=>void bridge.listRuns().then(items=>setRuns(items.filter(item=>item.operation==="many_body"&&item.model==="ising_chain"))).catch(cause=>setError(String(cause)));
  useEffect(refresh,[bridge]);
  useEffect(()=>{if(preferredRunId)setRunId(preferredRunId)},[preferredRunId]);
  useEffect(()=>{if(!restoreEpoch)return;setRunId(restored?.sourceRunId??"");setTarget(restored?.targetTransverse??"1.2");
    setDuration(restored?.duration??"10");setSamples(restored?.samples??"51");setArtifact(null);setSelected(0);setError("");},[restoreEpoch]);
  useEffect(()=>onSnapshot?.({sourceRunId:runId,targetTransverse:target,duration,samples}),[runId,target,duration,samples,onSnapshot]);
  const request={targetTransverse:Number(target),duration:Number(duration),samples:Number(samples)};
  const valid=target.trim()!==""&&duration.trim()!==""&&samples.trim()!==""&&isIsingQuenchRequest(request);
  const shown=artifact?.source.runId===runId&&artifact.targetTransverse===request.targetTransverse&&
    artifact.duration===request.duration&&artifact.samples===request.samples?artifact:null;
  const row=shown?.rows[selected]??null;
  async function run(){
    if(!runId||!valid||busy)return;
    setBusy(true);setError("");setArtifact(null);setSelected(0);
    try{const result=await bridge.getIsingQuench(runId,request);setArtifact(result)}
    catch(cause){setError(cause instanceof Error?cause.message:String(cause))}
    finally{setBusy(false)}
  }
  return <div className="cavity-lab" data-testid="ising-quench-lab">
    <DynamicsFlow initial="verified Ising ground state" hamiltonian="sudden transverse-field change" recorded="site ⟨σᶻ⟩ + norm + energy"/>
    <section className="hamiltonian-card"><div><p className="eyebrow">QVIS-020 / ISING DYNAMICS</p>
      <div className="formula">H(t≥0) = −J Σσᶻᵢσᶻᵢ₊₁ − hₓ(final) Σσˣᵢ − hᶻ Σσᶻᵢ</div></div>
      <div className="model-convention"><span>SUDDEN QUENCH</span><p>Verified ground state → finite-time evolution</p></div></section>
    <section className="panel dynamics-settings"><div><p className="eyebrow">INITIAL STATE → HAMILTONIAN → EVOLUTION → OBSERVABLES</p>
      <h2>Watch a finite spin chain respond.</h2><p>Select a saved, verified Ising run as the initial ground state. Change only the transverse field at t = 0. The source run is unchanged; every recorded row belongs to this bounded quench artifact.</p></div>
      <div className="dynamics-fields">
        <label>Initial saved Ising run<select aria-label="Initial Ising run" value={runId} onChange={event=>{setRunId(event.target.value);setArtifact(null)}}>
          <option value="">Choose a saved run</option>{runs.map(item=><option key={item.runId} value={item.runId}>{item.runId} · {item.engine} · {item.computedAt}</option>)}
          {runId&&!runs.some(item=>item.runId===runId)&&<option value={runId}>{runId} · selected lab run</option>}
        </select></label>
        <label>Final transverse field hₓ<input aria-label="Final Ising transverse field" type="number" min="-10" max="10" step="0.1" value={target} onChange={event=>setTarget(event.target.value)}/></label>
        <label>Duration<input aria-label="Ising quench duration" type="number" min="0.01" max="20" step="0.1" value={duration} onChange={event=>setDuration(event.target.value)}/></label>
        <label>Recorded samples<input aria-label="Ising quench samples" type="number" min="5" max="101" step="1" value={samples} onChange={event=>setSamples(event.target.value)}/></label>
      </div>
      <div className="dynamics-actions"><button type="button" onClick={refresh}>Refresh saved runs</button>
        <button type="button" className="run-button" data-testid="run-ising-quench" disabled={!runId||!valid||busy||status.state!=="READY"||!status.capabilities?.engines.native.available} onClick={()=>void run()}>{busy?"Calculating…":"▶ Calculate / reopen quench"}</button></div>
      {!valid&&<p className="validation">Use a final field within ±10, duration (0, 20], and 5–101 samples.</p>}
      {error&&<p className="error-message" role="alert" data-testid="ising-quench-error">{error}</p>}
    </section>
    {shown&&row&&<section className="panel cavity-result" data-testid="ising-quench-result">
      <div className="panel-heading"><div><p className="eyebrow">HASH-VERIFIED, RUN-BOUND EVOLUTION</p><h2>Site magnetization in time</h2></div>
        <span className="result-badge">{shown.samples} STORED ROWS</span></div>
      <p>Initial hₓ = {shown.initial.transverse} → final hₓ = {shown.targetTransverse} · {shown.initial.sites} sites · {shown.initial.boundary} boundary · initial source {shown.source.runId}</p>
      <div className="cavity-metrics"><div><span>NORM DRIFT / MAX</span><strong>{shown.maximumNormDrift.toExponential(2)}</strong></div>
        <div><span>TARGET ENERGY DRIFT / MAX</span><strong>{shown.maximumEnergyDrift.toExponential(2)}</strong></div>
        <div><span>ENGINE</span><strong>{shown.provenance.engine}</strong><small>source {shown.provenance.sourceEngine}</small></div></div>
      <div className="sweep-visual"><p className="eyebrow">STORED ⟨σᶻᵢ⟩ / EACH SITE</p>
        <div className="quench-legend">{Array.from({length:shown.initial.sites},(_,site)=><span key={site} style={{color:`hsl(${165+site*36} 58% 67%)`}}>● Site {site+1}</span>)}</div>
        <svg viewBox="0 0 800 260" role="img" aria-label="Recorded Ising quench site magnetization trajectories" data-testid="ising-quench-plot"
          onClick={event=>{const bounds=event.currentTarget.getBoundingClientRect();const x=(event.clientX-bounds.left)/bounds.width*800;
            setSelected(Math.max(0,Math.min(shown.samples-1,Math.round((x-35)/745*(shown.samples-1)))));}}>
          <path d="M35 20 V230 H780 M35 125 H780" stroke="#506575" fill="none"/>
          <text x="7" y="25" fill="#9cb6bf" fontSize="11">+1</text><text x="12" y="128" fill="#9cb6bf" fontSize="11">0</text><text x="7" y="231" fill="#9cb6bf" fontSize="11">−1</text>
          <text x="35" y="249" fill="#9cb6bf" fontSize="11">0</text><text x="754" y="249" fill="#9cb6bf" fontSize="11">t = {shown.duration}</text>
          {Array.from({length:shown.initial.sites},(_,site)=><polyline key={site} fill="none" stroke={`hsl(${165+site*36} 58% 67%)`} strokeWidth="2.5"
            points={shown.rows.map((sample,index)=>`${35+index*745/(shown.samples-1)},${125-sample.siteMagnetization[site]*92}`).join(" ")}/>)}
          <line x1={35+selected*745/(shown.samples-1)} x2={35+selected*745/(shown.samples-1)} y1="20" y2="230" stroke="#e9bc79" strokeDasharray="5 5"/>
          <rect x="35" y="20" width="745" height="210" fill="transparent"/>
        </svg></div>
      <div className="dynamics-timeline"><div className="timeline-heading"><span className="eyebrow">RUN-SCOPED RECORDED TIME</span><strong>t = {row.time.toFixed(4)}</strong></div>
        <input aria-label="Ising quench time cursor" type="range" min="0" max={shown.samples-1} value={selected} onChange={event=>setSelected(Number(event.target.value))}/></div>
      <div className="many-magnetization" data-testid="ising-quench-selected-row">{row.siteMagnetization.map((value,index)=><div key={index}><span>Site {index+1}</span>
        <meter min={-1} max={1} value={value}/><strong>{value.toFixed(5)}</strong></div>)}</div>
      <p>Selected row {selected} · norm {row.norm.toFixed(8)} · target-H energy {row.energy.toFixed(8)}. No full evolving state vector or thermodynamic-limit claim is stored.</p>
      <div className="plot-caption"><span>Source hashes {shown.source.jobSha256.slice(0,12)} / {shown.source.resultSha256.slice(0,12)}</span><span>{shown.provenance.computedAt} · worker {shown.provenance.workerVersion}</span></div>
    </section>}
  </div>;
}
