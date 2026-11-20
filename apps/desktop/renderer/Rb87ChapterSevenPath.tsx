import React, { useEffect, useState } from "react";
import type { CompanionChapter } from "../../../packages/contracts/companion";

type Channel = "dephasing" | "loss" | "fluorescence";
const channels: { id: Channel; label: string }[] = [
  { id: "dephasing", label: "Number dephasing" },
  { id: "loss", label: "Atom loss" },
  { id: "fluorescence", label: "Fluorescence readout" },
];

/** Three distinct ideal one-atom examples at dimensionless rate × time. */
export function chapterSevenExample(channel: Channel, elapsed: number, efficiency: number) {
  const survival = Math.exp(-elapsed);
  if (channel === "dephasing") return {
    primary: survival, secondary: 1, tertiary: 0,
  };
  if (channel === "loss") return {
    primary: survival, secondary: 1 - survival, tertiary: 0,
  };
  return {
    primary: survival, secondary: 1 - survival, tertiary: efficiency * (1 - survival),
  };
}

const descriptions: Record<Channel, { operator: string; title: string; model: string; locator: string; limit: string }> = {
  dephasing: {
    operator: "Lₗ = √γ nₗ; Lᵣ = √γ nᵣ",
    title: "Unread which-site information",
    model: "One atom begins in (|L⟩ + |R⟩)/√2 with tunneling neglected. Its two site populations remain ½ and ½, while normalized off-diagonal coherence falls as e⁻γᵗ.",
    locator: "Chapter VII §§5–6 · PDF pp. 4–5",
    limit: "This ideal number channel does not remove atoms. Real scattering can also cause recoil, internal transitions, or loss.",
  },
  loss: {
    operator: "Lᵢ = √κ aᵢ",
    title: "A particle leaves the retained system",
    model: "For one initial atom and no refilling, survival is e⁻κᵗ; the complementary probability occupies the zero-particle sector.",
    locator: "Chapter VII §7 · PDF p. 5",
    limit: "Loss requires both one- and zero-particle sectors. It is not a fading image of an atom that remains present.",
  },
  fluorescence: {
    operator: "Lₑₘ = √Γ |g⟩⟨e|",
    title: "Emission and a detector record",
    model: "One initially excited ideal two-level atom emits at most one photon without re-excitation. Excited-state survival is e⁻Γᵗ; a detector with efficiency η records that photon with probability η(1 − e⁻Γᵗ).",
    locator: "Chapter VII §§3–4, 12 · PDF pp. 4, 7",
    limit: "The atom remains in the ground state after this jump. Sustained fluorescence imaging needs driving, collection optics, cooling, and a separate detector model.",
  },
};

function ChannelFigure({ channel, elapsed, efficiency }: { channel: Channel; elapsed: number; efficiency: number }) {
  const values = chapterSevenExample(channel, elapsed, efficiency);
  const metric = channel === "dephasing" ? [
    ["Site L population", .5], ["Site R population", .5], ["Normalized coherence", values.primary],
  ] : channel === "loss" ? [
    ["Atom retained", values.primary], ["Zero-atom sector", values.secondary],
  ] : [
    ["Excited atom", values.primary], ["Ground-state atom", values.secondary], ["Photon detected", values.tertiary],
  ];
  return <figure className="companion-visual companion-seven-figure" data-testid="chapter-seven-figure">
    <div className="companion-visual-heading"><span>IDEAL ONE-ATOM EXAMPLE</span><strong>{descriptions[channel].title}</strong></div>
    <div className="companion-seven-bars">{metric.map(([label,value])=><div className="companion-seven-bar" key={label}><span>{label}</span><div role="img" aria-label={`${label}: ${(value as number).toFixed(3)}`}><i style={{width:`${(value as number)*100}%`}}/></div><strong>{(value as number).toFixed(3)}</strong></div>)}</div>
    <figcaption>{descriptions[channel].limit}</figcaption>
  </figure>;
}

/** Reviewed Chapter VII channel comparison; all notes require its pinned PDF. */
export function Rb87ChapterSevenPath() {
  const [chapters,setChapters] = useState<CompanionChapter[]>([]);
  const [checking,setChecking] = useState(true);
  const [channel,setChannel] = useState<Channel>("dephasing");
  const [elapsed,setElapsed] = useState(1);
  const [efficiency,setEfficiency] = useState(.5);
  const [message,setMessage] = useState("");
  useEffect(()=>{
    let active=true;
    const refresh=()=>{setChecking(true);void window.quantum.listCompanionChapters()
      .then(rows=>{if(active){setChapters(rows);setChecking(false);setMessage("");}})
      .catch(error=>{if(active){setChapters([]);setChecking(false);setMessage(String(error));}});};
    refresh();window.addEventListener("focus",refresh);
    return ()=>{active=false;window.removeEventListener("focus",refresh);};
  },[]);
  const chapter=chapters.find(row=>row.id==="rb87-vii");
  const related=chapters.find(row=>row.id==="rb87-viii");
  async function openChapter() {
    setMessage("");
    try {
      const current=(await window.quantum.listCompanionChapters()).find(row=>row.id==="rb87-vii");
      if(!current?.available) {setChapters(rows=>rows.filter(row=>row.id!=="rb87-vii"));throw new Error("Chapter VII source changed or is unavailable");}
      await window.quantum.openCompanionChapter("rb87-vii");
    } catch(error) {setMessage(error instanceof Error?error.message:String(error));}
  }
  return <section className="panel companion-reading-path companion-seven-path" data-testid="chapter-seven-path" aria-labelledby="chapter-seven-title">
    <div className="companion-path-heading"><div><p className="eyebrow">REVIEWED READING PATH / CHAPTER VII</p><h3 id="chapter-seven-title">Different channels, different evidence</h3><p>Choose the physical process before interpreting a changing state or camera signal.</p></div><span className="companion-path-mark" aria-hidden="true">VII</span></div>
    {checking?<p role="status">Checking Chapter VII source…</p>:!chapter?.available?<p role="status" data-testid="chapter-seven-withheld">Chapter VII notes are withheld because its PDF is missing or its hash changed.</p>:<div data-testid="chapter-seven-reading">
      <div className="companion-path-steps">
        <article><span className="companion-path-number">01</span><h4>State coupling</h4><p>A Lindblad jump operator specifies an effective channel. Unread outcomes give an unconditional density matrix; a retained record conditions a trajectory. An equation for the average state alone does not identify a camera record.</p><small>Chapter VII §§1–2, 4 · PDF pp. 3–4</small></article>
        <article><span className="companion-path-number">02</span><h4>Population, coherence, or particle count?</h4><p>Local number monitoring reduces coherence without changing site populations in its ideal limit. One-body loss lowers particle number and requires additional number sectors. An internal emission jump can yield a photon while retaining the atom.</p><small>Chapter VII §§3, 5–7 · PDF pp. 4–5</small></article>
        <article><span className="companion-path-number">03</span><h4>Camera inference</h4><p>Observed photons depend on collection and detection efficiency. Recoil, hopping, cooling, and loss limit real fluorescence imaging; a bright signal by itself does not establish a nondestructive number measurement.</p><small>Chapter VII §§11–12 · PDF p. 7</small></article>
      </div>
      <div className="companion-seven-controls"><div role="group" aria-label="Open-system channel">{channels.map(item=><button type="button" key={item.id} aria-pressed={channel===item.id} onClick={()=>setChannel(item.id)}>{item.label}</button>)}</div>
        <label>Dimensionless rate × time <strong>{elapsed.toFixed(2)}</strong><input data-testid="chapter-seven-time" type="range" min="0" max="3" step="0.25" value={elapsed} onChange={event=>setElapsed(Number(event.target.value))}/></label>
        {channel==="fluorescence"&&<label>Single-photon detection efficiency η <strong>{efficiency.toFixed(2)}</strong><input data-testid="chapter-seven-efficiency" type="range" min="0" max="1" step="0.1" value={efficiency} onChange={event=>setEfficiency(Number(event.target.value))}/></label>}
      </div>
      <div className="companion-seven-model"><strong>{descriptions[channel].operator}</strong><p>{descriptions[channel].model}</p><small>{descriptions[channel].locator}</small></div>
      <ChannelFigure channel={channel} elapsed={elapsed} efficiency={efficiency}/>
      <div className="companion-path-boundary"><div><p className="eyebrow">RELATED THEORY / CHAPTER VIII</p><h4>Monitored two-boson trajectories</h4><p>Chapter VIII's archived model uses local number-monitoring operators on a two-boson dimer. Its population, purity, and conditioned-entropy plots are a separate calculation from these one-atom channel illustrations.</p>{related?.available?<button type="button" data-testid="chapter-seven-open-monitoring" onClick={()=>document.getElementById("monitoring-visual")?.scrollIntoView({behavior:"smooth",block:"start"})}>Inspect Chapter VIII monitoring plot ↓</button>:<small>Chapter VIII source unavailable; related visual withheld.</small>}</div>
        <div><p className="eyebrow">CHECKED SOURCE</p><h4>Chapter VII PDF</h4><p>The notes and illustration require the pinned chapter. The reader checks its hash again before opening.</p><button type="button" data-testid="chapter-seven-open-pdf" onClick={()=>void openChapter()}>Open Chapter VII PDF ↗</button><small>{chapter.title} · {chapter.pages} pages · SHA-256 <code>{chapter.sha256}</code></small></div></div>
    </div>}
    {message&&<p role="alert">{message}</p>}
  </section>;
}
