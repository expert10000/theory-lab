import React, { useEffect, useState } from "react";
import type { CompanionChapter } from "../../../packages/contracts/companion";

/** In-app guide for the implemented fixed-N sector, with optional source reading. */
export function BoseHubbardCompanion() {
  const [chapters,setChapters] = useState<CompanionChapter[]>([]);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void window.quantum.listCompanionChapters()
      .then(rows => { if (active) setChapters(rows); })
      .catch(error => { if (active) setMessage(error instanceof Error?error.message:String(error)); });
    return () => { active = false; };
  },[]);
  async function open(id:string) {
    setBusy(true); setMessage("");
    try { await window.quantum.openCompanionChapter(id); }
    catch (error) { setMessage(error instanceof Error?error.message:String(error)); }
    finally { setBusy(false); }
  }
  const related = chapters.filter(row => row.id==="rb87-iii" || row.id==="rb87-iv");
  return <section id="bose-hubbard-theory" className="atlas-binding" data-testid="bose-hubbard-theory">
    <p className="eyebrow">FINITE DIMER / THEORY GUIDE</p>
    <h4>From an optical lattice to two bosonic sites</h4>
    <p>A Bose–Hubbard site labels a motional mode for a whole atom. The electronic orbitals inside that atom are separate degrees of freedom. In the one-band approximation, J is the hopping energy between two sites and U is the onsite interaction energy for a pair.</p>
    <p><strong>Implemented sector:</strong> fixed particle number 2 ≤ N ≤ 8, two sites, one open bond, J=1, 0 ≤ U/J ≤ 20. The ordered basis is |n,N−n⟩ with n=0…N. At fixed N, the chemical-potential term shifts every state equally and is omitted.</p>
    <div className="theory-formula" aria-label="Finite Bose-Hubbard dimer matrix">Hₙₙ/J = (U/2J)[n(n−1)+(N−n)(N−n−1)]; Hₙ,ₙ₊₁/J = −√[(n+1)(N−n)]</div>
    <p>Diagonalization gives finite-sector energy levels in J. A selected saved eigenvector supports the displayed site occupations, number variances, and one-body coherence ⟨b†₁b₂⟩. The two-site scene uses schematic positions and display height; it has no measured spatial coordinates.</p>
    <p>At N=2 and U=0, the ground energy is −2J. Increasing repulsive U/J smoothly favors |1,1⟩. A two-site crossover is not a thermodynamic superfluid–Mott transition. This static job has no quench, time of flight, fluorescence, or Rb87-specific parameter conversion.</p>
    <h4>Source reading · supplied Rb87 Quantum Companion</h4>
    <p>Chapter III, “Deriving the Bose–Hubbard model,” explains the one-band approximation. Chapter IV, “Exact diagonalization: two atoms on two sites” and “Exact coherence, correlations, and gaps,” provides the finite-dimer worked case. The app guide states the implemented model; the PDFs open in a separate Lab reading window.</p>
    {related.length===0?<p>Checking supplied chapters…</p>:<div className="dynamics-actions">{related.map(row=><button key={row.id} type="button" disabled={busy||!row.available}
      data-testid={`open-companion-${row.id}`} onClick={()=>void open(row.id)}>
      {row.available?"View":"Unavailable"} Chapter {row.id==="rb87-iii"?"III":"IV"} PDF in Lab
    </button>)}</div>}
    {related.map(row=><p key={row.id}><strong>{row.title}</strong> · {row.pages} pages · source SHA-256 <code>{row.sha256}</code>{!row.available&&" · changed or missing source withheld"}</p>)}
    {message&&<p role="status">{message}</p>}
    <details><summary>All seven Companion chapters</summary>
      <p>The complete supplied chapter index is reference material. A chapter opens in a Lab reading window only after its local PDF passes the recorded hash check.</p>
      {chapters.map(row=><div key={row.id}>
        <button type="button" disabled={busy||!row.available} onClick={()=>void open(row.id)}>{row.available?"Open":"Unavailable"} {row.title}</button>
        <span> · {row.subject} · {row.pages} pages</span>
      </div>)}
    </details>
  </section>;
}
