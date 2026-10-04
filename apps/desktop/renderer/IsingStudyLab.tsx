import React,{useEffect,useRef,useState} from "react";
import type {ManyBodyEngineName,QuantumBridge,WorkerStatus,WorkspaceSnapshot} from "../../../packages/contracts";
import type {IsingStudyPlan,IsingStudyPoint,IsingStudyResult,IsingStudySummary} from "../../../packages/contracts/ising-study";
import {isingStudyPlan,runIsingStudy} from "../../../packages/models/ising-study";
import {format} from "./Spectrum";

export const ISING_STUDY_DEFAULTS={sites:"4",interaction:"1",longitudinal:"0.15",boundary:"open" as const,
  start:"0",stop:"2",points:"11",engine:"native" as ManyBodyEngineName};
type Draft=NonNullable<WorkspaceSnapshot["isingStudy"]>;

function Series({title,points,total,selected,onSelect,values}: {title:string;points:IsingStudyPoint[];total:number;
  selected:number|null;onSelect:(index:number)=>void;values:(point:IsingStudyPoint)=>number}) {
  const numbers=points.map(values),min=Math.min(...numbers),max=Math.max(...numbers),span=Math.max(max-min,1e-9);
  const x=(index:number)=>25+390*index/Math.max(1,total-1),y=(value:number)=>115-90*(value-min)/span;
  return <div className="ising-study-series"><h3>{title}</h3>
    <svg viewBox="0 0 440 145" role="img" aria-label={`${title} versus transverse h/J`}>
      <polyline fill="none" stroke="#79d9c1" strokeWidth="2" points={points.map(point=>`${x(point.index)},${y(values(point))}`).join(" ")}/>
      {points.map(point=><circle key={point.index} cx={x(point.index)} cy={y(values(point))} r={selected===point.index?6:4}
        fill={selected===point.index?"#f2b36f":"#79d9c1"} role="button" tabIndex={0}
        aria-label={`Select h/J ${format(point.ratio)} for ${title}`} aria-pressed={selected===point.index}
        onClick={()=>onSelect(point.index)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelect(point.index);}}}/>)}
      <text x="25" y="139" fill="#829caa">h/J</text>
    </svg>
  </div>;
}

export function IsingStudyLab({bridge,status,restored,restoreEpoch,onSnapshot,onOpenPoint}: {
  bridge:QuantumBridge;status:WorkerStatus;restored?:Draft;restoreEpoch?:number;
  onSnapshot?:(draft:Draft)=>void;onOpenPoint:(runId:string)=>Promise<void>;
}) {
  const [draft,setDraft]=useState<Draft>(ISING_STUDY_DEFAULTS);
  const [result,setResult]=useState<IsingStudyResult|null>(null);
  const [livePoints,setLivePoints]=useState<IsingStudyPoint[]>([]);
  const [livePlan,setLivePlan]=useState<IsingStudyPlan|null>(null);
  const [selected,setSelected]=useState<number|null>(null);
  const [running,setRunning]=useState(false),[message,setMessage]=useState("");
  const [saved,setSaved]=useState<IsingStudySummary[]>([]);
  const cancelRef=useRef<AbortController|null>(null);
  useEffect(()=>{void bridge.listIsingStudies().then(setSaved).catch(()=>{});},[bridge]);
  useEffect(()=>{if(restoreEpoch){setDraft(restored??ISING_STUDY_DEFAULTS);setResult(null);setLivePoints([]);
    setLivePlan(null);setSelected(null);setMessage("Workspace inputs restored; reopen or recompute a verified study.");}},[restoreEpoch]);
  useEffect(()=>onSnapshot?.(draft),[draft,onSnapshot]);
  let preview:IsingStudyPlan|null=null;
  try{
    if([draft.sites,draft.interaction,draft.longitudinal,draft.start,draft.stop,draft.points].every(raw=>raw.trim()))
      preview=isingStudyPlan("preview",draft.engine,{sites:Number(draft.sites),interaction:Number(draft.interaction),
        longitudinal:Number(draft.longitudinal),boundary:draft.boundary},Number(draft.start),Number(draft.stop),Number(draft.points));
  }catch{/* Invalid drafts remain editable. */}
  const ready=status.state==="READY"&&!!status.capabilities?.operations.includes("many_body")&&
    !!status.capabilities.engines[draft.engine]?.available;
  const plan=result?.plan??livePlan,points=result?.points??livePoints;
  const point=selected===null?null:points.find(item=>item.index===selected)??null;
  const stale=!!result&&(!preview||JSON.stringify({...result.plan,studyId:"preview"})!==JSON.stringify(preview));
  async function execute(next:IsingStudyPlan,prefix:readonly IsingStudyPoint[]=[]){
    if(running||status.state!=="READY"||!status.capabilities?.engines[next.engine]?.available)return;
    const controller=new AbortController();cancelRef.current=controller;setRunning(true);
    setResult(null);setLivePlan(next);setLivePoints([...prefix]);setSelected(prefix.length?prefix.length-1:null);
    setMessage(prefix.length?"Resuming verified Ising points…":"Calculating verified Ising points…");
    const appended:IsingStudyPoint[]=[];
    try{
      if(!prefix.length)await bridge.saveIsingStudy({schema:"quantum-ising-study-result/v1",studyId:next.studyId,
        plan:next,status:"cancelled",points:[],computedAt:new Date().toISOString()});
      const completed=await runIsingStudy(next,job=>bridge.manyBody(job),async item=>{
        await bridge.saveIsingStudy({schema:"quantum-ising-study-result/v1",studyId:next.studyId,plan:next,
          status:item.index===next.axis.points-1?"completed":"cancelled",points:[...prefix,...appended,item],
          computedAt:new Date().toISOString()});
        appended.push(item);setLivePoints(current=>[...current,item]);setSelected(item.index);
      },controller.signal,prefix);
      setResult(await bridge.getIsingStudy(next.studyId));setSaved(await bridge.listIsingStudies());
      setMessage(completed.status==="completed"?"Study complete; each point is a verified saved Ising run.":
        `Cancelled after ${completed.points.length} saved points. Resume from this checkpoint.`);
    }catch(error){setMessage(`Study stopped: ${error instanceof Error?error.message:String(error)}. Reopen the checkpoint to retry.`);
      setSaved(await bridge.listIsingStudies().catch(()=>[]));}
    finally{cancelRef.current=null;setRunning(false);}
  }
  async function reopen(studyId:string){
    if(running)return;
    try{
      const value=await bridge.getIsingStudy(studyId);setResult(value);setLivePlan(null);setLivePoints([]);
      setSelected(value.points.length?0:null);
      setDraft({sites:String(value.plan.fixed.sites),interaction:String(value.plan.fixed.interaction),
        longitudinal:String(value.plan.fixed.longitudinal),boundary:value.plan.fixed.boundary,
        start:String(value.plan.axis.start),stop:String(value.plan.axis.stop),points:String(value.plan.axis.points),engine:value.plan.engine});
      setMessage(value.status==="completed"?"Verified saved study reopened.":"Verified partial study reopened; resume from its checkpoint.");
    }catch(error){setMessage(`Cannot reopen study: ${error instanceof Error?error.message:String(error)}`);}
  }
  async function resume(){
    if(!result||result.status!=="cancelled"||running)return;
    try{const value=await bridge.getIsingStudy(result.studyId);await execute(value.plan,value.points);}
    catch(error){setMessage(`Cannot resume study: ${error instanceof Error?error.message:String(error)}`);}
  }
  const field=(label:string,key:"sites"|"interaction"|"longitudinal"|"start"|"stop"|"points")=><label key={key}>{label}
    <input aria-label={key==="points"?"Ising sweep samples":`Ising study ${label}`} type="number" value={draft[key]} disabled={running}
      onChange={event=>setDraft(current=>({...current,[key]:event.target.value}))}/></label>;
  return <section className="panel spectrum-study-lab" data-testid="ising-study-lab">
    <p className="eyebrow">MANY-BODY / QVIS-015</p><h2>Ising h/J study</h2>
    <p>Fix sites, boundary, nonzero J and longitudinal field. Sweep transverse h/J within the existing 2–8-site, ±10 job limits.</p>
    <div className="spectrum-study-fields">
      {field("Sites","sites")}{field("Interaction J","interaction")}{field("Longitudinal field","longitudinal")}
      {field("h/J from","start")}{field("h/J to","stop")}{field("Points","points")}
      <label>Boundary<select aria-label="Ising study boundary" value={draft.boundary} disabled={running}
        onChange={event=>setDraft(current=>({...current,boundary:event.target.value as Draft["boundary"]}))}>
        <option value="open">Open</option><option value="periodic">Periodic</option></select></label>
      <label>Engine<select aria-label="Ising solver" value={draft.engine} disabled={running}
        onChange={event=>setDraft(current=>({...current,engine:event.target.value as ManyBodyEngineName}))}>
        <option value="native">Native · NumPy</option><option value="quspin">QuSpin</option></select></label>
    </div>
    {!preview&&<p className="validation">Use 2–8 sites, J ≠ 0, longitudinal field within ±10, increasing h/J, transverse |h| ≤ 10, and 3–31 points.</p>}
    {!ready&&<p className="validation">Selected engine is not ready.</p>}
    <div className="spectrum-study-actions">
      <button type="button" data-testid="run-ising-study" disabled={!preview||!ready||running}
        onClick={()=>{if(preview)void execute({...preview,studyId:`ising-${crypto.randomUUID()}`});}}>Run Ising study</button>
      {result?.status==="cancelled"&&<button type="button" data-testid="resume-ising-study" disabled={running||status.state!=="READY"||!status.capabilities?.engines[result.plan.engine]?.available}
        onClick={()=>void resume()}>Resume saved study</button>}
      {running&&<button type="button" data-testid="cancel-ising-study" onClick={()=>{cancelRef.current?.abort();setMessage("Stopping after the current point…");}}>Cancel between points</button>}
      <span data-testid="ising-study-progress">{points.length}/{plan?.axis.points??draft.points} verified points</span>
    </div>
    {message&&<p role="status" data-testid="ising-study-status">{message}</p>}
    {!!saved.length&&<div className="spectrum-study-saved" data-testid="saved-ising-studies"><p className="eyebrow">VERIFIED SAVED STUDIES</p>
      {saved.slice(0,10).map(item=><button key={item.studyId} type="button" disabled={running}
        data-testid={`open-ising-study-${item.studyId}`} onClick={()=>void reopen(item.studyId)}>
        {item.computedAt.slice(0,19).replace("T"," ")} · {item.sites} sites · J={format(item.interaction)} · h/J {format(item.start)}→{format(item.stop)} · {item.engine} · {item.completedPoints}/{item.totalPoints} · {item.status}
      </button>)}</div>}
    {plan&&!!points.length&&<>
      <p>{result?.status==="cancelled"?"Partial study":stale?"Study is out of date with edited inputs":"Each point links to an exact saved run."}</p>
      <div className="ising-study-charts" data-testid="ising-study-charts">
        <Series title="Low energy E₀" points={points} total={plan.axis.points} selected={selected} onSelect={setSelected} values={item=>item.lowEnergies[0]}/>
        <Series title="First excited E₁" points={points} total={plan.axis.points} selected={selected} onSelect={setSelected} values={item=>item.lowEnergies[1]}/>
        <Series title="Finite-size gap E₁ − E₀" points={points} total={plan.axis.points} selected={selected} onSelect={setSelected} values={item=>item.gap}/>
        <Series title="Mean site ⟨σᶻ⟩" points={points} total={plan.axis.points} selected={selected} onSelect={setSelected}
          values={item=>item.siteMagnetization.reduce((sum,value)=>sum+value,0)/item.siteMagnetization.length}/>
        <Series title="Half-chain entropy" points={points} total={plan.axis.points} selected={selected} onSelect={setSelected} values={item=>item.halfChainEntropy}/>
      </div>
      {point&&<div className="spectrum-study-selection" data-testid="ising-study-selection">
        <p className="eyebrow">SAVED SAMPLE {point.index+1} / {plan.axis.points}</p>
        <strong>h/J = {format(point.ratio)} · h = {format(point.ratio*plan.fixed.interaction)} · J = {format(plan.fixed.interaction)}</strong>
        <p>Low energies: {point.lowEnergies.map(format).join(" · ")} · gap: {format(point.gap)} (normalized, ℏ=1)</p>
        <p>Site ⟨σᶻ⟩: {point.siteMagnetization.map(format).join(" · ")} · half-chain entropy: {format(point.halfChainEntropy)}</p>
        <code>{point.runId}</code>
        <div className="spectrum-study-actions"><button type="button" data-testid="open-ising-point" onClick={()=>void onOpenPoint(point.runId).catch(error=>setMessage(error instanceof Error?error.message:String(error)))}>Open verified Ising run</button></div>
        <p>No ground-state vector or neighboring-run fidelity is stored.</p>
      </div>}
    </>}
  </section>;
}
