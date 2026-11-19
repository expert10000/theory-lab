import React, { useState } from "react";

/** Exact eigenvalues of the N=2, two-site Bose–Hubbard matrix, with J=1. */
export function twoBosonDimerLevels(interactionRatio: number): [number, number, number] {
  const half = interactionRatio / 2;
  const split = Math.hypot(half, 2);
  return [half - split, interactionRatio, half + split];
}

export function AtomToModeFigure() {
  return <figure className="companion-visual companion-atom-visual" data-testid="companion-atom-visual">
    <div className="companion-visual-heading"><span>01 / CHANGE OF DESCRIPTION</span><strong>Inside one atom → motion of whole atoms</strong></div>
    <svg viewBox="0 0 760 190" role="img" aria-label="Schematic Rb87 atom with internal electron cloud, then several whole atoms occupying one motional mode">
      <defs>
        <radialGradient id="atom-cloud"><stop stopColor="#78c3bd" stopOpacity=".38"/><stop offset="1" stopColor="#78c3bd" stopOpacity=".03"/></radialGradient>
        <linearGradient id="mode-cloud"><stop stopColor="#62abcf" stopOpacity=".04"/><stop offset=".5" stopColor="#62abcf" stopOpacity=".3"/><stop offset="1" stopColor="#62abcf" stopOpacity=".04"/></linearGradient>
      </defs>
      <circle cx="130" cy="96" r="70" fill="url(#atom-cloud)" stroke="#6ca5a6" strokeDasharray="3 6"/>
      <circle cx="130" cy="96" r="14" fill="#ddaf7e"/>
      <circle cx="116" cy="89" r="3" fill="#f5dfbd"/><circle cx="140" cy="92" r="3" fill="#f5dfbd"/><circle cx="130" cy="105" r="3" fill="#f5dfbd"/>
      <text x="130" y="14" textAnchor="middle">ONE Rb87 ATOM</text>
      <text x="130" y="184" textAnchor="middle">internal electron cloud</text>
      <path d="M242 96 H347 M335 86 L347 96 L335 106" fill="none" stroke="#b7c8c1" strokeWidth="2"/>
      <text x="294" y="72" textAnchor="middle">different coordinate</text>
      <ellipse cx="565" cy="96" rx="154" ry="61" fill="url(#mode-cloud)" stroke="#668fa9" strokeDasharray="5 6"/>
      {[475,535,595,655].map((x,i)=><g key={x}><circle cx={x} cy={i%2 ? 113 : 77} r="17" fill="#d3ae7c" stroke="#f4d7a1" strokeWidth="2"/><circle cx={x} cy={i%2 ? 113 : 77} r="4" fill="#6b5748"/></g>)}
      <text x="565" y="14" textAnchor="middle">MANY WHOLE ATOMS</text>
      <text x="565" y="184" textAnchor="middle">shared motional mode</text>
    </svg>
    <figcaption>Each gold circle on the right represents an entire atom. The clouds are schematic; neither is a calculated Rb87 electronic orbital or trap wavefunction.</figcaption>
  </figure>;
}

function PixelFrame({ kind }: { kind: "reference" | "atoms" }) {
  return <div className={`companion-pixel-frame companion-pixel-${kind}`} aria-hidden="true">
    {Array.from({length: 35},(_,index) => <span key={index} style={{opacity: kind === "atoms" ?
      (Math.abs((index%7)-3)<2 && Math.abs(Math.floor(index/7)-2)<2 ? .22 : .72) : .72}}/>)}
  </div>;
}

export function ImageInferenceFigure() {
  return <figure className="companion-visual companion-image-visual" data-testid="companion-image-visual">
    <div className="companion-visual-heading"><span>02 / ABSORPTION IMAGING</span><strong>Pixels first, quantities after calibration</strong></div>
    <div className="companion-image-flow">
      <div><span className="companion-visual-tag">RECORDED</span><PixelFrame kind="reference"/><strong>Probe reference</strong><small>I<sub>ref</sub> at each pixel</small></div>
      <span className="companion-flow-symbol" aria-hidden="true">÷</span>
      <div><span className="companion-visual-tag">RECORDED</span><PixelFrame kind="atoms"/><strong>Atom image</strong><small>I<sub>atoms</sub> at each pixel</small></div>
      <span className="companion-flow-symbol companion-flow-arrow" aria-hidden="true">→</span>
      <div className="companion-derived"><span className="companion-visual-tag">INFERRED</span><b>OD = ln(I<sub>ref</sub> / I<sub>atoms</sub>)</b><strong>Optical depth</strong><small>Column density needs a calibrated σ<sub>eff</sub>.</small></div>
    </div>
    <figcaption>Illustrative pixel pattern, not experimental data. An absorption image integrates along the line of sight; it does not directly reveal the three-dimensional wavefunction or phase.</figcaption>
  </figure>;
}

const chart = {left: 48, right: 536, top: 20, bottom: 216};
const x = (u:number) => chart.left + (u/20)*(chart.right-chart.left);
const y = (energy:number) => chart.bottom - ((energy+3)/25)*(chart.bottom-chart.top);
const levelColors = ["#78d6bb", "#e9bc7b", "#90b8e7"];
const levelNames = ["Ground", "Middle", "Upper"];

export function DimerEnergyFigure({ onOpenDimer }: { onOpenDimer: () => void }) {
  const [interaction, setInteraction] = useState(4);
  const levels = twoBosonDimerLevels(interaction);
  const curves = [0,1,2].map(level => Array.from({length:81},(_,i) => {
    const u = i/4;
    return `${x(u).toFixed(1)},${y(twoBosonDimerLevels(u)[level]).toFixed(1)}`;
  }).join(" "));

  return <figure className="companion-visual companion-energy-visual" data-testid="companion-energy-visual">
    <div className="companion-visual-heading"><span>03 / EXACT FINITE MATRIX</span><strong>Two atoms, two sites: energy levels</strong></div>
    <div className="companion-energy-layout">
      <svg viewBox="0 0 580 258" role="img" aria-label={`Three N=2 dimer energy levels in units of J across U over J from zero to twenty; selected U over J ${interaction}`}>
        {[0,5,10,15,20].map(value=><g key={value}><line x1={x(value)} x2={x(value)} y1={chart.top} y2={chart.bottom} stroke="#39545b"/><text x={x(value)} y="238" textAnchor="middle">{value}</text></g>)}
        {[-2,0,5,10,15,20].map(value=><g key={value}><line x1={chart.left} x2={chart.right} y1={y(value)} y2={y(value)} stroke="#334b51"/><text x="36" y={y(value)+4} textAnchor="end">{value}</text></g>)}
        <text x="292" y="255" textAnchor="middle">interaction U/J</text>
        <text x="8" y="15">E/J</text>
        {curves.map((points,index)=><polyline key={index} points={points} fill="none" stroke={levelColors[index]} strokeWidth="2.5"/>)}
        <line x1={x(interaction)} x2={x(interaction)} y1={chart.top} y2={chart.bottom} stroke="#e8e9d8" strokeDasharray="4 5"/>
        {levels.map((energy,index)=><circle key={index} cx={x(interaction)} cy={y(energy)} r="5" fill={levelColors[index]} stroke="#10252c" strokeWidth="2"/>)}
      </svg>
      <div className="companion-energy-controls">
        <label htmlFor="companion-energy-interaction">Interaction <strong>U/J = {interaction.toFixed(1)}</strong></label>
        <input id="companion-energy-interaction" data-testid="companion-energy-slider" type="range" min="0" max="20" step="0.5" value={interaction} onChange={event=>setInteraction(Number(event.target.value))}/>
        <div className="companion-energy-values" aria-live="polite">{levels.map((energy,index)=><div key={index}><span style={{backgroundColor:levelColors[index]}}/><small>{levelNames[index]}</small><strong>{energy.toFixed(3)} J</strong></div>)}</div>
        <p>Exact N=2 eigenvalues of the implemented Bose–Hubbard dimer. These are model energies, not electronic levels of Rb87 or measured temperatures.</p>
        <button type="button" onClick={onOpenDimer}>Run the full dimer in Atlas ↗</button>
      </div>
    </div>
    <figcaption>J sets the energy unit. The interaction shifts this finite three-level spectrum smoothly; the plot does not represent an extended lattice phase transition.</figcaption>
  </figure>;
}
