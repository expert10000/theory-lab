import React,{useEffect,useRef,useState} from "react";
import type {EngineName,QuantumBridge,WorkerStatus,WorkspaceSnapshot} from "../../../packages/contracts";
import type {SpectrumStudyPlan,SpectrumStudyPoint,SpectrumStudyResult,SpectrumStudySummary} from "../../../packages/contracts/spectrum-study";
import type {SpectrumOmegaStudyPlan,SpectrumOmegaStudyPoint,SpectrumOmegaStudyResult,SpectrumOmegaStudySummary} from "../../../packages/contracts/spectrum-omega-study";
import {runSpectrumStudy,spectrumStudyPlan} from "../../../packages/models/spectrum-study";
import {runSpectrumOmegaStudy,spectrumOmegaStudyPlan} from "../../../packages/models/spectrum-omega-study";
import {format} from "./Spectrum";

export const SPECTRUM_STUDY_DEFAULTS={omega:"0.8",start:"-2",stop:"2",points:"21",engine:"qutip" as EngineName};
type Draft=NonNullable<WorkspaceSnapshot["spectrumStudy"]>;
type Plan=SpectrumStudyPlan|SpectrumOmegaStudyPlan;
type Point=SpectrumStudyPoint|SpectrumOmegaStudyPoint;
type Result=SpectrumStudyResult|SpectrumOmegaStudyResult;
type Summary=SpectrumStudySummary|SpectrumOmegaStudySummary;
const coordinate=(point:Point)=>"delta" in point?point.delta:point.omega;
const axisSymbol=(plan:Plan)=>plan.axis.parameter==="delta"?"Δ":"Ω";
export function SpectrumStudyLab({bridge,status,restored,restoreEpoch,atlasDraft,atlasEpoch,onSnapshot,onOpenPoint,onDraftPoint}:{
  bridge:QuantumBridge;status:WorkerStatus;restored?:Draft;restoreEpoch?:number;atlasDraft?:Draft;atlasEpoch?:number;
  onSnapshot?:(draft:Draft)=>void;onOpenPoint:(runId:string)=>Promise<void>;
  onDraftPoint:(delta:number,omega:number)=>void;
}){
  const [draft,setDraft]=useState<Draft>(SPECTRUM_STUDY_DEFAULTS);
  const [result,setResult]=useState<Result|null>(null);
  const [livePoints,setLivePoints]=useState<Point[]>([]);
  const [livePlan,setLivePlan]=useState<Plan|null>(null);
  const [selected,setSelected]=useState<number|null>(null);
  const [running,setRunning]=useState(false);
  const [message,setMessage]=useState("");
  const [savedStudies,setSavedStudies]=useState<Summary[]>([]);
  const cancelRef=useRef<AbortController|null>(null);
  useEffect(()=>{void bridge.listSpectrumStudies().then(setSavedStudies).catch(()=>{});},[bridge]);
  useEffect(()=>{if(restoreEpoch){setDraft(restored??SPECTRUM_STUDY_DEFAULTS);setResult(null);setLivePoints([]);setLivePlan(null);setSelected(null);setMessage("Workspace inputs restored; recompute the study.");}},[restoreEpoch]);
  useEffect(()=>{if(atlasEpoch&&atlasDraft){setDraft(atlasDraft);setResult(null);setLivePoints([]);setLivePlan(null);setSelected(null);setMessage("Pinned Atlas binding loaded as editable sweep inputs; point runs retain ordinary Lab provenance.");}},[atlasEpoch]);
  useEffect(()=>onSnapshot?.(draft),[draft,onSnapshot]);
  let preview:Plan|null=null;
  try{
    if([draft.start,draft.stop,draft.points,draft.axisParameter==="omega"?draft.delta??"":draft.omega].every(raw=>raw.trim()!==""))
      preview=draft.axisParameter==="omega"?
        spectrumOmegaStudyPlan("preview",draft.engine,Number(draft.delta),Number(draft.start),Number(draft.stop),Number(draft.points)):
        spectrumStudyPlan("preview",draft.engine,Number(draft.omega),Number(draft.start),Number(draft.stop),Number(draft.points));
  }catch{/* Invalid drafts remain editable; no request is made. */}
  const ready=status.state==="READY"&&!!status.capabilities?.operations.includes("diagonalize")&&
    !!status.capabilities.engines[draft.engine]?.available;
  const shownPlan=result?.plan??livePlan;
  const points=result?.points??livePoints;
  const selectedPoint=selected===null?null:points.find(point=>point.index===selected)??null;
  const stale=!!result&&(!preview||JSON.stringify({...result.plan,studyId:"preview"})!==JSON.stringify(preview));
  async function execute(plan:Plan,prefix:readonly Point[]=[]){
    if(status.state!=="READY"||!status.capabilities?.operations.includes("diagonalize")||
      !status.capabilities.engines[plan.engine]?.available||running)return;
    const controller=new AbortController();cancelRef.current=controller;
    setRunning(true);setMessage(prefix.length?"Resuming from verified saved points…":"Calculating verified spectrum points…");
    setResult(null);setLivePoints([...prefix]);setLivePlan(plan);setSelected(prefix.length?prefix.length-1:null);
    const liveBuffer:Point[]=[];
    try{
      if(!prefix.length)await bridge.saveSpectrumStudy(plan.schema==="quantum-spectrum-study/v1"?
        {schema:"quantum-spectrum-study-result/v1",studyId:plan.studyId,plan,status:"cancelled",points:[],computedAt:new Date().toISOString()}:
        {schema:"quantum-spectrum-study-result/v2",studyId:plan.studyId,plan,status:"cancelled",points:[],computedAt:new Date().toISOString()});
      const append=async(point:Point)=>{
        const all=[...prefix,...liveBuffer,point],status=point.index===plan.axis.points-1?"completed" as const:"cancelled" as const;
        if(plan.schema==="quantum-spectrum-study/v1")await bridge.saveSpectrumStudy({schema:"quantum-spectrum-study-result/v1",studyId:plan.studyId,
          plan,status,points:all as SpectrumStudyPoint[],computedAt:new Date().toISOString()});
        else await bridge.saveSpectrumStudy({schema:"quantum-spectrum-study-result/v2",studyId:plan.studyId,
          plan,status,points:all as SpectrumOmegaStudyPoint[],computedAt:new Date().toISOString()});
        liveBuffer.push(point);setLivePoints(current=>[...current,point]);setSelected(point.index);
      };
      const completed=plan.schema==="quantum-spectrum-study/v1"?
        await runSpectrumStudy(plan,job=>bridge.run(job),append,controller.signal,prefix as SpectrumStudyPoint[]):
        await runSpectrumOmegaStudy(plan,job=>bridge.run(job),append,controller.signal,prefix as SpectrumOmegaStudyPoint[]);
      const durable=await bridge.getSpectrumStudy(plan.studyId);
      setResult(durable);
      setSavedStudies(await bridge.listSpectrumStudies());
      setMessage(completed.status==="completed"?"Study complete; every point is a saved spectrum run.":
        `Cancelled after ${completed.points.length} saved points; no later points were launched.`);
    }catch(error){
      setMessage(`Study stopped: ${error instanceof Error?error.message:String(error)}. Reopen the saved checkpoint to retry.`);
      setSavedStudies(await bridge.listSpectrumStudies().catch(()=>[]));
    }
    finally{cancelRef.current=null;setRunning(false);}
  }
  async function run(){
    if(!preview||!ready||running)return;
    await execute({...preview,studyId:`study-${crypto.randomUUID()}`});
  }
  async function openStudy(studyId:string){
    if(running)return;
    try{
      const saved=await bridge.getSpectrumStudy(studyId);
      setResult(saved);setLivePlan(null);setLivePoints([]);setSelected(saved.points.length?0:null);
      setDraft(saved.schema==="quantum-spectrum-study-result/v1"?
        {omega:String(saved.plan.fixed.omega),start:String(saved.plan.axis.start),
          stop:String(saved.plan.axis.stop),points:String(saved.plan.axis.points),engine:saved.plan.engine,axisParameter:"delta"}:
        {omega:"0.8",delta:String(saved.plan.fixed.delta),start:String(saved.plan.axis.start),
          stop:String(saved.plan.axis.stop),points:String(saved.plan.axis.points),engine:saved.plan.engine,axisParameter:"omega"});
      setMessage(saved.status==="completed"?"Verified saved study reopened.":"Verified partial study reopened; resume to compute remaining points.");
    }catch(error){setMessage(`Cannot reopen study: ${error instanceof Error?error.message:String(error)}`);}
  }
  async function resume(){
    if(!result||result.status!=="cancelled"||running)return;
    try{
      const saved=await bridge.getSpectrumStudy(result.studyId);
      await execute(saved.plan,saved.points);
    }catch(error){setMessage(`Cannot resume study: ${error instanceof Error?error.message:String(error)}`);}
  }
  async function openPoint(runId:string){
    try{await onOpenPoint(runId)}catch(error){setMessage(error instanceof Error?error.message:String(error));}
  }
  const bound=shownPlan&&points.length?Math.max(.1,...points.flatMap(point=>point.eigenvalues.map(Math.abs)))*1.2:1;
  const x=(index:number)=>40+640*index/Math.max(1,(shownPlan?.axis.points??2)-1);
  const y=(energy:number)=>150-110*energy/bound;
  return <section className="panel spectrum-study-lab" data-testid="spectrum-study-lab">
    <p className="eyebrow">TWO-LEVEL / STATIC EIGENENERGY STUDY</p>
    <h2>Two-level energy study</h2>
    <p>Scan Δ at fixed Ω, or Ω at fixed Δ. Output is E₋ and E₊ in normalized units (ħ = 1), not the final-state probability from a dynamics sweep. Each point is a saved run.</p>
    <div className="spectrum-study-fields">
      <label>Vary<select aria-label="Study axis" value={draft.axisParameter??"delta"} disabled={running}
        onChange={event=>setDraft(current=>({...current,axisParameter:event.target.value as "delta"|"omega",
          delta:current.delta??"1",start:"-2",stop:"2"}))}>
        <option value="delta">Δ · detuning</option><option value="omega">Ω · transverse coupling</option></select></label>
      {draft.axisParameter==="omega"?<label>Fixed Δ<input aria-label="Study fixed Delta" type="number" value={draft.delta??"1"} disabled={running}
        onChange={event=>setDraft(current=>({...current,delta:event.target.value}))}/></label>:
        <label>Fixed Ω<input aria-label="Study fixed Omega" type="number" value={draft.omega} disabled={running}
          onChange={event=>setDraft(current=>({...current,omega:event.target.value}))}/></label>}
      <label>{draft.axisParameter==="omega"?"Ω":"Δ"} from<input aria-label="Study axis from" type="number" value={draft.start} disabled={running}
        onChange={event=>setDraft(current=>({...current,start:event.target.value}))}/></label>
      <label>{draft.axisParameter==="omega"?"Ω":"Δ"} to<input aria-label="Study axis to" type="number" value={draft.stop} disabled={running}
        onChange={event=>setDraft(current=>({...current,stop:event.target.value}))}/></label>
      <label>Points<input aria-label="Study points" type="number" min="3" max="31" step="1" value={draft.points} disabled={running}
        onChange={event=>setDraft(current=>({...current,points:event.target.value}))}/></label>
      <label>Engine<select aria-label="Study engine" value={draft.engine} disabled={running}
        onChange={event=>setDraft(current=>({...current,engine:event.target.value as EngineName}))}>
        <option value="qutip">QuTiP</option><option value="native">Native · NumPy</option></select></label>
    </div>
    {!preview&&<p className="validation">Enter finite Δ and Ω within ±10⁶, an increasing axis range, and 3–31 points.</p>}
    {!ready&&<p className="validation">Selected engine is not ready.</p>}
    <div className="spectrum-study-actions">
      <button type="button" onClick={()=>void run()} disabled={!preview||!ready||running} data-testid="run-spectrum-study">Run energy study</button>
      {result?.status==="cancelled"&&<button type="button" onClick={()=>void resume()}
        disabled={status.state!=="READY"||!status.capabilities?.engines[result.plan.engine]?.available||running}
        data-testid="resume-spectrum-study">Resume saved study</button>}
      {running&&<button type="button" onClick={()=>{cancelRef.current?.abort();setMessage("Stopping after the current point…");}} data-testid="cancel-spectrum-study">Cancel between points</button>}
      <span data-testid="spectrum-study-progress">{points.length}/{shownPlan?.axis.points??draft.points} verified points</span>
    </div>
    {message&&<p role="status" data-testid="spectrum-study-status">{message}</p>}
    {savedStudies.length>0&&<div className="spectrum-study-saved" data-testid="saved-spectrum-studies">
      <p className="eyebrow">VERIFIED SAVED STUDIES</p>
      {savedStudies.slice(0,10).map(study=><button key={study.studyId} type="button" disabled={running}
        onClick={()=>void openStudy(study.studyId)} data-testid={`open-study-${study.studyId}`}>
        {study.computedAt.slice(0,19).replace("T"," ")} · {"fixedOmega" in study?
          `E±(Δ ${format(study.deltaStart)}→${format(study.deltaStop)}, Ω ${format(study.fixedOmega)})`:
          `E±(Ω ${format(study.omegaStart)}→${format(study.omegaStop)}, Δ ${format(study.fixedDelta)})`} · {study.engine} · {study.completedPoints}/{study.totalPoints} · {study.status}
      </button>)}
    </div>}
    {shownPlan&&points.length>0&&<>
      <svg className="spectrum-study-chart" viewBox="0 0 720 300" role="img" aria-label="Two-level eigenenergy sweep" data-testid="spectrum-study-chart">
        <line x1="40" y1="150" x2="680" y2="150" stroke="#536777" strokeDasharray="4 5"/>
        {([0,1] as const).map(level=><polyline key={level} fill="none" stroke={level===0?"#79d9c1":"#f2b36f"} strokeWidth="2"
          points={points.map(point=>`${x(point.index)},${y(point.eigenvalues[level])}`).join(" ")}/>)}
        {points.map(point=><g key={point.index} role="button" tabIndex={0}
          aria-label={`Select energy sample ${point.index+1}, ${axisSymbol(shownPlan)} ${format(coordinate(point))}`}
          aria-pressed={selected===point.index} onClick={()=>setSelected(point.index)}
          onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setSelected(point.index);}}}>
          <line x1={x(point.index)} x2={x(point.index)} y1={y(point.eigenvalues[0])} y2={y(point.eigenvalues[1])}
            stroke="transparent" strokeWidth="18"/>
          <circle cx={x(point.index)} cy={y(point.eigenvalues[0])} r="6" fill="#79d9c1"/>
          <circle cx={x(point.index)} cy={y(point.eigenvalues[1])} r="6" fill="#f2b36f"/>
        </g>)}
        <text x="48" y="32" fill="#f2b36f">E₊</text><text x="48" y="282" fill="#79d9c1">E₋</text>
      </svg>
      <p>{result?.status==="cancelled"?"Partial study":stale?"Study is out of date with edited inputs":"Each plotted point is backed by a saved, verified spectrum run."}</p>
      {selectedPoint&&<div className="spectrum-study-selection" data-testid="spectrum-study-selection">
        <p className="eyebrow">SAMPLE {selectedPoint.index+1} / {shownPlan.axis.points}</p>
        <strong>Δ = {format("delta" in selectedPoint?selectedPoint.delta:(shownPlan as SpectrumOmegaStudyPlan).fixed.delta)} · Ω = {format("omega" in selectedPoint?selectedPoint.omega:(shownPlan as SpectrumStudyPlan).fixed.omega)}</strong>
        <p>E₋ = {format(selectedPoint.eigenvalues[0])} · E₊ = {format(selectedPoint.eigenvalues[1])}</p>
        <code>{selectedPoint.runId}</code>
        <div className="spectrum-study-actions">
          <button type="button" onClick={()=>onDraftPoint("delta" in selectedPoint?selectedPoint.delta:(shownPlan as SpectrumOmegaStudyPlan).fixed.delta,
            "omega" in selectedPoint?selectedPoint.omega:(shownPlan as SpectrumStudyPlan).fixed.omega)}>Use as parameter draft</button>
          <button type="button" onClick={()=>void openPoint(selectedPoint.runId)}>Open verified spectrum</button>
        </div>
      </div>}
    </>}
  </section>;
}
