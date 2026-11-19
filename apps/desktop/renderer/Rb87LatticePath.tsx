import React, { useEffect, useState } from "react";
import type { CompanionChapter } from "../../../packages/contracts/companion";

const ids=["rb87-iii","rb87-iv"] as const;
const configurations=[{left:2,right:0,label:"|2,0⟩",energy:"U"},{left:1,right:1,label:"|1,1⟩",energy:"0"},{left:0,right:2,label:"|0,2⟩",energy:"U"}] as const;

function LatticeDimerFigure() {
  const [index,setIndex]=useState(1);
  const state=configurations[index];
  const potential=Array.from({length:85},(_,i)=>{
    const x=20+i*8, y=55+32*Math.cos((x-284)*Math.PI/88);
    return `${i?"L":"M"}${x} ${y.toFixed(1)}`;
  }).join(" ");
  return <figure className="companion-visual companion-lattice-visual" data-testid="companion-lattice-visual">
    <div className="companion-visual-heading"><span>WANNIER MODES → FIXED-N BASIS</span><strong>One bond, two whole-atom sites</strong></div>
    <svg viewBox="0 0 700 125" role="img" aria-label="Schematic periodic optical potential with two selected sites and hopping between them">
      <path d={potential} fill="none" stroke="#83aeb3" strokeWidth="3"/>
      <ellipse cx="284" cy="88" rx="43" ry="22" fill="#52869b55" stroke="#8bc3c8" strokeDasharray="4 4"/>
      <ellipse cx="460" cy="88" rx="43" ry="22" fill="#52869b55" stroke="#8bc3c8" strokeDasharray="4 4"/>
      <path d="M330 71 H414 M400 62 L414 71 L400 80 M400 103 H330 M344 94 L330 103 L344 112" fill="none" stroke="#ecc58d" strokeWidth="2"/>
      <text x="372" y="55" textAnchor="middle">hopping J</text>
      <text x="284" y="118" textAnchor="middle">site 1</text><text x="460" y="118" textAnchor="middle">site 2</text>
    </svg>
    <p className="companion-lattice-caption">The laser makes a periodic potential for the center of mass of neutral atoms. Each outlined well stands for a localized lowest-band Wannier mode; the drawing is schematic.</p>
    <div className="companion-lattice-configs" role="group" aria-label="Two-boson Fock basis configurations">
      {configurations.map((item,i)=><button key={item.label} type="button" aria-pressed={index===i} onClick={()=>setIndex(i)}>{item.label}</button>)}
    </div>
    <div className="companion-lattice-state" aria-live="polite">
      <div className="companion-lattice-wells">{[state.left,state.right].map((count,site)=><div key={site}><span>Site {site+1}</span><div>{Array.from({length:count},(_,atom)=><i key={atom} aria-hidden="true"/>)}</div><strong>{count} {count===1?"atom":"atoms"}</strong></div>)}</div>
      <div><p className="eyebrow">BASIS-STATE MATRIX TERMS</p><strong>Onsite energy: {state.energy}</strong><p>A pair on one site contributes U; one atom per site contributes zero onsite interaction energy. A single hop links neighboring configurations with matrix element −√2 J in this N=2 basis.</p></div>
    </div>
    <figcaption>These are basis configurations, not energy eigenstates. The saved-run view below diagonalizes their coupled Hamiltonian and reports eigenstate observables.</figcaption>
  </figure>;
}

/** Notes require both pinned chapter PDFs, since the route crosses their derivation. */
export function Rb87LatticePath({ onInspectRun }: { onInspectRun: () => void }) {
  const [chapters,setChapters]=useState<CompanionChapter[]>([]);
  const [checking,setChecking]=useState(true);
  const [opening,setOpening]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    let active=true;
    const refresh=()=>{setChecking(true);void window.quantum.listCompanionChapters()
      .then(rows=>{if(active){setChapters(rows.filter(row=>ids.includes(row.id as typeof ids[number])));setChecking(false);setMessage("");}})
      .catch(error=>{if(active){setChapters([]);setChecking(false);setMessage(error instanceof Error?error.message:String(error));}});};
    refresh();window.addEventListener("focus",refresh);
    return ()=>{active=false;window.removeEventListener("focus",refresh);};
  },[]);
  async function open(id:typeof ids[number]) {
    setOpening(true);setMessage("");
    try {
      const rows=await window.quantum.listCompanionChapters();
      const current=rows.find(row=>row.id===id);
      if(!current?.available) throw new Error("Chapter III–IV source changed or is unavailable");
      await window.quantum.openCompanionChapter(id);
    } catch(error) {setMessage(error instanceof Error?error.message:String(error));}
    finally {setOpening(false);}
  }
  const ready=ids.every(id=>chapters.find(row=>row.id===id)?.available);
  return <section className="panel companion-reading-path companion-lattice-path" data-testid="lattice-reading-path" aria-labelledby="lattice-reading-title">
    <div className="companion-path-heading"><div><p className="eyebrow">REVIEWED READING PATH / CHAPTERS III–IV</p>
      <h3 id="lattice-reading-title">From optical lattice to a finite dimer</h3>
      <p>Follow the whole atom into a periodic potential, then see where the two terms of the runnable Hamiltonian come from.</p></div><span className="companion-path-mark" aria-hidden="true">III–IV</span></div>
    {checking?<p role="status">Checking Chapters III–IV sources…</p>:!ready?<p role="status" data-testid="lattice-path-withheld">Chapter III–IV notes are withheld because a supplied PDF is missing or its hash changed.</p>:<div data-testid="lattice-path-reading">
      <div className="companion-path-steps">
        <article><span className="companion-path-number">01</span><h4>Laser-made lattice</h4><p>An off-resonant standing wave makes a periodic external potential for neutral atoms. The lattice is not an array of ionic cores, and its motional states are not Rb87 electronic orbitals.</p><small>Chapter III §§1–4 · PDF pp. 2–3</small></article>
        <article><span className="companion-path-number">02</span><h4>Modes become J and U</h4><p>Lowest-band Wannier modes label sites. Nearest-neighbor tunneling contributes J; contact interaction for two atoms on one site contributes U. This is a one-band, short-range approximation.</p><small>Chapter III §§5–6 · PDF pp. 3–4; supplement III-C · p. 7</small></article>
        <article><span className="companion-path-number">03</span><h4>Diagonalize two sites</h4><p>At fixed N=2, the basis |2,0⟩, |1,1⟩, |0,2⟩ gives a 3×3 Hamiltonian. Its eigenstates yield energies, occupations, fluctuations, and coherence. A finite two-site crossover is not an extended-lattice phase transition.</p><small>Chapter III §9 · PDF p. 5; Chapter IV §§1–3 · PDF pp. 2–3</small></article>
      </div>
      <LatticeDimerFigure />
      <div className="companion-path-boundary"><div><p className="eyebrow">RUNNABLE MODEL / VERIFIED OUTPUT</p><h4>Inspect the computed eigenstates</h4><p>The Library's saved-run view rechecks a result before showing its energy levels, two-site occupations, number variance, or coherence. The basis drawing above is a model explanation, not a measured lattice image.</p><button type="button" data-testid="lattice-inspect-run" onClick={onInspectRun}>Inspect verified dimer run below ↓</button></div>
        <div><p className="eyebrow">CHECKED CHAPTER SOURCES</p><p>The locators refer to these exact supplied PDFs. Each reader rechecks the PDF bytes before opening.</p>{chapters.map(row=><div className="companion-lattice-source" key={row.id}><button type="button" data-testid={`lattice-open-${row.id}`} disabled={opening} onClick={()=>void open(row.id as typeof ids[number])}>Open Chapter {row.id==="rb87-iii"?"III":"IV"} PDF ↗</button><small>{row.title} · {row.pages} pages · SHA-256 <code>{row.sha256}</code></small></div>)}</div></div>
    </div>}
    {message&&<p role="alert">{message}</p>}
  </section>;
}
