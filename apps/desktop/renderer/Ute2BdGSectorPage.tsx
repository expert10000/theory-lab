import React, { useEffect, useState } from "react";
import type { BdGSectorParameters, BdGSectorResult, BdGSectorRunSummary } from "../../../packages/contracts/bdg-sector";
import { bdgSectorJob } from "../../../packages/models/bdg-sector";

const defaults = { extent: "1.5", delta: "0.8", phaseRad: "0", points: "101" };
const fmt = (value: number|null) => value === null ? "undefined" : value.toFixed(4);

export function Ute2BdGSectorPage({ready}: {ready: boolean}) {
  const [inputs, setInputs] = useState(defaults);
  const [saved, setSaved] = useState<BdGSectorRunSummary[]>([]);
  const [result, setResult] = useState<BdGSectorResult|null>(null);
  const [sampleIndex, setSampleIndex] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void window.quantum.listBdGSectorRuns().then(rows => { if (active) setSaved(rows); })
      .catch(cause => { if (active) setError(String(cause)); });
    return () => { active = false; };
  }, []);
  const p = Object.fromEntries(Object.entries(inputs).map(([key,value]) => [key, Number(value)])) as unknown as BdGSectorParameters;
  const valid = Object.values(inputs).every(value => value.trim() !== "") &&
    p.extent >= .5 && p.extent <= 4 && p.delta >= 0 && p.delta <= 2 &&
    p.phaseRad >= -Math.PI && p.phaseRad <= Math.PI &&
    Number.isInteger(p.points) && p.points >= 51 && p.points <= 201 && p.points % 2 === 1;
  async function run() {
    if (!ready || !valid || busy) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const output = await window.quantum.runBdGSector(bdgSectorJob(p, `bdg-${crypto.randomUUID()}`));
      setResult(await window.quantum.getBdGSectorRun(output.runId));
      setSaved(await window.quantum.listBdGSectorRuns());
      setSampleIndex((p.points-1)/2);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  async function open(runId: string) {
    setBusy(true); setError(""); setResult(null);
    try {
      const verified = await window.quantum.getBdGSectorRun(runId);
      setInputs(Object.fromEntries(Object.entries(verified.model.parameters).map(([key,value]) => [key, String(value)])) as typeof defaults);
      setResult(verified); setSampleIndex((verified.samples.length-1)/2);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  const row = result?.samples[sampleIndex];
  const pinned = saved.find(entry => entry.runId === result?.runId);
  return <div className="companion-page" data-testid="ute2-bdg-sector-page">
    <section className="panel companion-model">
      <p className="eyebrow">UTe₂ JOURNEY / STEP 2 · REDUCED BdG SECTOR</p>
      <h2>A pair of symmetric energies.</h2>
      <p>For the declared reduced two-component Nambu basis, H = [[ξ, Δ], [Δ*, −ξ]] with Δ = |Δ|e<sup>iφ</sup>. The worker calculates E± = ±√(ξ² + |Δ|²), coherence weights, and a node mask on a bounded ξ grid. This constant-gap algebraic example is not a UTe₂ dispersion or a physical spinless pairing model.</p>
      <p className="scope-note">Source: supplied chapter §5.1, Eqs. 13–14 (PDF p. 4), Fig. 1 (p. 5), and worked example §12.2 (p. 8). The chapter PDF remains local. The pairing phase is undefined when |Δ| = 0; coherence weights are undefined at a zero-energy degeneracy. No material fit, symmetry assignment, or topological invariant is inferred.</p>
      <div className="dynamics-actions">
        {(["extent","delta","phaseRad","points"] as const).map(key => <label key={key}>{key === "extent" ? "ξ extent" : key === "delta" ? "|Δ|" : key === "phaseRad" ? "Phase (rad)" : "Grid points (odd)"}
          <input aria-label={`BdG ${key}`} type="number" min={key === "extent" ? ".5" : key === "phaseRad" ? String(-Math.PI) : key === "points" ? "51" : "0"}
            max={key === "extent" ? "4" : key === "phaseRad" ? String(Math.PI) : key === "points" ? "201" : "2"}
            step={key === "points" ? "2" : ".1"} value={inputs[key]}
            onChange={event => { setInputs(current => ({...current, [key]: event.target.value})); setResult(null); }}/>
        </label>)}
        <button type="button" className="run-button" data-testid="run-ute2-bdg" disabled={!ready||!valid||busy} onClick={() => void run()}>{busy ? "Working…" : "Run and save"}</button>
      </div>
      {!ready && <p className="scope-note">Worker unavailable. Verified saved runs can still be reopened.</p>}
      {!valid && <p role="status">Use ξ extent 0.5…4, |Δ| 0…2, phase −π…π, and 51…201 odd grid points.</p>}
      {error && <p role="alert">{error}</p>}
      {result && <div data-testid="ute2-bdg-result">
        <p><strong>Verified saved run:</strong> {result.runId} · {result.provenance.computedAt}</p>
        <p><strong>Result SHA-256:</strong> <code>{pinned?.resultSha256 ?? "saved source unavailable"}</code></p>
        <p><strong>Minimum E+:</strong> {result.minimumPositiveEnergy.toFixed(4)} · {result.gapClosed ? "gap closed on this grid" : "gap open on this grid"}</p>
        <label>ξ sample <input aria-label="BdG sample" type="range" min="0" max={result.samples.length-1} step="1" value={sampleIndex} onChange={event => setSampleIndex(Number(event.target.value))}/></label>
        {row && <p data-testid="ute2-bdg-sample">ξ = {row.xi.toFixed(4)} · E− = {row.eMinus.toFixed(4)} · E+ = {row.ePlus.toFixed(4)} · electron weight = {fmt(row.electronWeight)} · hole weight = {fmt(row.holeWeight)} · pairing phase = {fmt(row.pairingPhaseRad)} · node = {String(row.node)}</p>}
        <p className="scope-note">The plotted ξ coordinate is a declared energy variable, not momentum. Weights refer to the positive-energy branch in this basis. Saved values are rechecked against the original job on every reopen.</p>
      </div>}
      <h4>Saved BdG sector runs</h4>
      {saved.length === 0 ? <p>No saved BdG sector runs yet.</p> : <div className="dynamics-actions">{saved.map(entry => <button type="button" key={entry.runId} disabled={busy} onClick={() => void open(entry.runId)}>Open |Δ|={entry.parameters.delta} · {entry.computedAt}</button>)}</div>}
    </section>
  </div>;
}
