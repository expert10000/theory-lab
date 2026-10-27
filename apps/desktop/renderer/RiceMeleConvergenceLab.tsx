import React,{useEffect,useState} from "react";
import type {QuantumBridge,TopologyResult} from "../../../packages/contracts";
import {type RiceMeleConvergenceStudy,type RiceMeleConvergencePoint} from "../../../packages/contracts/rice-mele-convergence";
import {deriveRiceMeleConvergenceStudy} from "../../../packages/models/rice-mele-convergence";
import {linkedRiceMeleTraces} from "../../../packages/models/rice-mele-comparison";
import {format} from "./Spectrum";

function Series({title,points,x,y,unit,onOpenRun}:{title:string;points:RiceMeleConvergencePoint[];
  x:(p:RiceMeleConvergencePoint)=>number;y:(p:RiceMeleConvergencePoint)=>number;unit:string;
  onOpenRun:(id:string)=>Promise<void>}){
  const xs=points.map(x),ys=points.map(y),xmin=Math.min(...xs),xmax=Math.max(...xs),
    ymin=Math.min(...ys),ymax=Math.max(...ys);
  const px=(v:number)=>32+276*(v-xmin)/(xmax-xmin||1);
  const py=(v:number)=>148-116*(v-ymin)/(ymax-ymin||1);
  return <div data-testid={title.includes("duration")?"rice-duration-series":"rice-width-series"}>
    <h4>{title}</h4><p>Recorded values in {unit}; axes use exact stored run inputs.</p>
    <svg width="340" height="175" viewBox="0 0 340 175" role="img" aria-label={title}>
      <path d="M32 22 V148 H318" fill="none" stroke="currentColor" opacity="0.45"/>
      <polyline points={points.map(p=>`${px(x(p))},${py(y(p))}`).join(" ")} fill="none" stroke="#78d8c0" strokeWidth="2"/>
      {points.map(p=><circle key={p.runId} cx={px(x(p))} cy={py(y(p))} r="5" fill="#78d8c0"/>)}
      <text x="32" y="168" fill="currentColor" fontSize="11">{format(xmin)}</text>
      <text x="280" y="168" fill="currentColor" fontSize="11">{format(xmax)}</text>
    </svg>
    {points.map(p=><p key={p.runId}><button onClick={()=>void onOpenRun(p.runId)}>
      {x(p)} → {format(y(p))} {unit}</button> · run {p.runId} · SHA-256 {p.resultSha256}
      {title.includes("duration")?
        ` · ${p.periodicStatus} · step drift ${format(p.bulkTimeStepDrift)} · momentum drift ${format(p.bulkMomentumDrift)} · norm drift ${format(p.bulkNormDrift)}`:
        ` · ${p.chainStatus} · continuity ${format(p.chainContinuityResidual)} · width drift ${format(p.chainWidthDrift)} · step drift ${format(p.chainTimeStepDrift)} · particle drift ${format(p.chainParticleDrift)} · norm drift ${format(p.chainNormDrift)}`}</p>)}
  </div>;
}

export function RiceMeleConvergenceLab({bridge,onOpenRun}:{bridge:QuantumBridge;onOpenRun:(id:string)=>Promise<void>}){
  const [runs,setRuns]=useState<TopologyResult[]>([]),[anchor,setAnchor]=useState(""),
    [durationRun,setDurationRun]=useState(""),[durationRun2,setDurationRun2]=useState(""),
    [widthRun,setWidthRun]=useState(""),[widthRun2,setWidthRun2]=useState("");
  const [study,setStudy]=useState<RiceMeleConvergenceStudy|null>(null),[saved,setSaved]=useState<{studyId:string;computedAt:string;count:number}[]>([]),
    [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  async function refresh(){
    try{const summaries=(await bridge.listRuns()).filter(row=>row.operation==="topology"&&row.model==="rice_mele_pump");
      const candidate=await Promise.all(summaries.map(row=>bridge.getTopologyRun(row.runId).catch(()=>null)));
      setRuns(candidate.filter((r):r is TopologyResult=>!!r&&!!linkedRiceMeleTraces(r)));
      setSaved(await bridge.listRiceMeleConvergenceStudies());setMessage("");
    }catch(error){setMessage(String(error));}
  }
  useEffect(()=>{void refresh();},[bridge]);
  const byId=new Map(runs.map(r=>[r.runId,r]));
  const a=byId.get(anchor),ap=a?.model.type==="rice_mele_pump"?a.model.parameters:null;
  const cycleMatch=(r:TopologyResult)=>{
    if(!ap||r.model.type!=="rice_mele_pump")return false;
    const p=r.model.parameters;
    return (["baseHopping","modulation","staggerAmplitude","staggerOffset","kSamples","phaseSamples","stepsPerPhase"] as const)
      .every(key=>p[key]===ap[key]);
  };
  const durationOptions=runs.filter(r=>cycleMatch(r)&&r.runId!==anchor&&r.model.type==="rice_mele_pump"&&r.model.parameters.chainCells===ap?.chainCells);
  const widthOptions=runs.filter(r=>cycleMatch(r)&&r.runId!==anchor&&r.model.type==="rice_mele_pump"&&r.model.parameters.duration===ap?.duration);
  const options=(values:TopologyResult[])=><><option value="">Choose a verified run</option>{values.map(r=>
    <option value={r.runId} key={r.runId}>{r.runId} · {r.model.type==="rice_mele_pump"?`duration ${r.model.parameters.duration}, width ${r.model.parameters.chainCells}`:""}</option>)}</>;
  async function create(){
    if(!a||!durationRun||!durationRun2||!widthRun||!widthRun2||
      new Set([anchor,durationRun,durationRun2,widthRun,widthRun2]).size!==5)return;
    const d=byId.get(durationRun),d2=byId.get(durationRun2),w=byId.get(widthRun),w2=byId.get(widthRun2);
    if(!d||!d2||!w||!w2)return;
    setBusy(true);
    try{
      const duration=[a,d,d2].sort((x,y)=>((x.model.type==="rice_mele_pump"?x.model.parameters.duration:0)??0)-
        ((y.model.type==="rice_mele_pump"?y.model.parameters.duration:0)??0)).map(r=>r.runId);
      const width=[a,w,w2].sort((x,y)=>((x.model.type==="rice_mele_pump"?x.model.parameters.chainCells:0)??0)-
        ((y.model.type==="rice_mele_pump"?y.model.parameters.chainCells:0)??0)).map(r=>r.runId);
      const plan={schema:"quantum-rice-mele-convergence-plan/v1" as const,
        studyId:`rice-convergence-${crypto.randomUUID()}`,anchorRunId:anchor,durationRuns:duration,widthRuns:width};
      const ordered=[...new Set([...duration,...width])].map(id=>byId.get(id)!);
      const value=await deriveRiceMeleConvergenceStudy(plan,ordered);
      setStudy(await bridge.saveRiceMeleConvergenceStudy(value));setSaved(await bridge.listRiceMeleConvergenceStudies());
      setMessage("Five exact saved runs linked and verified.");
    }catch(error){setMessage(`Cannot create convergence study: ${String(error)}`);}
    finally{setBusy(false);}
  }
  async function reopen(id:string){try{setStudy(await bridge.getRiceMeleConvergenceStudy(id));setMessage("Verified study reopened.");}
    catch(error){setMessage(`Cannot reopen study: ${String(error)}`);}}
  const points=new Map(study?.sources.map(p=>[p.runId,p])??[]);
  return <section className="panel spectrum-study-lab" data-testid="rice-mele-convergence-lab">
    <p className="eyebrow">RICE–MELE / SAVED-RUN CONVERGENCE</p><h2>Compare controlled saved runs</h2>
    <p>Select an anchor and four other verified runs. Three duration samples hold chain width fixed; three width samples hold duration fixed. All cycle and sampling parameters must match exactly. Each charge keeps its own units and diagnostic meaning.</p>
    <button onClick={()=>void refresh()}>Refresh verified runs</button>
    <div className="spectrum-study-fields">
      <label>Anchor run<select aria-label="Rice convergence anchor" value={anchor} onChange={e=>{setAnchor(e.target.value);setDurationRun("");setDurationRun2("");setWidthRun("");setWidthRun2("");}}>{options(runs)}</select></label>
      <label>Duration sample 2, same width<select aria-label="Rice convergence duration run 2" value={durationRun} onChange={e=>setDurationRun(e.target.value)}>{options(durationOptions)}</select></label>
      <label>Duration sample 3, same width<select aria-label="Rice convergence duration run 3" value={durationRun2} onChange={e=>setDurationRun2(e.target.value)}>{options(durationOptions)}</select></label>
      <label>Width sample 2, same duration<select aria-label="Rice convergence width run 2" value={widthRun} onChange={e=>setWidthRun(e.target.value)}>{options(widthOptions)}</select></label>
      <label>Width sample 3, same duration<select aria-label="Rice convergence width run 3" value={widthRun2} onChange={e=>setWidthRun2(e.target.value)}>{options(widthOptions)}</select></label>
    </div>
    <button disabled={busy||!anchor||!durationRun||!durationRun2||!widthRun||!widthRun2||
      new Set([anchor,durationRun,durationRun2,widthRun,widthRun2]).size!==5} onClick={()=>void create()}>Link five verified runs</button>
    {message&&<p role="status">{message}</p>}
    {!!saved.length&&<div className="spectrum-study-saved"><p className="eyebrow">SAVED STUDIES</p>{saved.map(row=><button key={row.studyId} onClick={()=>void reopen(row.studyId)}>{row.computedAt.slice(0,19).replace("T"," ")} · {row.count} sources</button>)}</div>}
    {study&&<div data-testid="rice-mele-convergence-result">
      <h3>Exact saved cycle</h3><p>{JSON.stringify(study.cycle)} · {study.sources.length} immutable sources. Plot lines join recorded points; no asymptotic fit is inferred.</p>
      <Series title="Periodic charge against duration" points={study.durationRuns.map(id=>points.get(id)!)} x={p=>p.duration} y={p=>p.periodicCharge}
        unit={study.units.periodicCharge} onOpenRun={onOpenRun}/>
      <Series title="Finite-chain central-bond charge against width" points={study.widthRuns.map(id=>points.get(id)!)} x={p=>p.chainCells} y={p=>p.chainCentralBondCharge}
        unit={study.units.chainCentralBondCharge} onOpenRun={onOpenRun}/>
      <button onClick={()=>void bridge.exportRiceMeleConvergenceScene(study.studyId).then(path=>setMessage(path?`Verified study scene: ${path}`:"Export cancelled")).catch(e=>setMessage(String(e)))}>Export read-only study .qscene</button>
      <p>The two charges are separate observables; the study does not claim they converge to the same value.</p>
    </div>}
  </section>;
}
