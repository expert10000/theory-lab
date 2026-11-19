import React, { useEffect, useState } from "react";
import type { CompanionChapter } from "../../../packages/contracts/companion";

const ids=["rb87-v","rb87-vi"] as const;
const configurations=[{left:2,right:0,label:"|2,0⟩"},{left:1,right:1,label:"|1,1⟩"},{left:0,right:2,label:"|0,2⟩"}] as const;

function MeasurementFigure() {
  const [index,setIndex]=useState(0);
  const [channel,setChannel]=useState<"number"|"parity">("parity");
  const selected=configurations[index];
  const readout=[selected.left,selected.right].map(value=>channel==="number"?value:value%2);
  return <figure className="companion-visual companion-measurement-visual" data-testid="companion-measurement-visual">
    <div className="companion-visual-heading"><span>DETECTOR CHANNEL / SCHEMATIC</span><strong>One configuration, different site readouts</strong></div>
    <div className="companion-measurement-controls"><div role="group" aria-label="Prepared basis configuration">{configurations.map((item,i)=><button type="button" key={item.label} aria-pressed={index===i} onClick={()=>setIndex(i)}>{item.label}</button>)}</div>
      <div role="group" aria-label="Detection channel"><button type="button" aria-pressed={channel==="parity"} onClick={()=>setChannel("parity")}>Parity only</button><button type="button" aria-pressed={channel==="number"} onClick={()=>setChannel("number")}>Number resolved</button></div></div>
    <div className="companion-measurement-flow">
      <div><span className="companion-visual-tag">ILLUSTRATIVE CAMERA SIGNAL</span><div className="companion-measurement-pixels" aria-hidden="true">{readout.map((value,i)=><span key={i} className={value>0?"lit":""}/>)}</div><small>Fluorescence pixels require calibration and site classification.</small></div>
      <span aria-hidden="true">→</span>
      <div><span className="companion-visual-tag">INFERRED SITE OUTCOME</span><div className="companion-measurement-readout">{readout.map((value,i)=><span key={i}>Site {i+1}<strong>{value}</strong></span>)}</div><small>{channel==="parity"?"0 = even, 1 = odd. Sites with 0 and 2 atoms both report 0.":"Ideal number-resolved channel reports the occupation count."}</small></div>
    </div>
    <figcaption>These are illustrative channel outcomes, not simulated detector physics or experimental images. A parity-only channel maps |2,0⟩ and |0,2⟩ to the same (0,0) outcome; its loss of information cannot be undone from that image alone.</figcaption>
  </figure>;
}

/** Joint review requires the pinned Chapter V and VI PDFs. */
export function Rb87MeasurementPath({ onInspectRun }: { onInspectRun: () => void }) {
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
    try {const rows=await window.quantum.listCompanionChapters();if(!rows.find(row=>row.id===id)?.available) throw new Error("Chapter V–VI source changed or is unavailable");await window.quantum.openCompanionChapter(id);}
    catch(error){setMessage(error instanceof Error?error.message:String(error));}
    finally{setOpening(false);}
  }
  const ready=ids.every(id=>chapters.find(row=>row.id===id)?.available);
  return <section className="panel companion-reading-path companion-measurement-path" data-testid="measurement-reading-path" aria-labelledby="measurement-reading-title">
    <div className="companion-path-heading"><div><p className="eyebrow">REVIEWED READING PATH / CHAPTERS V–VI</p><h3 id="measurement-reading-title">From site images to correlations</h3><p>Keep the detected signal, the inferred site outcomes, and many-body claims at separate steps.</p></div><span className="companion-path-mark" aria-hidden="true">V–VI</span></div>
    {checking?<p role="status">Checking Chapters V–VI sources…</p>:!ready?<p role="status" data-testid="measurement-path-withheld">Chapter V–VI notes are withheld because a supplied PDF is missing or its hash changed.</p>:<div data-testid="measurement-path-reading">
      <div className="companion-path-steps">
        <article><span className="companion-path-number">01</span><h4>Classify a site image</h4><p>The camera records fluorescence. Calibration and classification yield a site outcome. An ideal number-resolved channel distinguishes 0, 1, and 2; a parity-only channel reports even or odd and aliases 0 with 2.</p><small>Chapter VI §§1–3 · PDF p. 3; worked example 2 · p. 4</small></article>
        <article><span className="companion-path-number">02</span><h4>Repeat for correlations</h4><p>Many identically prepared shots estimate mean occupations and connected number correlations Cᵢⱼ = ⟨nᵢnⱼ⟩ − ⟨nᵢ⟩⟨nⱼ⟩. Negative cross-site correlation can follow from fixed total number alone.</p><small>Chapter V §5 · PDF p. 4; Chapter VI §4 · PDF p. 4</small></article>
        <article><span className="companion-path-number">03</span><h4>What counts cannot reveal</h4><p>Site-number snapshots do not directly give off-diagonal coherence or certify entanglement. Coherence needs another measurement basis or a model; entropy protocols need extra preparations and assumptions.</p><small>Chapter V §§3–4, 11 · PDF pp. 3, 5; Chapter VI §§6–8, 17 · PDF pp. 4–5, 8</small></article>
      </div>
      <MeasurementFigure />
      <div className="companion-path-boundary"><div><p className="eyebrow">RELATED MODEL / VERIFIED RUN</p><h4>Compare with a computed eigenstate</h4><p>The saved dimer reports occupations, number variances, and one-body coherence calculated from its verified eigenvector. It does not simulate fluorescence, parity loss, repeated-shot inference, or an entanglement measurement.</p><button type="button" data-testid="measurement-inspect-run" onClick={onInspectRun}>Inspect verified dimer run below ↓</button></div>
        <div><p className="eyebrow">CHECKED CHAPTER SOURCES</p><p>These notes require both supplied PDFs. Each reader rechecks the exact file before opening.</p>{chapters.map(row=><div className="companion-lattice-source" key={row.id}><button type="button" data-testid={`measurement-open-${row.id}`} disabled={opening} onClick={()=>void open(row.id as typeof ids[number])}>Open Chapter {row.id==="rb87-v"?"V":"VI"} PDF ↗</button><small>{row.title} · {row.pages} pages · SHA-256 <code>{row.sha256}</code></small></div>)}</div></div>
    </div>}
    {message&&<p role="alert">{message}</p>}
  </section>;
}
