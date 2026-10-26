import React,{useEffect,useState} from "react";
import type {QuantumBridge,TopologyResult,WorkerStatus} from "../../../packages/contracts";
import {assertHofstadterEdgePlan,type HofstadterEdgePlan,type HofstadterEdgeStudy} from "../../../packages/contracts/hofstadter-edge-study";
import {deriveHofstadterEdgeStudy,hofstadterEdgeJobs} from "../../../packages/models/hofstadter-edge-study";
import {format} from "./Spectrum";

export function HofstadterEdgeLab({bridge,status,onOpenRun}:{bridge:QuantumBridge;status:WorkerStatus;onOpenRun:(runId:string)=>Promise<void>}){
  const [p,setP]=useState("1"),[q,setQ]=useState("6"),[hopping,setHopping]=useState("1"),[grid,setGrid]=useState("9");
  const [filled,setFilled]=useState("1"),[samples,setSamples]=useState("31"),[running,setRunning]=useState(false);
  const [convergent,setConvergent]=useState(true);
  const [study,setStudy]=useState<HofstadterEdgeStudy|null>(null),[message,setMessage]=useState("");
  const [saved,setSaved]=useState<{studyId:string;computedAt:string;status:string}[]>([]);
  useEffect(()=>{void bridge.listHofstadterEdgeStudies().then(setSaved).catch(()=>{});},[bridge]);
  let draft:HofstadterEdgePlan|null=null;
  try{draft={schema:"quantum-hofstadter-edge-plan/v1",studyId:"preview",p:Number(p),q:Number(q),
    hopping:Number(hopping),grid:Number(grid) as 7|9|11,occupiedBands:Number(filled),
    stripSamples:Number(samples) as 17|31,widths:convergent?[18,18+Number(q)]:[18,24],
    ...(convergent?{convergenceSamples:17 as const}:{})};assertHofstadterEdgePlan(draft);}catch{draft=null;}
  const stale=!!study&&(!draft||JSON.stringify({...study.plan,studyId:"preview"})!==JSON.stringify(draft));
  async function run(plan:HofstadterEdgePlan){
    if(running||status.state!=="READY")return;setRunning(true);setStudy(null);setMessage("Computing verified bulk and matching-termination finite strips on two momentum grids…");
    try{
      const results=[] as TopologyResult[];
      for(const job of hofstadterEdgeJobs(plan))results.push(await bridge.topology(job));
      const value=await deriveHofstadterEdgeStudy(plan,results);
      const verified=await bridge.saveHofstadterEdgeStudy(value);setStudy(verified);
      setSaved(await bridge.listHofstadterEdgeStudies());setMessage("Bulk/strip sources saved and hash-verified.");
    }catch(error){setMessage(`Comparison failed: ${error instanceof Error?error.message:String(error)}`);}
    finally{setRunning(false);}
  }
  async function reopen(studyId:string){try{const value=await bridge.getHofstadterEdgeStudy(studyId);setStudy(value);
    setP(String(value.plan.p));setQ(String(value.plan.q));setHopping(String(value.plan.hopping));
    setGrid(String(value.plan.grid));setFilled(String(value.plan.occupiedBands));setSamples(String(value.plan.stripSamples));
    setConvergent(value.plan.convergenceSamples!==undefined);
    setMessage("Verified bulk-edge study reopened.");
  }catch(error){setMessage(`Cannot reopen comparison: ${error instanceof Error?error.message:String(error)}`);}}
  return <section className="panel spectrum-study-lab" data-testid="hofstadter-edge-lab">
    <p className="eyebrow">HOFSTADTER / BULK–EDGE COMPARISON</p><h2>Compare a bulk gap with two finite strips</h2>
    <p>Five immutable runs share flux, hopping and filling: one periodic bulk run, plus two matching-termination strips each sampled on 17 and 31 momentum points. Adjacent states are paired by eigenvector overlap. The periodic seam, assignments and crossing positions must converge; unresolved evidence remains undefined. Older three-run studies remain reopenable.</p>
    <div className="spectrum-study-fields">
      <label>Flux numerator p<input aria-label="Edge flux numerator" type="number" step="1" value={p} disabled={running} onChange={e=>setP(e.target.value)}/></label>
      <label>Flux denominator q<select aria-label="Edge flux denominator" value={q} disabled={running} onChange={e=>setQ(e.target.value)}>{[3,4,5,6,7].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Hopping t<input aria-label="Edge hopping" type="number" min="0.25" max="2" step="0.05" value={hopping} disabled={running} onChange={e=>setHopping(e.target.value)}/></label>
      <label>Momentum grid<select aria-label="Edge bulk grid" value={grid} disabled={running} onChange={e=>setGrid(e.target.value)}><option>7</option><option>9</option><option>11</option></select></label>
      <label>Occupied bands<select aria-label="Edge occupied bands" value={filled} disabled={running} onChange={e=>setFilled(e.target.value)}>{Array.from({length:Math.max(0,Number(q)-1)},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label>
      <label>Fine strip momentum samples<select aria-label="Edge strip samples" value={samples} disabled={running||convergent} onChange={e=>setSamples(e.target.value)}><option>17</option><option>31</option></select></label>
    </div>
    <p>New study widths: 18 and 18+q open sites, with the same x-origin and right-boundary phase. For p/q=1/5 and one occupied band the two-grid result resolves; 1/3 exposes an ambiguous assignment. The view makes no transport or unique-channel claim.</p>
    {!draft&&<p className="validation">Use reduced nonzero p/q, q=3…7, occupied bands 1…q−1 and t=0.25…2.</p>}
    <div className="spectrum-study-actions"><button disabled={!draft||running||status.state!=="READY"} onClick={()=>draft&&void run({...draft,studyId:`hof-edge-${crypto.randomUUID()}`})}>{running?"Computing…":"Run verified bulk-edge comparison"}</button></div>
    {message&&<p role="status">{message}</p>}
    {!!saved.length&&<div className="spectrum-study-saved"><p className="eyebrow">VERIFIED SAVED COMPARISONS</p>{saved.slice(0,10).map(row=><button key={row.studyId} disabled={running} onClick={()=>void reopen(row.studyId)}>{row.computedAt.slice(0,19).replace("T"," ")} · {row.status}</button>)}</div>}
    {study&&<div className="spectrum-study-selection" data-testid="hofstadter-edge-result">
      <p>{stale?"Saved comparison inputs differ from the editable draft.":"Exact verified run inputs are displayed below."}</p>
      <h3>Bulk–edge status: {study.comparison.status}</h3><p>{study.comparison.reason}</p>
      <p>Flux {study.plan.p}/{study.plan.q} · {study.plan.occupiedBands} occupied bands · global gap {format(study.bulk.globalGap)} hopping energy ({study.bulk.gapStatus}) · bulk Hall {study.bulk.hall??"undefined"} e²/h.</p>
      <p>Fermi energy {study.bulk.fermiEnergy===null?"undefined":format(study.bulk.fermiEnergy)} · bulk sampling {study.bulk.samplingConverged?"converged":"unresolved"} · maximum crossing-momentum drift {study.comparison.maximumKyDrift===null?"undefined":format(study.comparison.maximumKyDrift)} rad / lattice constant.</p>
      {study.widths.map(w=><div key={w.cells}><strong>{w.cells} open sites · sampled flow left {w.leftFlow}, right {w.rightFlow}</strong>
        <p>{w.crossings.length?w.crossings.map(c=>`${c.side} state ${c.stateIndex}, kᵧ ${format(c.ky)}, ${c.direction>0?"rising":"falling"}, minimum weight ${format(c.minimumWeight)}`).join(" · "):"No accepted crossings at the specified filling."}</p></div>)}
      {study.tracking?<div data-testid="hofstadter-edge-tracking"><h4>Overlap-validated branch evidence: {study.tracking.status}</h4>
        <p>{study.tracking.reason} · method {study.tracking.method} · maximum two-width drift {study.tracking.maximumKyDrift===null?"undefined":format(study.tracking.maximumKyDrift)} rad / lattice constant.</p>
        {study.tracking.widths.map(w=><p key={w.cells}>{w.cells} sites · {w.ambiguousCandidates} ambiguous crossing candidates · tracked flow left {w.leftFlow}, right {w.rightFlow}. {w.crossings.map(c=>`${c.side} ${c.stateIndex}→${c.targetStateIndex}, kᵧ ${format(c.ky)}, overlap ${format(c.overlap)}, margin ${format(c.margin)}`).join(" · ")}</p>)}
      </div>:<p>Legacy saved study: sorted-index crossing evidence only; eigenvector overlaps were not stored.</p>}
      {study.convergence&&<div data-testid="hofstadter-edge-convergence"><h4>Two-grid edge-flow convergence: {study.convergence.status}</h4>
        <p>{study.convergence.reason} · 17 and 31 momentum points, including the periodic seam · maximum grid crossing drift {study.convergence.maximumKyDrift===null?"undefined":format(study.convergence.maximumKyDrift)} rad / lattice constant.</p>
        {study.convergence.widths.map((w,i)=><p key={w.cells}>{w.cells} sites · termination phase {study.convergence!.terminations[i].rightPhase} (mod {study.plan.q}) · 17-point ambiguous {w.coarseAmbiguous}, seam {w.coarseSeam?.ambiguousStates??"unavailable"} · 31-point ambiguous {w.fineAmbiguous}, seam {w.fineSeam?.ambiguousStates??"unavailable"} · crossing drift {w.maximumKyDrift===null?"undefined":format(w.maximumKyDrift)}.</p>)}
      </div>}
      {study.sources.map(source=><p key={source.role}>{source.role} · run {source.runId} · SHA-256 {source.resultSha256} <button onClick={()=>void onOpenRun(source.runId).catch(e=>setMessage(String(e)))}>Open exact run</button></p>)}
      <button onClick={()=>void bridge.exportHofstadterEdgeScene(study.studyId).then(path=>setMessage(path?`Verified bulk-edge scene: ${path}`:"Export cancelled")).catch(e=>setMessage(String(e)))}>Export verified bulk-edge .qscene</button>
      <p>Finite-strip crossing consistency is a bounded diagnostic. No transport experiment, robust plateau or unique physical channel classification is claimed.</p>
    </div>}
  </section>;
}
