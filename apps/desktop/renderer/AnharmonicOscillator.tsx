import React,{useEffect,useState} from "react";
import type {AnharmonicOscillatorResult,QuantumBridge,WorkerStatus} from "../../../packages/contracts";
import {ANHARMONIC_DEFAULTS,anharmonicJob,consistentAnharmonicResult,type AnharmonicDraft} from "../../../packages/models/oscillator-anharmonic";

export function AnharmonicOscillator({bridge,status,restored,restoreEpoch,onSnapshot}:{
  bridge:QuantumBridge;status:WorkerStatus;restored?:AnharmonicDraft;restoreEpoch?:number;
  onSnapshot?:(draft:AnharmonicDraft)=>void;
}){
  const [draft,setDraft]=useState<AnharmonicDraft>(ANHARMONIC_DEFAULTS);
  const [result,setResult]=useState<AnharmonicOscillatorResult|null>(null);
  const [comparison,setComparison]=useState<{label:string;energy:number;spacing:number}|null>(null);
  const [running,setRunning]=useState(false),[error,setError]=useState("");
  useEffect(()=>{if(restoreEpoch){setDraft(restored??ANHARMONIC_DEFAULTS);setResult(null);setComparison(null);setError("");}},[restoreEpoch]);
  useEffect(()=>onSnapshot?.(draft),[draft,onSnapshot]);
  let preview:ReturnType<typeof anharmonicJob>|null=null;
  try{preview=anharmonicJob("preview",draft,draft.engine==="compare"?"qutip":draft.engine);}catch{/* bounded form guidance below */}
  const capabilities=status.capabilities;
  const ready=status.state==="READY"&&!!capabilities?.operations.includes("oscillator_anharmonic")&&
    (draft.engine==="compare"?!!capabilities.engines.qutip.available&&!!capabilities.engines.native.available:
      !!capabilities.engines[draft.engine].available);
  const stale=!!result&&(!preview||JSON.stringify(result.model)!==JSON.stringify(preview.model)||
    result.engine.name!==(draft.engine==="compare"?"qutip":draft.engine));
  async function calculate(engine:"qutip"|"native",next:AnharmonicDraft){
    const job=anharmonicJob(`job-${crypto.randomUUID()}`,next,engine);
    const value=await bridge.oscillatorAnharmonic(job);
    if(!consistentAnharmonicResult(job,value))throw new Error("Anharmonic result failed host eigenpair verification");
    return value;
  }
  async function run(study:boolean){
    if(!preview||!ready||running||(study&&Number(draft.cutoff)>24))return;
    setRunning(true);setError("");
    try{
      const engine=draft.engine==="compare"?"qutip":draft.engine;
      const first=await calculate(engine,draft);
      let report:null|{label:string;energy:number;spacing:number}=null;
      if(study||draft.engine==="compare"){
        const second=await calculate(study?engine:"native",study?{...draft,cutoff:String(Number(draft.cutoff)+8)}:draft);
        const energies=first.spectrum.energies,other=second.spectrum.energies;
        report={label:study?`N ${draft.cutoff} → ${Number(draft.cutoff)+8} (${engine})`:"QuTiP ↔ native",
          energy:Math.max(...energies.map((v,i)=>Math.abs(v-other[i]))),
          spacing:Math.max(...energies.slice(1).map((v,i)=>Math.abs((v-energies[i])-(other[i+1]-other[i]))))};
      }
      setResult(first);setComparison(report);
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setRunning(false);}
  }
  const fields=[["omega","Frequency ω",.5,3,.05],["lambda","Quartic coupling λ",0,.2,.005],
    ["cutoff","Fock cutoff",8,32,1],["levels","Reported levels",3,6,1]] as const;
  return <div data-testid="anharmonic-oscillator">
    <section className="hamiltonian-card"><div><p className="eyebrow">CONFINING QUARTIC OSCILLATOR / D1-020–022</p>
      <div className="formula">H = p²/2 + ω²x²/2 + λx⁴</div></div>
      <div className="model-convention"><span>m = 1 · ℏ = 1</span><p>Finite harmonic Fock basis</p></div></section>
    <section className="panel dynamics-settings"><div><p className="eyebrow">STATIC ENERGY SPECTRUM</p>
      <h2>Measure how quartic confinement shifts the ladder.</h2>
      <p>λ≥0 only. The harmonic basis uses x=(a+a†)/√(2ω); this computes the finite matrix of x⁴, not a spatial-grid solution.</p></div>
      <div className="dynamics-fields">{fields.map(([key,label,min,max,step])=><label key={key}>{label}
        <input aria-label={`Anharmonic ${key}`} type="number" min={min} max={max} step={step} value={draft[key]}
          disabled={running} onChange={event=>setDraft(previous=>({...previous,[key]:event.target.value}))}/></label>)}
        <label>Engine<select aria-label="Anharmonic engine" value={draft.engine} disabled={running}
          onChange={event=>setDraft(previous=>({...previous,engine:event.target.value as AnharmonicDraft["engine"]}))}>
          <option value="qutip" disabled={!capabilities?.engines.qutip.available}>QuTiP</option>
          <option value="native" disabled={!capabilities?.engines.native.available}>Native · SciPy</option>
          <option value="compare" disabled={!capabilities?.engines.qutip.available||!capabilities?.engines.native.available}>Compare engines</option>
        </select></label></div>
      <div className="dynamics-actions"><button className="run-button" data-testid="run-anharmonic" disabled={!preview||!ready||running}
        onClick={()=>void run(false)}>▶ Run quartic spectrum</button>
        <button className="workspace-button" data-testid="anharmonic-cutoff" disabled={!preview||!ready||running||Number(draft.cutoff)>24}
          onClick={()=>void run(true)}>Check N → N+8</button><span>{running?"RUNNING":"READY"}</span></div>
      {!preview&&<p className="validation">m=1; ω .5–3; λ 0–.2; cutoff 8–32; 3–6 levels below cutoff−1. Cutoff study needs N≤24.</p>}
      {status.state==="READY"&&!ready&&<p className="validation">Selected engine unavailable.</p>}
    </section>
    {error&&<div className="error-message" role="alert">{error}{result?" · Previous verified result retained.":""}</div>}
    {result&&<section className="panel cavity-result" data-testid="anharmonic-result"><div className="panel-heading"><div>
      <p className="eyebrow">{result.engine.name.toUpperCase()} / VERIFIED EIGENPAIRS</p><h2>Quartic energy ladder</h2></div>
      <span className={`result-badge ${stale?"stale":""}`}>{stale?"OUT OF DATE":"COMPUTED"}</span></div>
      <div className="cavity-metrics"><div><span>GROUND ENERGY E₀</span><strong>{result.spectrum.energies[0].toFixed(6)}</strong></div>
        <div><span>SHIFT FROM HARMONIC</span><strong>{(result.spectrum.energies[0]-result.analysis.harmonicGround).toFixed(6)}</strong></div>
        <div><span>GROUND ⟨x²⟩</span><strong>{result.analysis.groundX2.toFixed(6)}</strong></div>
        <div><span>GROUND ⟨x⁴⟩</span><strong>{result.analysis.groundX4.toFixed(6)}</strong></div></div>
      <div className="sweep-visual"><p className="eyebrow">LOWEST ENERGIES / HARMONIC BASELINE</p>
        <svg viewBox="0 0 800 250" role="img" aria-label="Quartic and harmonic energy ladder">
          {result.spectrum.energies.map((energy,index)=>{const x=80+650*index/(result.spectrum.energies.length-1),max=result.spectrum.energies.at(-1)!,
            harmonic=result.model.parameters.omega*(index+.5),y=205-160*energy/max,baseline=205-160*harmonic/max;
            return <g key={index}><path d={`M${x-23} ${baseline}h46`} stroke="#edae8f" strokeDasharray="4 3" strokeWidth="2"/>
              <path d={`M${x-23} ${y}h46`} stroke="#79d9c1" strokeWidth="3"/><text x={x} y="232" fill="#acc1ca" fontSize="12" textAnchor="middle">n={index}</text></g>;})}</svg>
        <p>Green: quartic · dashed orange: harmonic at the same ω. Separate cutoff checks are required for convergence claims.</p></div>
      <p>Lowest spacing E₁−E₀: {(result.spectrum.energies[1]-result.spectrum.energies[0]).toFixed(6)} · ground parity {result.analysis.groundParity.toFixed(8)}.</p>
      {comparison&&<p data-testid="anharmonic-comparison">{comparison.label}: max |ΔE| {comparison.energy.toExponential(3)} · max spacing drift {comparison.spacing.toExponential(3)}.</p>}
    </section>}
  </div>;
}
