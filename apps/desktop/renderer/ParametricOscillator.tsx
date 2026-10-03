import React,{useEffect,useRef,useState} from "react";
import type {EvolutionProgress,ParametricOscillatorResult,QuantumBridge,WorkerStatus} from "../../../packages/contracts";
import {checkParametricData,PARAMETRIC_DEFAULTS,parametricOscillatorJob,parametricReference,type ParametricOscillatorDraft} from "../../../packages/models/oscillator-parametric";
import {selectedOscillatorItem,type OscillatorRunContext} from "./oscillator-selection";

type Computed={result:ParametricOscillatorResult;data:Float64Array};
export function ParametricOscillator({bridge,status,restored,restoreEpoch,onSnapshot,atlasDraft,atlasEpoch,onRunContext,reopenedRun}:{
  bridge:QuantumBridge;status:WorkerStatus;restored?:ParametricOscillatorDraft;restoreEpoch?:number;
  onSnapshot?:(draft:ParametricOscillatorDraft)=>void;atlasDraft?:ParametricOscillatorDraft;atlasEpoch?:number;
  onRunContext?:(context:OscillatorRunContext|null)=>void;
  reopenedRun?:{epoch:number;result:ParametricOscillatorResult;data:Uint8Array}|null;
}){
  const [draft,setDraft]=useState<ParametricOscillatorDraft>(PARAMETRIC_DEFAULTS),[computed,setComputed]=useState<Computed|null>(null);
  const [comparison,setComparison]=useState<{kind:string;occupation:number;qVariance:number;pVariance:number}|null>(null);
  const [running,setRunning]=useState(false),[error,setError]=useState(""),[progress,setProgress]=useState<EvolutionProgress|null>(null);
  const [selected,setSelected]=useState(0);
  const active=useRef<string|null>(null),generation=useRef(0),appliedReopen=useRef<number|null>(null);
  useEffect(()=>bridge.onProgress(p=>{if(active.current===p.jobId)setProgress(p);}),[bridge]);
  useEffect(()=>()=>{generation.current++;if(active.current)void bridge.cancel(active.current).catch(()=>{});},[bridge]);
  useEffect(()=>{if(restoreEpoch){generation.current++;if(active.current)void bridge.cancel(active.current).catch(()=>{});
    setDraft(restored??PARAMETRIC_DEFAULTS);setComputed(null);setSelected(0);setComparison(null);setError("");}},[restoreEpoch]);
  useEffect(()=>{if(atlasEpoch&&atlasDraft){generation.current++;if(active.current)void bridge.cancel(active.current).catch(()=>{});
    setDraft(atlasDraft);setComputed(null);setSelected(0);setComparison(null);setError("");}},[atlasEpoch]);
  useEffect(()=>{
    if(!reopenedRun||appliedReopen.current===reopenedRun.epoch)return;
    const saved=reopenedRun.result,p=saved.model.parameters,s=saved.solver;
    generation.current++;if(active.current)void bridge.cancel(active.current).catch(()=>{});
    appliedReopen.current=reopenedRun.epoch;setRunning(false);
    setDraft({omega:String(p.omega),lambdaRe:String(p.lambdaRe),lambdaIm:String(p.lambdaIm),cutoff:String(p.cutoff),
      start:String(s.tStart),stop:String(s.tStop),samples:String(s.samples),engine:saved.engine.name});
    setComputed({result:saved,data:checkParametricData(saved,reopenedRun.data)});setSelected(0);setComparison(null);setError("");
  },[reopenedRun?.epoch,bridge]);
  useEffect(()=>onSnapshot?.(draft),[draft,onSnapshot]);
  let preview:ReturnType<typeof parametricOscillatorJob>|null=null;
  try{preview=parametricOscillatorJob("preview",draft,draft.engine==="compare"?"qutip":draft.engine);}catch{/* bounded form feedback below */}
  const c=status.capabilities,ready=status.state==="READY"&&!!c?.operations.includes("oscillator_parametric")&&
    (draft.engine==="compare"?!!c.engines.qutip.available&&!!c.engines.native.available:!!c.engines[draft.engine].available);
  const stale=!!computed&&(!preview||computed.result.engine.name!==(draft.engine==="compare"?"qutip":draft.engine)||
    JSON.stringify(computed.result.model)!==JSON.stringify(preview.model)||JSON.stringify(computed.result.solver)!==JSON.stringify(preview.solver));
  const selection=computed?{kind:"time" as const,runId:computed.result.runId,index:selected}:null;
  const item=selectedOscillatorItem(selection,computed?.result??null,computed?.data??null);
  useEffect(()=>onRunContext?.(computed?{result:computed.result,selection:item?selection:null,item,stale}:null),
    [computed,selected,stale,onRunContext]);
  async function calculate(job:ReturnType<typeof parametricOscillatorJob>):Promise<Computed>{
    active.current=job.jobId;
    const result=await bridge.oscillatorParametric(job);
    const data=checkParametricData(result,await bridge.readData(job.jobId));
    return {result,data};
  }
  async function run(study:boolean){
    if(!preview||!ready||running||study&&Number(draft.cutoff)>32)return;
    const epoch=++generation.current;setRunning(true);setError("");setProgress(null);
    try{
      const engine=draft.engine==="compare"?"qutip":draft.engine;
      const first=await calculate(parametricOscillatorJob(`job-${crypto.randomUUID()}`,draft,engine));
      if(epoch!==generation.current)return;
      let next:null|{kind:string;occupation:number;qVariance:number;pVariance:number}=null;
      if(study||draft.engine==="compare"){
        const second=await calculate(study?
          parametricOscillatorJob(`job-${crypto.randomUUID()}`,{...draft,cutoff:String(Number(draft.cutoff)+8)},engine):
          parametricOscillatorJob(`job-${crypto.randomUUID()}`,draft,"native"));
        if(epoch!==generation.current)return;
        const a=first.data,b=second.data,as=first.result.data.columns.length,bs=second.result.data.columns.length;
        let occupation=0,qVariance=0,pVariance=0;
        for(let row=0;row<first.result.data.rows;row++){
          occupation=Math.max(occupation,Math.abs(a[row*as+5]-b[row*bs+5]));
          qVariance=Math.max(qVariance,Math.abs(a[row*as+3]-b[row*bs+3]));
          pVariance=Math.max(pVariance,Math.abs(a[row*as+4]-b[row*bs+4]));
        }
        next={kind:study?`N ${draft.cutoff} → ${Number(draft.cutoff)+8} (${engine})`:"QuTiP ↔ native",occupation,qVariance,pVariance};
      }
      setComputed(first);setSelected(0);setComparison(next);
    }catch(e){if(epoch===generation.current)setError(e instanceof Error?e.message:String(e));}
    finally{if(epoch===generation.current){active.current=null;setRunning(false);setProgress(null);}}
  }
  const fields=[["omega","Mode frequency ω",.1,5,.1],["lambdaRe","Coupling Re λ",-4.5,4.5,.05],
    ["lambdaIm","Coupling Im λ",-4.5,4.5,.05],["cutoff","Fock cutoff",8,40,1],
    ["start","Start time",-100,100,1],["stop","End time",-100,100,1],["samples","Samples",3,301,1]] as const;
  const d=computed?.data,rows=computed?.result.data.rows??0,stride=computed?.result.data.columns.length??0;
  const line=(col:number,color:string)=>{
    if(!d)return null;
    const maximum=Math.max(1,...Array.from({length:rows},(_,row)=>d[row*stride+col]));
    return <polyline points={Array.from({length:rows},(_,row)=>`${50+680*row/(rows-1)},${220-180*d[row*stride+col]/maximum}`).join(" ")}
      fill="none" stroke={color} strokeWidth="2.5"/>;
  };
  const last=computed?parametricReference(computed.result.model.parameters,computed.result.solver.tStop-computed.result.solver.tStart):null;
  return <div data-testid="parametric-oscillator">
    <section className="hamiltonian-card"><div><p className="eyebrow">STABLE SINGLE-MODE PARAMETRIC OSCILLATOR / D1-017–019</p>
      <div className="formula">H = ω(N + ½) + ½(λa†² + λ*a²)</div></div>
      <div className="model-convention"><span>VACUUM INPUT · FINITE FOCK BASIS</span><p>ℏ = 1 · parity preserved</p></div></section>
    <section className="panel dynamics-settings"><div><p className="eyebrow">QUADRATIC COUPLING</p><h2>Watch the vacuum squeeze.</h2>
      <p>Complex coupling is constant in the laboratory frame. The stable branch requires |λ|&lt;0.9ω. QuTiP integrates the state; native SciPy diagonalizes the same finite Hamiltonian independently.</p></div>
      <div className="dynamics-fields">{fields.map(([key,label,min,max,step])=><label key={key}>{label}
        <input aria-label={`Parametric ${key}`} type="number" min={min} max={max} step={step} value={draft[key]} disabled={running}
          onChange={e=>setDraft(previous=>({...previous,[key]:e.target.value}))}/></label>)}
        <label>Engine<select aria-label="Parametric engine" value={draft.engine} disabled={running}
          onChange={e=>setDraft(previous=>({...previous,engine:e.target.value as ParametricOscillatorDraft["engine"]}))}>
          <option value="qutip" disabled={!c?.engines.qutip.available}>QuTiP</option>
          <option value="native" disabled={!c?.engines.native.available}>Native · SciPy</option>
          <option value="compare" disabled={!c?.engines.qutip.available||!c?.engines.native.available}>Compare engines</option>
        </select></label></div>
      <div className="dynamics-actions"><button className="run-button" data-testid="run-parametric" disabled={!preview||!ready||running} onClick={()=>void run(false)}>▶ Run squeezing</button>
        <button className="workspace-button" data-testid="parametric-cutoff" disabled={!preview||!ready||running||Number(draft.cutoff)>32} onClick={()=>void run(true)}>Check N → N+8</button>
        {running&&<button className="workspace-button" onClick={()=>{if(active.current)void bridge.cancel(active.current);}}>Cancel</button>}
        <span>{running?`RUNNING ${progress?Math.round(progress.fraction*100):0}%`:"READY"}</span></div>
      {!preview&&<p className="validation">N 8–40; |λ|&lt;.9ω; duration ≤20; ω·duration≤50; |λ|·duration≤8; ≤301 samples. Cutoff study requires N≤32.</p>}
      {status.state==="READY"&&!ready&&<p className="validation">Selected engine unavailable.</p>}
    </section>
    {error&&<div className="error-message" role="alert">{error}{computed?" · Previous verified result retained.":""}</div>}
    {computed&&<section className="panel cavity-result" data-testid="parametric-result"><div className="panel-heading"><div>
      <p className="eyebrow">{computed.result.engine.name.toUpperCase()} / VACUUM SQUEEZING</p><h2>Verified finite-basis evolution</h2></div>
      <span className={`result-badge ${stale?"stale":""}`}>{stale?"OUT OF DATE":"COMPUTED"}</span></div>
      <div className="cavity-metrics"><div><span>FINAL ⟨N⟩</span><strong>{d![(rows-1)*stride+5].toFixed(6)}</strong></div>
        <div><span>FINAL Δq²</span><strong>{d![(rows-1)*stride+3].toFixed(6)}</strong></div>
        <div><span>FINAL Δp²</span><strong>{d![(rows-1)*stride+4].toFixed(6)}</strong></div>
        <div><span>MAX PARITY DRIFT</span><strong>{computed.result.analysis.maxParityDrift.toExponential(2)}</strong></div>
        <div><span>BOUNDARY OCCUPATION</span><strong>{computed.result.analysis.maxBoundaryOccupation.toExponential(2)}</strong></div>
        <div><span>Ω = √(ω²−|λ|²)</span><strong>{computed.result.analysis.bogoliubovFrequency.toFixed(6)}</strong></div></div>
      <div className="sweep-visual"><p className="eyebrow">QUADRATURE VARIANCES / EACH CURVE SCALED SEPARATELY</p>
        <svg viewBox="0 0 800 260" role="img" aria-label="Parametric oscillator squeezing curves"><path d="M50 35 V220 H730" stroke="#506575" fill="none"/>
          {line(3,"#79d9c1")}{line(4,"#edae8f")}</svg><p>Green: Δq² · orange: Δp² · horizontal axis: time.</p></div>
      <label>Recorded time row <input aria-label="Parametric time cursor" type="range" min="0" max={rows-1} value={selected} onChange={event=>setSelected(Number(event.target.value))}/></label>
      {item?.kind==="time"&&<p data-testid="parametric-selected-row">t = {item.values.time.toFixed(4)} · Δq² = {item.values.q_variance.toFixed(6)} · Δp² = {item.values.p_variance.toFixed(6)}</p>}
      <p>Infinite-space reference at the final time: occupation {last!.number.toFixed(6)}, Δq² {last!.qVariance.toFixed(6)}, Δp² {last!.pVariance.toFixed(6)}. Finite-cutoff differences are reported, not hidden.</p>
      {comparison&&<p data-testid="parametric-comparison">{comparison.kind}: max Δoccupation {comparison.occupation.toExponential(2)}, Δq² {comparison.qVariance.toExponential(2)}, Δp² {comparison.pVariance.toExponential(2)}. Cutoff sensitivity is not proof of infinite-basis convergence.</p>}
    </section>}
  </div>;
}
