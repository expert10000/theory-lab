import React, { useEffect, useRef, useState } from "react";
import type { DampedOscillatorResult, EvolutionProgress, QuantumBridge, WorkerStatus } from "../../../packages/contracts";
import { checkDampedOscillatorData, dampedOscillatorJob, DAMPED_OSCILLATOR_DEFAULTS, type DampedOscillatorDraft } from "../../../packages/models/oscillator-damped";

type Computed={result:DampedOscillatorResult;data:Float64Array};
export function DampedOscillator({bridge,status,restored,restoreEpoch,onSnapshot}:{
  bridge:QuantumBridge;status:WorkerStatus;restored?:DampedOscillatorDraft;restoreEpoch?:number;
  onSnapshot?:(value:DampedOscillatorDraft)=>void;
}) {
  const [draft,setDraft]=useState<DampedOscillatorDraft>(DAMPED_OSCILLATOR_DEFAULTS);
  const [computed,setComputed]=useState<Computed|null>(null);
  const [comparison,setComparison]=useState<{kind:string;maxNumber:number;maxPurity:number;projectionDifference:number}|null>(null);
  const [error,setError]=useState(""),[running,setRunning]=useState(false),[progress,setProgress]=useState<EvolutionProgress|null>(null);
  const active=useRef<string|null>(null),generation=useRef(0);
  useEffect(()=>bridge.onProgress(p=>{if(p.jobId===active.current)setProgress(p);}),[bridge]);
  useEffect(()=>()=>{generation.current++;if(active.current)void bridge.cancel(active.current).catch(()=>{});},[bridge]);
  useEffect(()=>{if(restoreEpoch){generation.current++;if(active.current)void bridge.cancel(active.current).catch(()=>{});setDraft(restored??DAMPED_OSCILLATOR_DEFAULTS);setComputed(null);setComparison(null);setError("");}},[restoreEpoch]);
  useEffect(()=>onSnapshot?.(draft),[draft,onSnapshot]);
  let preview:ReturnType<typeof dampedOscillatorJob>|null=null;
  try {preview=dampedOscillatorJob("preview",draft,draft.engine==="compare"?"qutip":draft.engine);}catch{/* input help below */}
  const c=status.capabilities;
  const ready=status.state==="READY"&&!!c?.operations.includes("oscillator_damped")&&
    (draft.engine==="compare"?!!c.engines.qutip.available&&!!c.engines.native.available:!!c.engines[draft.engine].available);
  const stale=!!computed&&(!preview||computed.result.engine.name!==(draft.engine==="compare"?"qutip":draft.engine)||
    JSON.stringify(computed.result.model)!==JSON.stringify(preview.model)||
    JSON.stringify(computed.result.initialState)!==JSON.stringify(preview.initialState)||
    JSON.stringify(computed.result.solver)!==JSON.stringify(preview.solver));
  async function calculate(job:ReturnType<typeof dampedOscillatorJob>):Promise<Computed>{
    active.current=job.jobId;
    const result=await bridge.oscillatorDamped(job);
    const data=checkDampedOscillatorData(result,await bridge.readData(job.jobId));
    return {result,data};
  }
  async function run(kind:"normal"|"cutoff") {
    if(!preview||!ready||running||kind==="cutoff"&&Number(draft.cutoff)>12)return;
    const epoch=++generation.current;
    setRunning(true);setError("");setProgress(null);
    try {
      const engine=draft.engine==="compare"?"qutip":draft.engine;
      const first=await calculate(dampedOscillatorJob(`job-${crypto.randomUUID()}`,draft,engine));
      if(epoch!==generation.current)return;
      let nextComparison:null|{kind:string;maxNumber:number;maxPurity:number;projectionDifference:number}=null;
      if(kind==="cutoff"||draft.engine==="compare") {
        const other=kind==="cutoff"?
          dampedOscillatorJob(`job-${crypto.randomUUID()}`,{...draft,cutoff:String(Number(draft.cutoff)+4)},engine):
          dampedOscillatorJob(`job-${crypto.randomUUID()}`,draft,"native");
        const second=await calculate(other);
        if(epoch!==generation.current)return;
        const a=first.data,b=second.data,as=first.result.data.columns.length,bs=second.result.data.columns.length;
        let maxNumber=0,maxPurity=0;
        for(let row=0;row<first.result.data.rows;row++) {
          maxNumber=Math.max(maxNumber,Math.abs(a[row*as+1]-b[row*bs+1]));
          maxPurity=Math.max(maxPurity,Math.abs(a[row*as+2]-b[row*bs+2]));
        }
        nextComparison={kind:kind==="cutoff"?`N ${draft.cutoff} → ${Number(draft.cutoff)+4} (${engine})`:"QuTiP ↔ native",maxNumber,maxPurity,
          projectionDifference:Math.abs(first.result.analysis.projectionProbability-second.result.analysis.projectionProbability)};
      }
      setComputed(first);setComparison(nextComparison);
    }catch(e){if(epoch===generation.current)setError(e instanceof Error?e.message:String(e));}
    finally{if(epoch===generation.current){active.current=null;setRunning(false);setProgress(null);}}
  }
  const fields=[["omega","Frequency ω",.1,5,.1],["cutoff","Fock cutoff",8,16,1],["loss","Loss κ",0,2,.05],
    ["thermalOccupation","Bath occupation n̄",0,2,.1],["start","Start time",-100,100,1],["stop","End time",-100,100,1],
    ["samples","Samples",3,201,1]] as const;
  const plotted=computed?.data,cols=computed?.result.data.columns.length??0,rows=computed?.result.data.rows??0;
  const series=(col:number,color:string)=>{
    if(!plotted)return null;
    const max=Math.max(1,...Array.from({length:rows},(_,i)=>plotted[i*cols+col]));
    const points=Array.from({length:rows},(_,i)=>`${50+680*i/(rows-1)},${220-180*plotted[i*cols+col]/max}`).join(" ");
    return <polyline points={points} fill="none" stroke={color} strokeWidth="2.5"/>;
  };
  return <div data-testid="damped-oscillator">
    <section className="hamiltonian-card"><div><p className="eyebrow">BOUNDED OPEN OSCILLATOR / D1-014–016</p>
      <div className="formula">H = ω(N + ½) · L₋ = √[κ(n̄+1)] a · L₊ = √[κn̄] a†</div></div>
      <div className="model-convention"><span>FINITE FOCK BASIS · ℏ=1</span><p>Number or projected coherent initial state</p></div></section>
    <section className="panel dynamics-settings"><div><p className="eyebrow">THERMAL LINDBLAD DYNAMICS</p><h2>Relaxation into a bath.</h2>
      <p>Independent QuTiP master solver and native SciPy density-matrix integration. The infinite-space thermal reference is diagnostic, not an exact finite-cutoff claim.</p></div>
      <div className="dynamics-fields">
        {fields.map(([key,label,min,max,step])=><label key={key}>{label}<input aria-label={`Damped ${key}`} type="number" min={min} max={max} step={step}
          value={draft[key]} disabled={running} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))}/></label>)}
        <label>Initial state<select aria-label="Damped initial state" value={draft.initial} disabled={running}
          onChange={e=>setDraft(d=>({...d,initial:e.target.value as DampedOscillatorDraft["initial"]}))}>
          <option value="fock">Number state</option><option value="coherent">Projected coherent</option></select></label>
        {draft.initial==="fock"?<label>Number n<input aria-label="Damped index" type="number" min="0" max="10" step="1" value={draft.index} disabled={running}
          onChange={e=>setDraft(d=>({...d,index:e.target.value}))}/></label>:
          <>{(["alphaRe","alphaIm"] as const).map(key=><label key={key}>{key}<input aria-label={`Damped ${key}`} type="number" min="-2" max="2" step=".1" value={draft[key]} disabled={running}
            onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))}/></label>)}</>}
        <label>Engine<select aria-label="Damped engine" value={draft.engine} disabled={running}
          onChange={e=>setDraft(d=>({...d,engine:e.target.value as DampedOscillatorDraft["engine"]}))}>
          <option value="qutip" disabled={!c?.engines.qutip.available}>QuTiP</option><option value="native" disabled={!c?.engines.native.available}>Native · SciPy</option>
          <option value="compare" disabled={!c?.engines.qutip.available||!c?.engines.native.available}>Compare engines</option></select></label>
      </div><div className="dynamics-actions">
        <button className="run-button" data-testid="run-damped" disabled={!preview||!ready||running} onClick={()=>void run("normal")}>▶ Run damped oscillator</button>
        <button className="workspace-button" data-testid="damped-cutoff" disabled={!preview||!ready||running||Number(draft.cutoff)>12} onClick={()=>void run("cutoff")}>Check N → N+4</button>
        {running&&<button className="workspace-button" onClick={()=>{if(active.current)void bridge.cancel(active.current);}}>Cancel</button>}
        <span>{running?`RUNNING ${progress?Math.round(100*progress.fraction):0}%`:"READY"}</span></div>
      {!preview&&<p className="validation">N 8–16, κ 0–2, n̄ 0–2, duration ≤20, ≤201 samples. Cutoff comparison requires N≤12.</p>}
      {status.state==="READY"&&!ready&&<p className="validation">Selected worker engine is unavailable.</p>}</section>
    {error&&<div className="error-message" role="alert">{error}{computed?" · Previous verified run retained.":""}</div>}
    {computed&&<section className="panel cavity-result" data-testid="damped-result"><div className="panel-heading"><div><p className="eyebrow">{computed.result.engine.name.toUpperCase()} / THERMAL BATH</p><h2>Verified density-matrix evolution</h2></div>
      <span className={`result-badge ${stale?"stale":""}`}>{stale?"OUT OF DATE":"COMPUTED"}</span></div>
      <div className="cavity-metrics">
        <div><span>FINAL ⟨N⟩</span><strong>{plotted![(rows-1)*cols+1].toFixed(6)}</strong></div>
        <div><span>FINAL PURITY</span><strong>{plotted![(rows-1)*cols+2].toFixed(6)}</strong></div>
        <div><span>MAX TRACE ERROR</span><strong>{computed.result.analysis.maxTraceError.toExponential(2)}</strong></div>
        <div><span>MIN EIGENVALUE</span><strong>{computed.result.analysis.minimumEigenvalue.toExponential(2)}</strong></div>
        <div><span>BOUNDARY OCCUPATION</span><strong>{computed.result.analysis.maxBoundaryOccupation.toExponential(2)}</strong></div>
        <div><span>FINAL COHERENCE L₁</span><strong>{plotted![(rows-1)*cols+5].toFixed(6)}</strong></div>
      </div><div className="sweep-visual"><p className="eyebrow">OCCUPATION / PURITY · EACH CURVE SCALED SEPARATELY</p>
        <svg viewBox="0 0 800 260" role="img" aria-label="Damped oscillator number and purity curves"><path d="M50 35 V220 H730" stroke="#506575" fill="none"/>
          {series(1,"#79d9c1")}{series(2,"#edae8f")}</svg><p>Green: mean occupation · orange: purity. Horizontal axis: time.</p></div>
      <p>Finite-cutoff reference error: {computed.result.analysis.maxNumberReferenceError.toExponential(2)}. Full density matrix and provenance are saved with the run.</p>
      {comparison&&<p data-testid="damped-comparison">{comparison.kind}: max Δ⟨N⟩ {comparison.maxNumber.toExponential(2)}, max Δpurity {comparison.maxPurity.toExponential(2)}, initial projection difference {comparison.projectionDifference.toExponential(2)}. A cutoff check is evidence of sensitivity, not proof of infinite-basis convergence.</p>}
    </section>}
  </div>;
}
