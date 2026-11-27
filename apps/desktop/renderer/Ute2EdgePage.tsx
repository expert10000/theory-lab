import React,{useEffect,useState} from "react";
import type {Ute2TopologyRunSummary} from "../../../packages/contracts/ute2-topology";
import type {Ute2EdgeResult,Ute2EdgeRunSummary} from "../../../packages/contracts/ute2-edge";

export function Ute2EdgePage({ready}:{ready:boolean}){
  const [bulkRuns,setBulkRuns]=useState<Ute2TopologyRunSummary[]>([]);
  const [saved,setSaved]=useState<Ute2EdgeRunSummary[]>([]);
  const [sourceId,setSourceId]=useState("");
  const [width,setWidth]=useState<12|16|20>(12);
  const [result,setResult]=useState<Ute2EdgeResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    const refresh=()=>void window.quantum.listUte2TopologyRuns().then(rows=>{
      if(!active)return;
      const qualified=rows.filter(row=>row.invariantStatus==="defined");
      setBulkRuns(qualified);setSourceId(current=>qualified.some(row=>row.runId===current)?current:qualified[0]?.runId??"");
    }).catch(cause=>{if(active)setError(String(cause));});
    refresh();
    void window.quantum.listUte2EdgeRuns().then(rows=>{if(active)setSaved(rows);})
      .catch(cause=>{if(active)setError(String(cause));});
    window.addEventListener("ute2-bulk-saved",refresh);
    return()=>{active=false;window.removeEventListener("ute2-bulk-saved",refresh);};
  },[]);
  const source=bulkRuns.find(row=>row.runId===sourceId);
  async function run(){
    if(!ready||!source||busy)return;
    setBusy(true);setError("");setResult(null);
    try{
      const output=await window.quantum.runUte2Edge({sourceRunId:source.runId,
        sourceResultSha256:source.resultSha256,width});
      setResult(await window.quantum.getUte2EdgeRun(output.runId));
      setSaved(await window.quantum.listUte2EdgeRuns());
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setBusy(false);}
  }
  async function open(runId:string){
    setBusy(true);setError("");setResult(null);
    try{
      const verified=await window.quantum.getUte2EdgeRun(runId);
      setResult(verified);setSourceId(verified.source.runId);
      setWidth(verified.widths[0].width as 12|16|20);
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setBusy(false);}
  }
  const pinned=saved.find(row=>row.runId===result?.runId);
  const fine=result?.widths[1];
  return <div className="companion-page" data-testid="ute2-edge-page">
    <section className="panel companion-model">
      <p className="eyebrow">UTe₂ JOURNEY / STEP 3B · FINITE OPEN-BOUNDARY TOY</p>
      <h2>Check finite-width edge localization.</h2>
      <p>Start from an exact saved bulk run whose invariant passed its gap and mesh gates. Open the x direction, keep y periodic, and diagonalize strips of width N and 2N at one particle-hole-invariant kᵧ. The two central states retain their full eigenvectors for residual, normalization, particle-hole, density, and boundary-weight checks.</p>
      <p className="scope-note">This is a finite-strip experiment on the chapter §11 spinless class-D toy (PDF pp. 7–8), using kᵧ=0 for μ&lt;0 or −π for μ&gt;0. It is separate from the bulk Chern calculation. A localized in-gap pair and decreasing finite-width splitting support an edge-state interpretation in this toy only; they do not establish a zero mode at finite width, a UTe₂ Majorana mode, or a material band structure. The chapter PDF stays local.</p>
      <div className="dynamics-actions">
        <label>Qualified saved bulk run <select aria-label="Class-D edge bulk source" value={sourceId}
          onChange={event=>{setSourceId(event.target.value);setResult(null);}}>
          {bulkRuns.length===0?<option value="">No qualified bulk runs</option>:bulkRuns.map(row=><option key={row.runId} value={row.runId}>μ={row.parameters.mu}, Δ={row.parameters.delta}, toy C={row.chern} · {row.runId}</option>)}
        </select></label>
        <label>Coarse strip width <select aria-label="Class-D edge width" value={width}
          onChange={event=>{setWidth(Number(event.target.value) as 12|16|20);setResult(null);}}>
          {[12,16,20].map(n=><option key={n} value={n}>{n} / {2*n} cells</option>)}
        </select></label>
        <button type="button" className="run-button" data-testid="run-ute2-edge" disabled={!ready||!source||busy} onClick={()=>void run()}>{busy?"Working…":"Run and save finite strip"}</button>
      </div>
      {!ready&&<p className="scope-note">Worker unavailable. Verified saved edge runs can still be reopened.</p>}
      {!source&&<p role="status">Run and save a qualified bulk toy first; closed-gap and unresolved runs cannot source a strip study.</p>}
      {error&&<p role="alert">{error}</p>}
      {result&&<div data-testid="ute2-edge-result">
        <p><strong>Verified saved edge run:</strong> {result.runId} · {result.provenance.computedAt}</p>
        <p><strong>Source bulk run:</strong> {result.source.runId} · SHA-256 <code>{result.source.resultSha256}</code></p>
        <p><strong>Edge result SHA-256:</strong> <code>{pinned?.resultSha256??"saved source unavailable"}</code></p>
        <p><strong>Selected kᵧ:</strong> {result.ky.toFixed(4)} rad/a · <strong>bulk E+ minimum:</strong> {result.bulkMinimumEnergy.toFixed(6)} · <strong>source toy Chern:</strong> {result.bulkChern}</p>
        <p data-testid="ute2-edge-status"><strong>Finite-strip status:</strong> {result.edgeStatus==="localized_in_gap"?"localized in-gap pair at selected kᵧ; splitting decreases with width":"localization or width convergence unresolved at selected kᵧ"}</p>
        <table><thead><tr><th>Open-x width</th><th>Central energies</th><th>Boundary weight</th><th>P-H overlap</th><th>Max residual</th></tr></thead><tbody>
          {result.widths.map(row=><tr key={row.width}><td>{row.width} cells</td><td>{row.energies[row.width-1].toExponential(3)} / {row.energies[row.width].toExponential(3)}</td><td>{row.boundaryWeight.toFixed(4)}</td><td>{row.particleHoleOverlap.toFixed(6)}</td><td>{row.maxResidual.toExponential(2)}</td></tr>)}
        </tbody></table>
        {fine&&<div><p>Fine-width central-pair probability per x cell; exposed edges are left and right.</p>
          <svg viewBox="0 0 640 180" role="img" aria-label="Finite strip central-pair density by x cell" style={{maxWidth:640,width:"100%",background:"#111b25"}}>
            <line x1="24" x2="616" y1="158" y2="158" stroke="#667b8f"/>
            <polyline fill="none" stroke="#8de0c3" strokeWidth="3" points={fine.pairDensity.map((value,i)=>`${24+592*i/(fine.width-1)},${158-135*value}`).join(" ")}/>
            <text x="24" y="174" fill="#b4c5d5" fontSize="12">left</text><text x="586" y="174" fill="#b4c5d5" fontSize="12">right</text>
          </svg>
        </div>}
        <p className="scope-note">Each saved central eigenvector is checked against the declared strip Hamiltonian. Both widths and the source bulk bytes are reverified on reopen. No result is inferred for other kᵧ values or the infinite-width limit.</p>
      </div>}
      <h4>Saved finite-strip runs</h4>
      {saved.length===0?<p>No saved finite-strip runs yet.</p>:<div className="dynamics-actions">{saved.map(row=><button type="button" key={row.runId} disabled={busy} onClick={()=>void open(row.runId)}>Open μ={row.mu}, Δ={row.delta}, width {row.width}/{2*row.width} · {row.edgeStatus} · {row.computedAt}</button>)}</div>}
    </section>
  </div>;
}
