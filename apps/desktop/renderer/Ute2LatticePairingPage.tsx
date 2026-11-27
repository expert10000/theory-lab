import React, { useEffect, useState } from "react";
import type { LatticePairingParameters, LatticePairingResult, LatticePairingRunSummary } from "../../../packages/contracts/lattice-pairing";
import { latticePairingJob } from "../../../packages/models/lattice-pairing";

const defaults = {mu:"-2", amplitudeX:"0.8", amplitudeY:"0.8", relativePhaseRad:String(Math.PI/2), gridSize:"16"};
const fmt = (value: number|null) => value === null ? "undefined" : value.toFixed(4);

export function Ute2LatticePairingPage({ready}: {ready:boolean}) {
  const [inputs,setInputs] = useState(defaults);
  const [saved,setSaved] = useState<LatticePairingRunSummary[]>([]);
  const [result,setResult] = useState<LatticePairingResult|null>(null);
  const [selected,setSelected] = useState(0);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  useEffect(() => {
    let active=true;
    void window.quantum.listLatticePairingRuns().then(rows => {if(active)setSaved(rows);})
      .catch(cause => {if(active)setError(String(cause));});
    return () => {active=false;};
  },[]);
  const p=Object.fromEntries(Object.entries(inputs).map(([key,value])=>[key,Number(value)])) as unknown as LatticePairingParameters;
  const valid=Object.values(inputs).every(value=>value.trim()!=="") &&
    p.mu>=-5&&p.mu<=5&&p.amplitudeX>=0&&p.amplitudeX<=2&&p.amplitudeY>=0&&p.amplitudeY<=2&&
    p.relativePhaseRad>=-Math.PI&&p.relativePhaseRad<=Math.PI&&[12,16,20,24].includes(p.gridSize);
  const referenceIndex=(n:number)=>3*n*n/4+n/2;
  async function run(){
    if(!ready||!valid||busy)return;
    setBusy(true);setError("");setResult(null);
    try{
      const output=await window.quantum.runLatticePairing(latticePairingJob(p,`lattice-${crypto.randomUUID()}`));
      setResult(await window.quantum.getLatticePairingRun(output.runId));
      setSaved(await window.quantum.listLatticePairingRuns());setSelected(referenceIndex(p.gridSize));
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setBusy(false);}
  }
  async function open(runId:string){
    setBusy(true);setError("");setResult(null);
    try{
      const verified=await window.quantum.getLatticePairingRun(runId);
      setInputs(Object.fromEntries(Object.entries(verified.model.parameters).map(([key,value])=>[key,String(value)])) as typeof defaults);
      setResult(verified);setSelected(referenceIndex(verified.model.parameters.gridSize));
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setBusy(false);}
  }
  const sample=result?.samples[selected];
  const summary=saved.find(row=>row.runId===result?.runId);
  const maximum=result?Math.max(...result.samples.map(row=>row.ePlus)):1;
  return <div className="companion-page" data-testid="ute2-lattice-pairing-page">
    <section className="panel companion-model">
      <p className="eyebrow">UTe₂ JOURNEY / STEP 2B · SQUARE-LATTICE PAIRING TOY</p>
      <h2>Pairing varies across momentum.</h2>
      <p>Choose the declared toy gap Δ(k)=A sin(kₓa)+B e<sup>iφ</sup> sin(kᵧa), with ξ(k)=−2[cos(kₓa)+cos(kᵧa)]−μ and t=a=1. Its odd gap and even dispersion define a spinless 2×2 Nambu lattice model. The grid is periodic, kₓ-major, and samples [−π,π) on each axis.</p>
      <p className="scope-note">Sources: supplied chapter §6.1, Eq. 16 (PDF p. 5) for the pₓ/pᵧ mixture, and §11, Eqs. 25–26 (PDF pp. 7–8) for the declared toy dispersion. Combining them here is a modeling choice. The chapter PDF remains local. This is not a UTe₂ band structure, spinful symmetry assignment, measured gap, or topology calculation.</p>
      <div className="dynamics-actions">
        {(["mu","amplitudeX","amplitudeY","relativePhaseRad"] as const).map(key=><label key={key}>{key==="mu"?"μ / t":key==="amplitudeX"?"A / t":key==="amplitudeY"?"B / t":"Relative phase φ (rad)"}
          <input type="number" aria-label={`Lattice ${key}`} min={key==="mu"?"-5":key==="relativePhaseRad"?String(-Math.PI):"0"}
            max={key==="mu"?"5":key==="relativePhaseRad"?String(Math.PI):"2"} step="0.1" value={inputs[key]}
            onChange={event=>{setInputs(current=>({...current,[key]:event.target.value}));setResult(null);}}/>
        </label>)}
        <label>Grid size
          <select aria-label="Lattice grid size" value={inputs.gridSize}
            onChange={event=>{setInputs(current=>({...current,gridSize:event.target.value}));setResult(null);}}>
            {[12,16,20,24].map(n=><option key={n} value={n}>{n} × {n}</option>)}
          </select>
        </label>
        <button type="button" className="run-button" data-testid="run-ute2-lattice" disabled={!ready||!valid||busy} onClick={()=>void run()}>{busy?"Working…":"Run and save"}</button>
      </div>
      {!ready&&<p className="scope-note">Worker unavailable. Verified saved runs can still be reopened.</p>}
      {!valid&&<p role="status">Use μ −5…5, A/B 0…2, φ −π…π, and a listed grid size.</p>}
      {error&&<p role="alert">{error}</p>}
      {result&&<div data-testid="ute2-lattice-result">
        <p><strong>Verified saved run:</strong> {result.runId} · {result.provenance.computedAt}</p>
        <p><strong>Result SHA-256:</strong> <code>{summary?.resultSha256??"saved source unavailable"}</code></p>
        <p><strong>Minimum sampled E+:</strong> {result.sampledMinimumEnergy.toFixed(4)} · {result.sampledGapClosed?"zero-energy node sampled":"no zero-energy node sampled"}</p>
        <p className="scope-note">Colors show sampled E+ from low (blue) to high (amber); black marks a sampled zero-energy node. The finite grid cannot prove a bulk gap. Click a cell to inspect its saved values.</p>
        <div role="grid" aria-label="Lattice positive-energy samples" style={{display:"grid",gridTemplateColumns:`repeat(${result.model.parameters.gridSize}, minmax(0, 1fr))`,gap:2,maxWidth:520}}>
          {result.samples.map((row,index)=><button type="button" key={index} role="gridcell" aria-label={`k sample ${index}`} aria-selected={index===selected}
            title={`kₓ=${row.kx.toFixed(2)}, kᵧ=${row.ky.toFixed(2)}, E+=${row.ePlus.toFixed(3)}`}
            style={{aspectRatio:"1",minWidth:0,border:index===selected?"2px solid white":"1px solid #53657c",background:row.node?"#12151b":`hsl(${220-175*row.ePlus/maximum} 68% 44%)`,cursor:"pointer"}}
            onClick={()=>setSelected(index)}/>) }
        </div>
        {sample&&<p data-testid="ute2-lattice-sample">kₓ={sample.kx.toFixed(4)}, kᵧ={sample.ky.toFixed(4)} · ξ={sample.xi.toFixed(4)} · Δ={sample.deltaRe.toFixed(4)}+i({sample.deltaIm.toFixed(4)}) · |Δ|={sample.gapMagnitude.toFixed(4)} · phase={fmt(sample.phaseRad)} · E±=±{sample.ePlus.toFixed(4)} · electron weight={fmt(sample.electronWeight)} · hole weight={fmt(sample.holeWeight)} · node={String(sample.node)}</p>}
        <p className="scope-note">Phase is undefined where |Δ| vanishes; coherence weights are undefined at a zero-energy degeneracy. Saved arrays are checked against the original job on every reopen. No Chern number or edge state is assigned.</p>
      </div>}
      <h4>Saved lattice pairing runs</h4>
      {saved.length===0?<p>No saved lattice pairing runs yet.</p>:<div className="dynamics-actions">{saved.map(row=><button type="button" key={row.runId} disabled={busy} onClick={()=>void open(row.runId)}>Open μ={row.parameters.mu}, A={row.parameters.amplitudeX}, B={row.parameters.amplitudeY} · {row.computedAt}</button>)}</div>}
    </section>
  </div>;
}
