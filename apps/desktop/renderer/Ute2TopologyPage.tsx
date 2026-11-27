import React,{useEffect,useState} from "react";
import type {Ute2TopologyParameters,Ute2TopologyResult,Ute2TopologyRunSummary} from "../../../packages/contracts/ute2-topology";
import {ute2TopologyJob} from "../../../packages/models/ute2-topology";

const defaults={mu:"-2",delta:"0.8",mesh:"16"};
const fmt=(value:number|null)=>value===null?"withheld":value.toFixed(5);

export function Ute2TopologyPage({ready}:{ready:boolean}){
  const [inputs,setInputs]=useState(defaults);
  const [saved,setSaved]=useState<Ute2TopologyRunSummary[]>([]);
  const [result,setResult]=useState<Ute2TopologyResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    void window.quantum.listUte2TopologyRuns().then(rows=>{if(active)setSaved(rows);})
      .catch(cause=>{if(active)setError(String(cause));});
    return()=>{active=false;};
  },[]);
  const p=Object.fromEntries(Object.entries(inputs).map(([key,value])=>[key,Number(value)])) as unknown as Ute2TopologyParameters;
  const valid=Object.values(inputs).every(value=>value.trim()!=="")&&p.mu>=-5&&p.mu<=5&&
    p.delta>=0&&p.delta<=2&&[12,16,20].includes(p.mesh);
  async function run(){
    if(!ready||!valid||busy)return;
    setBusy(true);setError("");setResult(null);
    try{
      const output=await window.quantum.runUte2Topology(ute2TopologyJob(p,`classd-${crypto.randomUUID()}`));
      setResult(await window.quantum.getUte2TopologyRun(output.runId));
      setSaved(await window.quantum.listUte2TopologyRuns());
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setBusy(false);}
  }
  async function open(runId:string){
    setBusy(true);setError("");setResult(null);
    try{
      const verified=await window.quantum.getUte2TopologyRun(runId);
      setInputs(Object.fromEntries(Object.entries(verified.model.parameters).map(([key,value])=>[key,String(value)])) as typeof defaults);
      setResult(verified);
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setBusy(false);}
  }
  const pinned=saved.find(row=>row.runId===result?.runId);
  return <div className="companion-page" data-testid="ute2-topology-page">
    <section className="panel companion-model">
      <p className="eyebrow">UTe₂ JOURNEY / STEP 3A · CONDITIONAL CLASS-D TOY</p>
      <h2>Qualify the bulk gap before topology.</h2>
      <p>For the separate spinless toy H(k)=Δₚ sin(kₓa)τₓ−Δₚ sin(kᵧa)τᵧ+[−2(cos kₓa+cos kᵧa)−μ]τᶻ, with t=a=1, the worker minimizes the energy over the continuous Brillouin zone. It reports an occupied-band Chern number only when the gap is open and two link meshes agree with a separate Berry-curvature integral.</p>
      <p className="scope-note">Source: supplied chapter §11, Eqs. 25–27 (PDF pp. 7–8). Orientation: occupied band; kₓ then kᵧ; x-major half-open torus. The chapter PDF remains local. This is not a UTe₂ band structure, spinful symmetry assignment, observed phase, edge-state calculation, or installed-app result.</p>
      <div className="dynamics-actions">
        <label>μ / t <input aria-label="Class-D mu" type="number" min="-5" max="5" step="0.1" value={inputs.mu}
          onChange={event=>{setInputs(current=>({...current,mu:event.target.value}));setResult(null);}}/></label>
        <label>Δₚ / t <input aria-label="Class-D delta" type="number" min="0" max="2" step="0.1" value={inputs.delta}
          onChange={event=>{setInputs(current=>({...current,delta:event.target.value}));setResult(null);}}/></label>
        <label>Coarse mesh <select aria-label="Class-D mesh" value={inputs.mesh}
          onChange={event=>{setInputs(current=>({...current,mesh:event.target.value}));setResult(null);}}>
          {[12,16,20].map(n=><option key={n} value={n}>{n} × {n}</option>)}
        </select></label>
        <button type="button" className="run-button" data-testid="run-ute2-topology" disabled={!ready||!valid||busy} onClick={()=>void run()}>{busy?"Working…":"Run and save"}</button>
      </div>
      {!ready&&<p className="scope-note">Worker unavailable. Verified saved runs can still be reopened.</p>}
      {!valid&&<p role="status">Use μ −5…5, Δₚ 0…2, and a listed mesh size.</p>}
      {error&&<p role="alert">{error}</p>}
      {result&&<div data-testid="ute2-topology-result">
        <p><strong>Verified saved run:</strong> {result.runId} · {result.provenance.computedAt}</p>
        <p><strong>Result SHA-256:</strong> <code>{pinned?.resultSha256??"saved source unavailable"}</code></p>
        <p><strong>Continuous-BZ minimum E+:</strong> {result.bulkMinimumEnergy.toFixed(5)} · <strong>bulk band separation:</strong> {result.bulkGap.toFixed(5)} · <strong>fine-mesh sampled E+:</strong> {result.sampledMinimumEnergy.toFixed(5)}</p>
        <p data-testid="ute2-topology-status"><strong>Invariant status:</strong> {result.invariantStatus==="defined"?"defined for this toy and convention":result.invariantStatus==="gap_closed"?"withheld: exact bulk gap closed":"withheld: mesh or curvature unresolved"} · <strong>toy Chern:</strong> {result.chern===null?"withheld":result.chern}</p>
        <table><thead><tr><th>Diagnostic</th><th>Coarse</th><th>Fine</th></tr></thead><tbody>
          <tr><td>Link mesh</td><td>{result.coarseMesh} × {result.coarseMesh}</td><td>{result.fineMesh} × {result.fineMesh}</td></tr>
          <tr><td>Link Chern (diagnostic)</td><td>{fmt(result.coarseLinkChern)}</td><td>{fmt(result.fineLinkChern)}</td></tr>
          <tr><td>Minimum link overlap</td><td>{fmt(result.coarseMinimumLink)}</td><td>{fmt(result.fineMinimumLink)}</td></tr>
          <tr><td>Independent curvature integral (4× / 8× mesh)</td><td>{fmt(result.curvatureIntegralCoarse)}</td><td>{fmt(result.curvatureIntegralFine)}</td></tr>
        </tbody></table>
        <p className="scope-note">The continuous gap is obtained by exact minimization of E² over cos(kₓa),cos(kᵧa)∈[−1,1]. The sign check at high-symmetry momenta and an independent geometric degree check also gate a defined value. Link diagnostics alone are not an invariant claim. Saved values are rechecked against the job on every reopen.</p>
      </div>}
      <h4>Saved class-D toy runs</h4>
      {saved.length===0?<p>No saved class-D toy runs yet.</p>:<div className="dynamics-actions">{saved.map(row=><button type="button" key={row.runId} disabled={busy} onClick={()=>void open(row.runId)}>Open μ={row.parameters.mu}, Δₚ={row.parameters.delta} · {row.invariantStatus} · {row.computedAt}</button>)}</div>}
    </section>
  </div>;
}
