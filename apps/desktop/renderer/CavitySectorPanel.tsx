import React from "react";
import type {CavitySectorEvidence} from "../../../packages/models/cavity-sectors";

export function CavitySectorPanel({runId,evidence,loading,error,onRefresh}:{runId:string;evidence:CavitySectorEvidence|null;loading:boolean;error:string;onRefresh:()=>void}){
  const safe=evidence?.runId===runId?evidence:null;
  return <section className="cavity-sector-panel" data-testid="cavity-sector-panel">
    <div className="sector-heading"><div><p className="eyebrow">QVIS-019 / VERIFIED SYMMETRY</p><h3>Conserved sector</h3></div>
      <button type="button" className="text-button" onClick={onRefresh} disabled={loading}>Reverify saved run</button></div>
    {loading?<p role="status">Verifying saved sector evidence…</p>:error?<p className="error-message" role="alert" data-testid="sector-error">Sector label unavailable: {error}</p>:
      !safe?<p>Sector evidence is unavailable for this run.</p>:<>
        <div className="sector-summary" data-testid="sector-summary"><strong>{safe.quantity==="excitation number"?`Excitation N = ${safe.initialValue}`:
          `Parity ${safe.initialValue>0?"+1":"−1"}`}</strong><span>max recorded drift {safe.maximumDrift.toExponential(2)}</span>
          <small>Exact hash-verified run {safe.runId} · atom ⊗ Fock basis</small></div>
        {safe.model==="jaynes_cummings"?<p>Jaynes–Cummings conserves N = a†a + |e⟩⟨e|. Sorted dressed levels are labelled only where finite-block energies match the saved spectrum and their sector is unambiguous. {safe.unresolvedLevels} coincident-energy level(s) have no unique sector assignment. The top cutoff-edge singleton is marked as a truncation boundary.</p>:
          <p>Quantum Rabi conserves Π = (−1)ⁿ(Pg − Pe). The run parity is verified against every saved row. Dressed-level parity is unavailable: this result stores energies, not the eigenvectors or sector labels needed to assign it.</p>}
      </>}
  </section>;
}
