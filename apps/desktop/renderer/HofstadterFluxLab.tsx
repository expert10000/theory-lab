import React,{useEffect,useRef,useState} from "react";
import type {QuantumBridge,WorkerStatus} from "../../../packages/contracts";
import {assertHofstadterFluxPlan,reducedFluxes,type HofstadterFluxPlan,type HofstadterFluxPoint,type HofstadterFluxStudy} from "../../../packages/contracts/hofstadter-flux-study";
import {runHofstadterFluxStudy} from "../../../packages/models/hofstadter-flux-study";
import {format} from "./Spectrum";

export function HofstadterFluxLab({bridge,status,onOpenRun}:{bridge:QuantumBridge;status:WorkerStatus;onOpenRun:(runId:string)=>Promise<void>}){
  const [hopping,setHopping]=useState("1"),[grid,setGrid]=useState("7"),[maxQ,setMaxQ]=useState("4"),[filling,setFilling]=useState("1");
  const [study,setStudy]=useState<HofstadterFluxStudy|null>(null),[live,setLive]=useState<HofstadterFluxPoint[]>([]);
  const [saved,setSaved]=useState<{studyId:string;computedAt:string;count:number;status:string}[]>([]);
  const [selected,setSelected]=useState(0),[sample,setSample]=useState(0),[running,setRunning]=useState(false),[message,setMessage]=useState("");
  const cancel=useRef<AbortController|null>(null);
  useEffect(()=>{void bridge.listHofstadterFluxStudies().then(setSaved).catch(()=>{});},[bridge]);
  let preview:HofstadterFluxPlan|null=null;
  try{preview={schema:"quantum-hofstadter-flux-plan/v1",studyId:"preview",hopping:Number(hopping),
    grid:Number(grid) as 7|9|11,maxDenominator:Number(maxQ),occupiedBands:filling==="none"?null:Number(filling)};
    assertHofstadterFluxPlan(preview);}catch{preview=null;}
  const current=study?.points??live,point=current[selected],count=preview?reducedFluxes(preview.maxDenominator).length:0;
  const stale=!!study&&(!preview||JSON.stringify({...study.plan,studyId:"preview"})!==JSON.stringify(preview));
  async function execute(plan:HofstadterFluxPlan,prefix:readonly HofstadterFluxPoint[]=[]){
    if(running||status.state!=="READY")return;
    const controller=new AbortController();cancel.current=controller;setRunning(true);setStudy(null);setLive([...prefix]);
    setMessage(prefix.length?"Resuming verified flux points…":"Computing independently saved Harper runs…");
    const appended:HofstadterFluxPoint[]=[];
    try{
      if(!prefix.length)await bridge.saveHofstadterFluxStudy({schema:"quantum-hofstadter-flux-study/v1",studyId:plan.studyId,
        plan,status:"cancelled",points:[],computedAt:new Date().toISOString()});
      const done=await runHofstadterFluxStudy(plan,job=>bridge.topology(job),async item=>{
        await bridge.saveHofstadterFluxStudy({schema:"quantum-hofstadter-flux-study/v1",studyId:plan.studyId,plan,
          status:item.index===reducedFluxes(plan.maxDenominator).length-1?"completed":"cancelled",
          points:[...prefix,...appended,item],computedAt:new Date().toISOString()});
        appended.push(item);setLive([...prefix,...appended]);setSelected(item.index);
      },controller.signal,prefix);
      setStudy(await bridge.getHofstadterFluxStudy(plan.studyId));setSaved(await bridge.listHofstadterFluxStudies());
      setMessage(done.status==="completed"?"Butterfly complete; every flux has a verified immutable run.":
        `Stopped after ${done.points.length} verified fluxes; resume from this checkpoint.`);
    }catch(error){setMessage(`Flux sweep stopped: ${error instanceof Error?error.message:String(error)}`);
      setSaved(await bridge.listHofstadterFluxStudies().catch(()=>[]));}
    finally{cancel.current=null;setRunning(false);}
  }
  async function reopen(studyId:string){try{const value=await bridge.getHofstadterFluxStudy(studyId);setStudy(value);setLive([]);setSelected(0);setSample(0);
    setHopping(String(value.plan.hopping));setGrid(String(value.plan.grid));setMaxQ(String(value.plan.maxDenominator));
    setFilling(value.plan.occupiedBands===null?"none":String(value.plan.occupiedBands));setMessage("Verified flux sweep reopened.");
  }catch(error){setMessage(`Cannot reopen flux sweep: ${error instanceof Error?error.message:String(error)}`);}}
  return <section className="panel spectrum-study-lab" data-testid="hofstadter-flux-lab">
    <p className="eyebrow">HOFSTADTER / BOUNDED FLUX SWEEP</p><h2>Magnetic spectrum across reduced flux</h2>
    <p>Each rational p/q is an independent saved periodic Harper run. Fine-grid extrema check sampling. Ideal bulk Hall values appear only at the specified filling and a resolved global gap. No plateau or edge-channel claim.</p>
    <div className="spectrum-study-fields">
      <label>Hopping t<input aria-label="Flux sweep hopping" type="number" min="0.25" max="2" step="0.05" value={hopping} disabled={running} onChange={e=>setHopping(e.target.value)}/></label>
      <label>Momentum grid<select aria-label="Flux sweep momentum grid" value={grid} disabled={running} onChange={e=>setGrid(e.target.value)}><option>7</option><option>9</option><option>11</option></select></label>
      <label>Maximum denominator<select aria-label="Flux sweep maximum denominator" value={maxQ} disabled={running} onChange={e=>setMaxQ(e.target.value)}>{[3,4,5,6,7].map(q=><option key={q}>{q}</option>)}</select></label>
      <label>Specified filling<select aria-label="Flux sweep occupied bands" value={filling} disabled={running} onChange={e=>setFilling(e.target.value)}><option value="none">None · spectrum only</option>{Array.from({length:Math.max(0,Number(maxQ)-1)},(_,i)=><option key={i+1} value={i+1}>{i+1} occupied bands</option>)}</select></label>
    </div>
    {!preview&&<p className="validation">Use t from 0.25 to 2, an odd grid 7/9/11, denominator 3..7, and fewer occupied bands than the maximum denominator.</p>}
    <div className="spectrum-study-actions">
      <button disabled={!preview||running||status.state!=="READY"} onClick={()=>preview&&void execute({...preview,studyId:`hof-flux-${crypto.randomUUID()}`})}>Run flux sweep</button>
      {study?.status==="cancelled"&&<button disabled={running||status.state!=="READY"} onClick={()=>void bridge.getHofstadterFluxStudy(study.studyId).then(s=>execute(s.plan,s.points)).catch(e=>setMessage(String(e)))}>Resume verified sweep</button>}
      {running&&<button onClick={()=>cancel.current?.abort()}>Cancel after current flux</button>}
      <span>{current.length}/{study?reducedFluxes(study.plan.maxDenominator).length:count} verified fluxes</span>
    </div>
    {message&&<p role="status">{message}</p>}
    {!!saved.length&&<div className="spectrum-study-saved"><p className="eyebrow">VERIFIED SAVED FLUX SWEEPS</p>{saved.slice(0,10).map(row=><button key={row.studyId} disabled={running} onClick={()=>void reopen(row.studyId)}>{row.computedAt.slice(0,19).replace("T"," ")} · {row.count} fluxes · {row.status}</button>)}</div>}
    {!!current.length&&<>
      <p>{stale?"Saved sweep inputs differ from the editable draft.":"Click a supplied energy sample. Orange fluxes have no resolved Hall value at the selected filling."}</p>
      <div style={{overflowX:"auto",border:"1px solid #314451",padding:12}}><svg viewBox="0 0 700 340" style={{width:"100%",minWidth:500}} role="img" aria-label="Hofstadter butterfly of exact saved band samples">
        <line x1="35" y1="170" x2="675" y2="170" stroke="#607785"/>
        {current.flatMap(p=>p.energies.flat().map((energy,i)=><circle key={`${p.index}-${i}`} cx={35+640*p.p/p.q} cy={170-145*energy/(4*(study?.plan.hopping??Number(hopping)))} r={selected===p.index?1.8:1.2}
          fill={p.filling?.status==="defined"?"#79d9c1":"#f2b36f"} onClick={()=>{setSelected(p.index);setSample(i);}}><title>{p.p}/{p.q} · E {energy} · saved sample {i}</title></circle>))}
        <text x="35" y="325" fill="#9eb8c5">0</text><text x="655" y="325" fill="#9eb8c5">p/q → 1</text>
      </svg></div>
      <label>Exact saved flux<select aria-label="Inspect saved flux" value={selected} onChange={e=>{setSelected(Number(e.target.value));setSample(0);}}>{current.map(p=><option key={p.index} value={p.index}>{p.p}/{p.q}</option>)}</select></label>
      {point&&<div className="spectrum-study-selection" data-testid="hofstadter-flux-selection">
        <p className="eyebrow">VERIFIED RUN {point.index+1}</p><strong>Flux {point.p}/{point.q} · {point.q} bands · {point.energies[0].length} k samples per band</strong>
        <p>Energy bounds: {point.fineBounds.map(([lo,hi],i)=>`band ${i}: ${format(lo)}…${format(hi)}`).join(" · ")} hopping energy</p>
        <p>Maximum coarse/fine extrema drift: {format(Math.max(...point.extremaDrift))} · sampling {point.converged?"converged":"unresolved"}</p>
        <p>Producer occupied-gap diagnostics: {point.gaps.map(g=>`${g.occupiedBands}: ${format(g.fineGap)} (${g.status})`).join(" · ")||"No magnetic band gap at zero flux."}</p>
        <p>Selected sample {sample}: band {Math.floor(sample/point.energies[0].length)}, momentum-grid index {sample%point.energies[0].length}, exact energy {format(point.energies[Math.floor(sample/point.energies[0].length)]?.[sample%point.energies[0].length]??point.energies[0][0])} hopping energy.</p>
        <p>{point.filling?`Filling ${point.filling.occupiedBands}: global gap ${format(point.filling.fineGlobalGap)} · ${point.filling.gapStatus} · ideal Hall ${point.filling.conductance??"undefined"} e²/h (${point.filling.status})`:"No applicable specified filling; Hall undefined."}</p>
        <p>Run {point.runId} · result SHA-256 {point.resultSha256}</p>
        <button onClick={()=>void onOpenRun(point.runId).catch(e=>setMessage(String(e)))}>Open exact saved Harper run</button>
      </div>}
      {study?.status==="completed"&&<button onClick={()=>void bridge.exportHofstadterButterfly(study.studyId).then(path=>setMessage(path?`Verified butterfly scene: ${path}`:"Export cancelled")).catch(e=>setMessage(String(e)))}>Export verified butterfly .qscene</button>}
    </>}
  </section>;
}
