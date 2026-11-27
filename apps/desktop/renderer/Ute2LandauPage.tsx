import React, { useEffect, useState } from "react";
import type { LandauParameters, LandauResult, LandauRunSummary } from "../../../packages/contracts/landau";
import { landauJob } from "../../../packages/models/landau";
import {Ute2SceneExport} from "./Ute2SceneExport";

const defaults: Record<keyof LandauParameters, string> = {
  a1: "-0.7", a2: "-0.5", b1: "1", b2: "1", g: "0.4",
};
const labels = { normal: "Normal", sc1: "Order 1 only", sc2: "Order 2 only", mixed: "Mixed orders" };

export function Ute2LandauPage({ ready }: { ready: boolean }) {
  const [inputs, setInputs] = useState(defaults);
  const [saved, setSaved] = useState<LandauRunSummary[]>([]);
  const [result, setResult] = useState<LandauResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void window.quantum.listLandauRuns().then(rows => { if (active) setSaved(rows); })
      .catch(cause => { if (active) setError(String(cause)); });
    return () => { active = false; };
  }, []);
  const p = Object.fromEntries(Object.entries(inputs).map(([key,value]) => [key, Number(value)])) as unknown as LandauParameters;
  const valid = Object.values(inputs).every(value => value.trim() !== "") &&
    Number.isFinite(p.a1) && p.a1 >= -2 && p.a1 <= 2 &&
    Number.isFinite(p.a2) && p.a2 >= -2 && p.a2 <= 2 &&
    Number.isFinite(p.b1) && p.b1 >= 0.2 && p.b1 <= 4 &&
    Number.isFinite(p.b2) && p.b2 >= 0.2 && p.b2 <= 4 &&
    Number.isFinite(p.g) && p.g >= 0 && p.g <= 4;
  async function run() {
    if (!valid || !ready || busy) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const output = await window.quantum.runLandau(landauJob(p, `gl-${crypto.randomUUID()}`));
      setResult(await window.quantum.getLandauRun(output.runId));
      setSaved(await window.quantum.listLandauRuns());
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  async function open(runId: string) {
    setBusy(true); setError(""); setResult(null);
    try {
      const verified = await window.quantum.getLandauRun(runId);
      setInputs(Object.fromEntries(Object.entries(verified.model.parameters).map(([key,value]) => [key, String(value)])) as typeof defaults);
      setResult(verified);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  const pinned = saved.find(row => row.runId === result?.runId);
  return <div className="companion-page" data-testid="ute2-landau-page">
    <section className="panel companion-hero">
      <p className="eyebrow">LIBRARY / UTE₂ HAMILTONIAN JOURNEY</p>
      <h2>Two orders can compete and coexist.</h2>
      <p>Explore the chapter's uniform, dimensionless Landau free energy. This is a phenomenological example of two complex order-parameter amplitudes. Its coefficients are not fitted to UTe₂, and this calculation does not predict measured pressure, temperature, ultrasound, pairing symmetry, or topology.</p>
      <p className="scope-note">Source: supplied UTe₂ chapter §8, Eqs. 18–20 (PDF p. 6); worked values §12.1 (PDF p. 8). The chapter PDF stays local. The reported tetracriticality and fluctuation findings are in the cited Nature Physics (doi:10.1038/s41567-026-03504-z) and Physical Review X (doi:10.1103/qjt6-hj2k) studies; this panel calculates neither experiment.</p>
    </section>
    <section className="panel companion-model">
      <p className="eyebrow">BOUNDED CALCULATION / UNIFORM TWO-ORDER LANDAU MODEL</p>
      <h3>F = a₁r₁² + a₂r₂² + ½b₁r₁⁴ + ½b₂r₂⁴ + gr₁²r₂²</h3>
      <p>Set x = r₁² and y = r₂². The worker compares the normal, pure order-1, pure order-2, and admissible mixed stationary points in x,y ≥ 0. It checks local stability and reports all tied global minima. b₁,b₂ &gt; 0 and g ≥ 0 keep the bounded model stable at large amplitudes. Relative phase locking, gradients, and fluctuations are omitted.</p>
      <div className="dynamics-actions">
        {(["a1","a2","b1","b2","g"] as const).map(key => <label key={key}>{key}
          <input aria-label={`Landau ${key}`} type="number" min={key==="a1"||key==="a2"?"-2":key==="g"?"0":"0.2"} max={key==="a1"||key==="a2"?"2":"4"} step="0.1" value={inputs[key]}
            onChange={event => { setInputs(current => ({ ...current, [key]: event.target.value })); setResult(null); }}/>
        </label>)}
        <button type="button" className="run-button" data-testid="run-ute2-landau" disabled={!ready||!valid||busy} onClick={() => void run()}>{busy?"Working…":"Run and save"}</button>
      </div>
      {!ready&&<p className="scope-note">Worker unavailable. Existing saved runs can still be reopened and checked.</p>}
      {!valid&&<p role="status">Use −2…2 for a₁/a₂, 0.2…4 for b₁/b₂, and 0…4 for g.</p>}
      {error&&<p role="alert">{error}</p>}
      {result&&<div data-testid="ute2-landau-result">
        <Ute2SceneExport key={result.runId} kind="landau" runId={result.runId}/>
        <p><strong>Verified saved run:</strong> {result.runId} · {result.provenance.computedAt}</p>
        <p><strong>Result SHA-256:</strong> <code>{pinned?.resultSha256 ?? "saved source unavailable"}</code></p>
        <p><strong>Global minimum:</strong> {result.globalMinima.map(phase=>labels[phase]).join(" / ")}. D = b₁b₂ − g² = {result.quarticDeterminant.toFixed(6)}.</p>
        {result.marginalQuartic&&<p className="scope-note">D is marginal. A continuum of mixed states may share an energy; this bounded result does not claim a unique phase there.</p>}
        <table><thead><tr><th>Stationary state</th><th>r₁</th><th>r₂</th><th>F</th><th>Local stability</th><th>Curvature check</th></tr></thead><tbody>
          {result.candidates.map(row=><tr key={row.phase}><td>{labels[row.phase]}{result.globalMinima.includes(row.phase)?" · global":""}</td>
            <td>{Math.sqrt(row.x).toFixed(6)}</td><td>{Math.sqrt(row.y).toFixed(6)}</td>
            <td>{row.freeEnergy.toFixed(6)}</td><td>{row.locallyStable?"stable":"unstable"}</td>
            <td>{row.phase==="normal"?`a₁=${result.model.parameters.a1.toFixed(4)}, a₂=${result.model.parameters.a2.toFixed(4)}`:
              row.phase==="sc1"?`a₂+gx=${(result.model.parameters.a2+result.model.parameters.g*row.x).toFixed(4)}`:
              row.phase==="sc2"?`a₁+gy=${(result.model.parameters.a1+result.model.parameters.g*row.y).toFixed(4)}`:
              `D=${result.quarticDeterminant.toFixed(4)}, det H=${(16*row.x*row.y*result.quarticDeterminant).toFixed(4)}`}</td></tr>)}
        </tbody></table>
        <p className="scope-note">Pure-state transverse stability uses a₂+gx or a₁+gy; the mixed-state curvature requires D &gt; 0. Values are rechecked against the saved job on every reopen. All values are dimensionless.</p>
      </div>}
      <h4>Saved Landau runs</h4>
      {saved.length===0?<p>No saved Landau runs yet.</p>:<div className="dynamics-actions">{saved.map(row=><button type="button" key={row.runId} disabled={busy} onClick={()=>void open(row.runId)}>
        Open {row.globalMinima.map(phase=>labels[phase]).join(" / ")} · {row.computedAt}
      </button>)}</div>}
    </section>
  </div>;
}
