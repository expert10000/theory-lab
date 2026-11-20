import React, { useEffect, useState } from "react";
import type { CompanionChapter } from "../../../packages/contracts/companion";
import rows from "../../../packages/companion/preparation-viii.json";

const csvHash = "f42b578f78a5a38f36476f8f4e6e3c0d1b003ad6014beb8877ff44d854367cb9";
const fidelity = (time: number) => 1 - .75 * Math.exp(-time);
const chartX = (time: number) => 44 + time / 5 * 630;
const chartY = (value: number) => 174 - value * 148;
const exactCurve = Array.from({ length: 101 }, (_, index) => {
  const time = index / 20;
  return `${index ? "L" : "M"}${chartX(time).toFixed(2)} ${chartY(fidelity(time)).toFixed(2)}`;
}).join(" ");

/** An archived ideal two-state preparation example, separate from the monitored dimer job. */
export function Rb87PreparationVisual() {
  const [chapter,setChapter] = useState<CompanionChapter | null>(null);
  const [checking,setChecking] = useState(true);
  const [index,setIndex] = useState(8);
  const [message,setMessage] = useState("");
  useEffect(()=>{
    let active=true;
    const refresh=()=>{setChecking(true);void window.quantum.listCompanionChapters()
      .then(found=>{if(active){setChapter(found.find(row=>row.id==="rb87-viii")??null);setChecking(false);}})
      .catch(error=>{if(active){setChapter(null);setChecking(false);setMessage(String(error));}});};
    refresh();window.addEventListener("focus",refresh);
    return ()=>{active=false;window.removeEventListener("focus",refresh);};
  },[]);
  const selected = rows[index];
  async function open() {
    setMessage("");
    try {
      const current=(await window.quantum.listCompanionChapters()).find(row=>row.id==="rb87-viii");
      setChapter(current??null);
      if(!current?.available) throw new Error("Chapter VIII source changed or is unavailable");
      await window.quantum.openCompanionChapter("rb87-viii");
    } catch(error) { setMessage(error instanceof Error?error.message:String(error)); }
  }
  return <section className="panel companion-reading-path companion-preparation" data-testid="preparation-visual" aria-labelledby="preparation-heading">
    <div className="companion-path-heading"><div><p className="eyebrow">ENGINEERED DISSIPATION / CHAPTER VIII</p><h3 id="preparation-heading">Steering toward a known state</h3><p>Follow exact target fidelity and the archived 3000-path estimate in an ideal two-state model.</p></div><span className="companion-path-mark" aria-hidden="true">VIII</span></div>
    {checking?<p role="status">Checking Chapter VIII source…</p>:!chapter?.available?<p role="status" data-testid="preparation-withheld">The preparation visual is withheld because the Chapter VIII PDF is missing or its hash changed.</p>:<div data-testid="preparation-values">
      <p>The engineered jump <strong>L<sub>prep</sub> = √κ |G⟩⟨E|</strong> transfers population from unwanted |E⟩ to target |G⟩. With no competing dissipator and a Hamiltonian that preserves the target, <strong>F<sub>G</sub>(t) = 1 − 0.75e<sup>−κt</sup></strong> for F<sub>G</sub>(0) = 0.25. This is an abstract reservoir model, not local Rb87 optical pumping.</p>
      <figure className="companion-visual companion-preparation-chart">
        <div className="companion-visual-heading"><span>EXACT CURVE + ARCHIVED SAMPLES</span><strong>Target fidelity F<sub>G</sub></strong></div>
        <svg viewBox="0 0 710 215" role="img" aria-label="Exact target fidelity rises from 0.25 toward 1 as kappa t goes from 0 to 5. Archived 3000-trajectory estimates are shown at 21 recorded times.">
          <path d="M44 26 V174 H674" fill="none" stroke="#71858a"/>
          {[0,1,2,3,4,5].map(time=><g key={time}><path d={`M${chartX(time)} 174 v5`} stroke="#71858a"/><text x={chartX(time)} y="194" textAnchor="middle">{time}</text></g>)}
          <text x="359" y="211" textAnchor="middle">κt</text>
          <path d={exactCurve} fill="none" stroke="#78d8bc" strokeWidth="3"/>
          {rows.map((row,i)=><circle key={row.kappa_t} cx={chartX(row.kappa_t)} cy={chartY(row["3000_trajectory_fidelity"])} r={i===index?6:3.5} fill="#17262c" stroke="#edbc79" strokeWidth="2"/>)}
          <path d={`M${chartX(selected.kappa_t)} 27 V174`} stroke="#dbead2" strokeDasharray="3 5" opacity=".7"/>
        </svg>
        <div className="companion-monitoring-legend"><span><i style={{background:"#78d8bc",borderColor:"#78d8bc"}}/> Exact formula</span><span><i style={{background:"transparent",borderColor:"#edbc79"}}/> Archived 3000-trajectory estimate</span></div>
        <figcaption>The green curve is the analytic formula; hollow points are archived Monte Carlo estimates. The curve uses the stated ideal-model assumptions. Trajectories were not independently resampled.</figcaption>
      </figure>
      <label className="companion-preparation-slider" htmlFor="preparation-time">Recorded time κt = <strong>{selected.kappa_t.toFixed(2)}</strong><input id="preparation-time" data-testid="preparation-time" type="range" min="0" max="20" step="1" value={index} onChange={event=>setIndex(Number(event.target.value))}/></label>
      <div className="companion-monitoring-readout" data-testid="preparation-selected-values"><strong>At κt = {selected.kappa_t.toFixed(2)}</strong><span>Exact fidelity {selected.exact_target_fidelity.toFixed(6)}</span><span>Archived 3000-trajectory estimate {selected["3000_trajectory_fidelity"].toFixed(6)}</span></div>
      <div className="companion-preparation-boundary"><div><span className="companion-visual-tag">KNOWN TARGET / PREPARATION</span><p>Population is driven toward one chosen |G⟩. High F<sub>G</sub> says the output resembles that known target in this ideal model.</p></div><div><span className="companion-visual-tag">UNKNOWN INPUT / ERROR CORRECTION</span><p>A quantum memory must preserve unknown logical amplitudes α and β while identifying correctable errors. Driving every input toward one |G⟩ would erase that information.</p></div></div>
      <p>Chapter VIII §§8–9, PDF pp. 7–9. <button type="button" data-testid="preparation-open-pdf" onClick={()=>void open()}>Open Chapter VIII PDF ↗</button> <small>PDF SHA-256 <code>{chapter.sha256}</code> · CSV SHA-256 <code>{csvHash}</code>. The exact table was independently reproduced; the sampled estimates are archived source data.</small></p>
    </div>}
    {message&&<p role="alert">{message}</p>}
  </section>;
}
