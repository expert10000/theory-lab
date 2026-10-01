import React,{useEffect,useRef,useState} from "react";
import type {EngineName,QuantumBridge,WorkerStatus,WorkspaceSnapshot} from "../../../packages/contracts";
import type {SpectrumStudyPlan,SpectrumStudyPoint,SpectrumStudyResult} from "../../../packages/contracts/spectrum-study";
import {runSpectrumStudy,spectrumStudyPlan} from "../../../packages/models/spectrum-study";
import {format} from "./Spectrum";

export const SPECTRUM_STUDY_DEFAULTS={omega:"0.8",start:"-2",stop:"2",points:"21",engine:"qutip" as EngineName};
type Draft=NonNullable<WorkspaceSnapshot["spectrumStudy"]>;
export function SpectrumStudyLab({bridge,status,restored,restoreEpoch,onSnapshot,onOpenPoint,onDraftPoint}:{
  bridge:QuantumBridge;status:WorkerStatus;restored?:Draft;restoreEpoch?:number;
  onSnapshot?:(draft:Draft)=>void;onOpenPoint:(runId:string)=>Promise<void>;
  onDraftPoint:(delta:number,omega:number)=>void;
}){
  const [draft,setDraft]=useState<Draft>(SPECTRUM_STUDY_DEFAULTS);
  const [result,setResult]=useState<SpectrumStudyResult|null>(null);
  const [livePoints,setLivePoints]=useState<SpectrumStudyPoint[]>([]);
  const [livePlan,setLivePlan]=useState<SpectrumStudyPlan|null>(null);
  const [selected,setSelected]=useState<number|null>(null);
  const [running,setRunning]=useState(false);
  const [message,setMessage]=useState("");
  const cancelRef=useRef<AbortController|null>(null);
  useEffect(()=>{if(restoreEpoch){setDraft(restored??SPECTRUM_STUDY_DEFAULTS);setResult(null);setLivePoints([]);setLivePlan(null);setSelected(null);setMessage("Workspace inputs restored; recompute the study.");}},[restoreEpoch]);
  useEffect(()=>onSnapshot?.(draft),[draft,onSnapshot]);
  let preview:SpectrumStudyPlan|null=null;
  try{
    if([draft.omega,draft.start,draft.stop,draft.points].every(raw=>raw.trim()!==""))
      preview=spectrumStudyPlan("preview",draft.engine,Number(draft.omega),Number(draft.start),Number(draft.stop),Number(draft.points));
  }catch{/* Invalid drafts remain editable; no request is made. */}
  const ready=status.state==="READY"&&!!status.capabilities?.operations.includes("diagonalize")&&
    !!status.capabilities.engines[draft.engine]?.available;
  const shownPlan=result?.plan??livePlan;
  const points=result?.points??livePoints;
  const selectedPoint=selected===null?null:points.find(point=>point.index===selected)??null;
  const stale=!!result&&(!preview||result.plan.engine!==preview.engine||result.plan.fixed.omega!==preview.fixed.omega||
    JSON.stringify(result.plan.axis)!==JSON.stringify(preview.axis));
  async function run(){
    if(!preview||!ready||running)return;
    const plan={...preview,studyId:`study-${crypto.randomUUID()}`};
    const controller=new AbortController();cancelRef.current=controller;
    setRunning(true);setMessage("Calculating verified spectrum points…");setResult(null);setLivePoints([]);setLivePlan(plan);setSelected(null);
    try{
      const completed=await runSpectrumStudy(plan,job=>bridge.run(job),point=>{
        setLivePoints(current=>[...current,point]);setSelected(point.index);
      },controller.signal);
      setResult(completed);
      setMessage(completed.status==="completed"?"Study complete; every point is a saved spectrum run.":
        `Cancelled after ${completed.points.length} saved points; no later points were launched.`);
    }catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{cancelRef.current=null;setRunning(false);}
  }
  async function openPoint(runId:string){
    try{await onOpenPoint(runId)}catch(error){setMessage(error instanceof Error?error.message:String(error));}
  }
  const bound=shownPlan&&points.length?Math.max(.1,...points.flatMap(point=>point.eigenvalues.map(Math.abs)))*1.2:1;
  const x=(index:number)=>40+640*index/Math.max(1,(shownPlan?.axis.points??2)-1);
  const y=(energy:number)=>150-110*energy/bound;
  return <section className="panel spectrum-study-lab" data-testid="spectrum-study-lab">
    <p className="eyebrow">TWO-LEVEL / STATIC EIGENENERGY STUDY</p>
    <h2>Avoided crossing</h2>
    <p>Scan Δ at fixed Ω. Output is E₋ and E₊ in normalized units (ħ = 1), not the final-state probability from a dynamics sweep.</p>
    <div className="spectrum-study-fields">
      <label>Fixed Ω<input aria-label="Study fixed Omega" type="number" value={draft.omega} disabled={running}
        onChange={event=>setDraft(current=>({...current,omega:event.target.value}))}/></label>
      <label>Δ from<input aria-label="Study Delta from" type="number" value={draft.start} disabled={running}
        onChange={event=>setDraft(current=>({...current,start:event.target.value}))}/></label>
      <label>Δ to<input aria-label="Study Delta to" type="number" value={draft.stop} disabled={running}
        onChange={event=>setDraft(current=>({...current,stop:event.target.value}))}/></label>
      <label>Points<input aria-label="Study points" type="number" min="3" max="31" step="1" value={draft.points} disabled={running}
        onChange={event=>setDraft(current=>({...current,points:event.target.value}))}/></label>
      <label>Engine<select aria-label="Study engine" value={draft.engine} disabled={running}
        onChange={event=>setDraft(current=>({...current,engine:event.target.value as EngineName}))}>
        <option value="qutip">QuTiP</option><option value="native">Native · NumPy</option></select></label>
    </div>
    {!preview&&<p className="validation">Enter finite Δ and Ω within ±10⁶, an increasing Δ range, and 3–31 points.</p>}
    {!ready&&<p className="validation">Selected engine is not ready.</p>}
    <div className="spectrum-study-actions">
      <button type="button" onClick={()=>void run()} disabled={!preview||!ready||running} data-testid="run-spectrum-study">Run energy study</button>
      {running&&<button type="button" onClick={()=>{cancelRef.current?.abort();setMessage("Stopping after the current point…");}} data-testid="cancel-spectrum-study">Cancel between points</button>}
      <span data-testid="spectrum-study-progress">{points.length}/{shownPlan?.axis.points??draft.points} verified points</span>
    </div>
    {message&&<p role="status" data-testid="spectrum-study-status">{message}</p>}
    {shownPlan&&points.length>0&&<>
      <svg className="spectrum-study-chart" viewBox="0 0 720 300" role="img" aria-label="Two-level eigenenergy sweep" data-testid="spectrum-study-chart">
        <line x1="40" y1="150" x2="680" y2="150" stroke="#536777" strokeDasharray="4 5"/>
        {([0,1] as const).map(level=><polyline key={level} fill="none" stroke={level===0?"#79d9c1":"#f2b36f"} strokeWidth="2"
          points={points.map(point=>`${x(point.index)},${y(point.eigenvalues[level])}`).join(" ")}/>)}
        {points.map(point=><g key={point.index} role="button" tabIndex={0}
          aria-label={`Select energy sample ${point.index+1}, Delta ${format(point.delta)}`}
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
        <strong>Δ = {format(selectedPoint.delta)} · Ω = {format(shownPlan.fixed.omega)}</strong>
        <p>E₋ = {format(selectedPoint.eigenvalues[0])} · E₊ = {format(selectedPoint.eigenvalues[1])}</p>
        <code>{selectedPoint.runId}</code>
        <div className="spectrum-study-actions">
          <button type="button" onClick={()=>onDraftPoint(selectedPoint.delta,shownPlan.fixed.omega)}>Use as parameter draft</button>
          <button type="button" onClick={()=>void openPoint(selectedPoint.runId)}>Open verified spectrum</button>
        </div>
      </div>}
    </>}
  </section>;
}
