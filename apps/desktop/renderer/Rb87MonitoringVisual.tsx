import React, { useEffect, useState } from "react";
import type { CompanionChapter } from "../../../packages/contracts/companion";
import archived from "../../../packages/companion/monitoring-viii.json";

type Row = typeof archived[number];
const rates = [0, 0.5, 2] as const;
const times = [0, 0.5, 1, 2, 3] as const;
const csvHash = "e711c5217e9c89146ce162cff5842e330bb0ae61894d07348e90d86429ac4f4d";
const format = (value: number) => value.toFixed(3);

function PointPlot({ title, rows, selectedTime, fields, maximum }: {
  title: string; rows: Row[]; selectedTime: number;
  fields: { key: keyof Row; label: string; color: string; sampled?: boolean }[]; maximum: number;
}) {
  const x = (time: number) => 42 + time / 3 * 410;
  const y = (value: number) => 146 - value / maximum * 120;
  return <div className="companion-monitoring-plot">
    <strong>{title}</strong>
    <svg viewBox="0 0 480 176" role="img" aria-label={`${title}; five recorded times only, with selected time ${selectedTime}`}>
      <path d="M42 20 V146 H452" fill="none" stroke="#71858a"/>
      {[0, 0.5, 1, 2, 3].map(time=><g key={time}><path d={`M${x(time)} 146 v5`} stroke="#71858a"/><text x={x(time)} y="166" textAnchor="middle">{time}</text></g>)}
      {rows.flatMap(row=>fields.map(field=><circle key={`${row.t}-${field.key}`} cx={x(row.t)} cy={y(row[field.key])}
        r={row.t===selectedTime?6:4} fill={field.sampled?"#18242a":field.color} stroke={field.color} strokeWidth="2"
        aria-label={`${field.label} at time ${row.t}: ${format(row[field.key])}`}/>))}
    </svg>
    <div className="companion-monitoring-legend">{fields.map(field=><span key={field.key}><i style={{background:field.sampled?"transparent":field.color,borderColor:field.color}}/> {field.label}{field.sampled?" (archived sample)":""}</span>)}</div>
  </div>;
}

/** Discrete, source-gated Chapter VIII data. This component runs no monitored solver. */
export function Rb87MonitoringVisual() {
  const [chapter,setChapter] = useState<CompanionChapter | null>(null);
  const [checking,setChecking] = useState(true);
  const [rate,setRate] = useState<number>(0.5);
  const [time,setTime] = useState<number>(1);
  const [message,setMessage] = useState("");
  useEffect(()=>{
    let active=true;
    const refresh=()=>{setChecking(true);void window.quantum.listCompanionChapters()
      .then(rows=>{if(active){setChapter(rows.find(row=>row.id==="rb87-viii")??null);setChecking(false);}})
      .catch(error=>{if(active){setChapter(null);setChecking(false);setMessage(String(error));}});};
    refresh();window.addEventListener("focus",refresh);
    return ()=>{active=false;window.removeEventListener("focus",refresh);};
  },[]);
  const rows = archived.filter(row=>row.gamma===rate);
  const selected = rows.find(row=>row.t===time);
  async function open() {
    setMessage("");
    try {
      const current=(await window.quantum.listCompanionChapters()).find(row=>row.id==="rb87-viii");
      setChapter(current??null);
      if(!current?.available) throw new Error("Chapter VIII source changed or is unavailable");
      await window.quantum.openCompanionChapter("rb87-viii");
    } catch(error) { setMessage(error instanceof Error?error.message:String(error)); }
  }
  return <section className="panel companion-reading-path companion-monitoring" data-testid="monitoring-visual" aria-labelledby="monitoring-heading">
    <div className="companion-path-heading"><div><p className="eyebrow">ARCHIVED MODEL RESULTS / CHAPTER VIII</p><h3 id="monitoring-heading">What number monitoring changes</h3><p>Compare discrete results from a two-boson, two-site monitored dimer.</p></div><span className="companion-path-mark" aria-hidden="true">VIII</span></div>
    {checking?<p role="status">Checking Chapter VIII source…</p>:!chapter?.available?<p role="status" data-testid="monitoring-withheld">The Chapter VIII visual is withheld because its PDF is missing or its hash changed.</p>:<div data-testid="monitoring-values">
      <p><strong>Recorded model:</strong> U/J = 4; initial amplitudes (1/2, 1/√2, 1/2) in |20⟩, |11⟩, |02⟩; local number monitoring Lᵢ = √γ nᵢ. Time is Jt/ℏ. These are model results, not Rb87 measurements.</p>
      <div className="companion-monitoring-controls"><div role="group" aria-label="Monitoring strength">{rates.map(value=><button key={value} type="button" aria-pressed={rate===value} onClick={()=>setRate(value)}>γ/J = {value}</button>)}</div><div role="group" aria-label="Recorded time">{times.map(value=><button key={value} type="button" aria-pressed={time===value} onClick={()=>setTime(value)}>t = {value}</button>)}</div></div>
      <div className="companion-monitoring-plots">
        <PointPlot title="One boson at each site · P₁₁" rows={rows} selectedTime={time} maximum={1.05} fields={[{key:"p11_exact",label:"Master equation",color:"#77d8bd"},{key:"p11_mc",label:"1200 trajectories",color:"#e7bc7a",sampled:true}]}/>
        <PointPlot title="Unconditional state · purity Tr(ρ²)" rows={rows} selectedTime={time} maximum={1.05} fields={[{key:"master_purity",label:"Master equation",color:"#91bde7"}]}/>
        <PointPlot title="Conditioned pure trajectories · mean spatial-mode entropy" rows={rows} selectedTime={time} maximum={1.1} fields={[{key:"mean_trajectory_entropy",label:"1200 trajectories · nats",color:"#d7a8dc",sampled:true}]}/>
      </div>
      {selected&&<div className="companion-monitoring-readout" data-testid="monitoring-selected-values"><strong>At γ/J = {rate}, Jt/ℏ = {time}</strong><span>P₁₁ exact {format(selected.p11_exact)} · trajectory estimate {format(selected.p11_mc)}</span><span>Unconditional purity {format(selected.master_purity)}</span><span>Mean conditioned entropy {format(selected.mean_trajectory_entropy)} nats</span></div>}
      <p>Only the five archived times are shown. Purity describes the unconditional density matrix; mean entropy averages conditioned pure trajectories. They are different quantities, not estimates of each other. This finite example does not establish a measurement-induced phase transition. The Atlas dimer calculates static eigenstates and does not run this monitored evolution.</p>
      <p><button type="button" data-testid="monitoring-open-pdf" onClick={()=>void open()}>Open Chapter VIII PDF ↗</button> <small>§§4–6 · PDF pp. 4–7 · PDF SHA-256 <code>{chapter.sha256}</code> · CSV SHA-256 <code>{csvHash}</code>. Exact master values independently reproduced; sampled paths were not rerun.</small></p>
    </div>}
    {message&&<p role="alert">{message}</p>}
  </section>;
}
