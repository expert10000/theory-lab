import React, { useEffect, useRef, useState } from "react";
import type { BoseHubbardResult, BoseHubbardRunSummary } from "../../../packages/contracts/bose-hubbard";

type VerifiedRun = { summary: BoseHubbardRunSummary; result: BoseHubbardResult };

/** Every displayed value comes from the saved-run loader's hash and physics checks. */
export function SavedDimerEnergy() {
  const [runs,setRuns] = useState<BoseHubbardRunSummary[]>([]);
  const [verified,setVerified] = useState<VerifiedRun|null>(null);
  const [level,setLevel] = useState(0);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const request = useRef(0);
  const current = useRef<{runId:string;level:number}|null>(null);

  async function open(runId:string,requestedLevel=0) {
    const token=++request.current;
    current.current=null; setVerified(null); setBusy(true); setMessage("");
    try {
      const result=await window.quantum.getBoseHubbardRun(runId);
      const rows=await window.quantum.listBoseHubbardRuns();
      const summary=rows.find(row=>row.runId===result.runId);
      if(!summary) throw new Error("Verified dimer run is missing from saved history");
      if(!result.states[requestedLevel]) throw new Error("Saved eigenstate is unavailable");
      if(token!==request.current) return;
      setRuns(rows); setVerified({summary,result}); setLevel(requestedLevel);
      current.current={runId,level:requestedLevel};
    } catch(error) {
      if(token===request.current) setMessage(error instanceof Error?error.message:String(error));
    } finally { if(token===request.current) setBusy(false); }
  }

  async function refresh() {
    const selection=current.current;
    if(selection) { await open(selection.runId,selection.level); return; }
    const token=++request.current;
    setBusy(true); setMessage("");
    try {
      const rows=await window.quantum.listBoseHubbardRuns();
      if(token===request.current) setRuns(rows);
    } catch(error) {
      if(token===request.current) setMessage(error instanceof Error?error.message:String(error));
    } finally { if(token===request.current) setBusy(false); }
  }

  useEffect(()=>{
    void refresh();
    const onFocus=()=>{ void refresh(); };
    window.addEventListener("focus",onFocus);
    return ()=>{ request.current++; window.removeEventListener("focus",onFocus); };
  },[]);

  const state=verified?.result.states[level];
  const energies=verified?.result.spectrum.energies ?? [];
  const low=energies[0]??0,span=Math.max(1e-9,(energies.at(-1)??0)-low);
  const particles=verified?.result.model.parameters.particles??1;

  return <div id="companion-saved-energy" className="companion-saved-energy" data-testid="companion-saved-energy">
    <div className="companion-saved-heading"><div><p className="eyebrow">SAVED RESULT / VERIFIED ON SELECTION</p><h4>Inspect an eigenstate from a computed dimer run</h4></div>
      <button type="button" disabled={busy} onClick={()=>void refresh()}>Refresh saved runs</button></div>
    <div className="companion-saved-picker"><label>Saved dimer run <select data-testid="companion-saved-run" aria-label="Companion saved dimer run" value={verified?.summary.runId??""} disabled={busy} onChange={event=>{ if(event.target.value) void open(event.target.value); else {request.current++;current.current=null;setVerified(null);} }}>
      <option value="">Select a saved run</option>{runs.map(run=><option key={run.runId} value={run.runId}>N={run.particles}, U/J={run.interactionRatio} · {run.computedAt}</option>)}
    </select></label></div>
    {runs.length===0&&!busy&&<p>No saved dimer run is available. Run and save one in Atlas, then return here.</p>}
    {busy&&<p role="status">Checking saved dimer…</p>}
    {message&&<p role="alert">{message}</p>}
    {verified&&state&&<div data-testid="companion-verified-dimer">
      <p className="companion-saved-provenance">N={particles} · U/J={verified.result.model.parameters.interactionRatio} · J=1 · run <code>{verified.result.runId}</code><br/>Result SHA-256 <code>{verified.summary.resultSha256}</code></p>
      <div className="companion-saved-grid">
        <div className="companion-saved-spectrum"><h5>Saved energy levels · J</h5>
          {energies.map((energy,index)=><button type="button" key={index} data-testid={`companion-saved-level-${index}`} aria-pressed={level===index} disabled={busy} onClick={()=>void open(verified.result.runId,index)}>
            <span>State {index}</span><span className="companion-level-track"><i style={{left:`${Math.max(2,Math.min(98,((energy-low)/span)*100))}%`}}/></span><strong>{energy.toFixed(6)} J</strong>
          </button>)}</div>
        <div className="companion-saved-sites"><h5>Selected state {level} · E={energies[level].toFixed(6)} J</h5>
          <div className="companion-site-pair">
            {state.occupation.map((value,index)=><div className="companion-site" key={index}><span className="companion-site-disc" style={{transform:`scale(${.55+.45*Math.sqrt(value/particles)})`}} aria-hidden="true"/><strong>Site {index+1}</strong><span>{value.toFixed(4)} {verified.result.units.occupation}</span><small>Variance {state.numberVariance[index].toFixed(4)} {verified.result.units.numberVariance}</small></div>)}
          </div>
          <p>One-body coherence ⟨b†₁b₂⟩ <strong>{state.oneBodyCoherence.toFixed(6)} {verified.result.units.oneBodyCoherence}</strong></p>
        </div>
      </div>
      <p className="companion-saved-boundary">Site positions and circle sizes are schematic. The numbers and highlighted energy come from this verified saved eigenstate; they are model outputs, not measured Rb87 observables.</p>
    </div>}
  </div>;
}
