import React from "react";
import type {WorkspaceModel} from "./workspace-navigation";
import {modelLabel} from "./workspace-navigation";

const line="#7cd6c2",muted="#7c9ba9",warm="#e1b88b";
const caption=(x:number,y:number,value:string,anchor:"start"|"middle"|"end"="start")=>
  <text x={x} y={y} textAnchor={anchor} fill="#bfd4d2" fontSize="13" fontFamily="Consolas, monospace">{value}</text>;

function TwoLevel({model}:{model:WorkspaceModel}){
  if(model==="landau_zener"||model==="stuckelberg")return <>
    <path d={model==="landau_zener"?"M120 185 C225 175 267 102 340 92 C413 82 455 35 560 25":"M110 48 C190 60 235 183 325 187 C415 183 460 60 560 48"}
      fill="none" stroke={line} strokeWidth="3"/>
    <path d={model==="landau_zener"?"M120 28 C225 38 267 105 340 116 C413 127 455 185 560 192":"M110 190 C190 178 235 63 325 57 C415 63 460 178 560 190"}
      fill="none" stroke={warm} strokeWidth="3"/>
    <line x1="100" y1="208" x2="582" y2="208" stroke={muted} strokeWidth="1.5" markerEnd="url(#theory-arrow)"/>
    {caption(580,230,"time", "end")}
    {caption(335,145,model==="landau_zener"?"avoided crossing":"two passages", "middle")}
  </>;
  return <>
    <line x1="145" y1="165" x2="510" y2="165" stroke={line} strokeWidth="3"/>
    <line x1="145" y1="75" x2="510" y2="75" stroke={warm} strokeWidth="3"/>
    {caption(120,170,"|0⟩","end")}{caption(120,80,"|1⟩","end")}
    <line x1="330" y1="151" x2="330" y2="88" stroke="#e3ecdd" strokeWidth="2" markerEnd="url(#theory-arrow)"/>
    {caption(355,127,model==="two_level"?"Ω coupling":model==="strong_drive"?"periodic strong drive":"A cos(ωt + φ)")}
    {model!=="two_level"&&<path d="M185 205 C215 170 245 240 275 205 S335 170 365 205 S425 240 455 205 S515 170 545 205" fill="none" stroke="#79a9df" strokeWidth="2"/>}
    {model==="strong_drive"&&caption(340,40,"Floquet modes · quasienergies","middle")}
  </>;
}
function Cavity({model}:{model:WorkspaceModel}){
  return <>
    <rect x="105" y="40" width="17" height="155" rx="3" fill="#7ca6b3"/>
    <rect x="555" y="40" width="17" height="155" rx="3" fill="#7ca6b3"/>
    <path d="M130 125 Q165 55 200 125 T270 125 T340 125 T410 125 T480 125 T550 125" fill="none" stroke={line} strokeWidth="3"/>
    <circle cx="338" cy="125" r="24" fill="#263849" stroke={warm} strokeWidth="2"/>
    <circle cx="338" cy="117" r="5" fill={warm}/><circle cx="338" cy="136" r="5" fill={line}/>
    {caption(338,35,"atom ⊗ cavity","middle")}
    {caption(338,224,model==="jaynes_cummings"?"excitation exchange (rotating-wave model)":model==="quantum_rabi"?"counter-rotating coupling retained":"drive + environmental loss", "middle")}
    {model==="lindblad"&&<><path d="M585 80 L625 42 M585 158 L625 195" stroke="#dc9b9f" strokeWidth="2" markerEnd="url(#theory-arrow)"/>{caption(600,118,"bath")}</>}
  </>;
}
function Ising(){return <>
  {[155,245,335,425,515].map((x,i)=><g key={x}>
    {i<4&&<line x1={x+22} y1="125" x2={x+68} y2="125" stroke={warm} strokeWidth="4"/>}
    <circle cx={x} cy="125" r="23" fill="#193b39" stroke={line} strokeWidth="2"/>
    <path d={`M${x} 140 L${x} 109 M${x} 109 L${x-7} 117 M${x} 109 L${x+7} 117`} stroke="#e0eee5" strokeWidth="2" fill="none"/>
  </g>)}
  {caption(335,55,"finite spin-½ chain","middle")}{caption(200,105,"J", "middle")}
  <path d="M335 205 L335 170" stroke="#79a9df" strokeWidth="2" markerEnd="url(#theory-arrow)"/>
  {caption(350,195,"transverse hₓ")}
</>}
function Topology(){return <>
  {Array.from({length:6},(_,i)=><g key={i}>
    <circle cx={95+i*65} cy="83" r="12" fill={i%2?"#3c6074":"#356f61"} stroke={i%2?"#a8c8db":line} strokeWidth="2"/>
    {i<5&&<line x1={107+i*65} y1="83" x2={148+i*65} y2="83" stroke={i%2?warm:line} strokeWidth={i%2?2:5}/>}
  </g>)}
  {caption(335,40,"SSH · alternating t₁ / t₂","middle")}
  <rect x="260" y="131" width="150" height="76" fill="#173644" stroke="#7daac0" strokeWidth="2"/>
  <path d="M260 169 H410 M335 131 V207" stroke="#3e6d77"/>
  <circle cx="315" cy="154" r="17" fill="#81a5cb" fillOpacity=".4"/><circle cx="369" cy="184" r="19" fill="#d2a980" fillOpacity=".4"/>
  {caption(425,172,"QWZ · Berry curvature in k-space")}
</>}
function Hydrogenic(){return <>
  <circle cx="335" cy="119" r="92" fill="url(#orbital-cloud)"/>
  <ellipse cx="335" cy="119" rx="137" ry="69" fill="none" stroke="#7db7d8" strokeOpacity=".45" strokeDasharray="4 6"/>
  <circle cx="335" cy="119" r="19" fill="#8f3d47" stroke="#efb2ac" strokeWidth="2"/>
  {caption(335,125,"+", "middle")}
  <line x1="344" y1="135" x2="443" y2="190" stroke={muted}/>
  {caption(453,197,"electron probability cloud |ψ|²")}
  <line x1="315" y1="106" x2="234" y2="58" stroke={muted}/>
  {caption(222,56,"nucleus (+Ze)","end")}
  {caption(222,76,"one proton if Z = 1","end")}
</>}
function Oscillator(){return <>
  <path d="M130 210 Q335 -150 540 210" fill="none" stroke={line} strokeWidth="3"/>
  {[173,137,101,65].map((y,i)=><g key={y}>
    <line x1={210+i*23} y1={y} x2={460-i*23} y2={y} stroke={warm} strokeWidth="2"/>
    {caption(475-i*23,y+4,`n=${i}`)}
  </g>)}
  {caption(335,230,"position q · equally spaced harmonic levels","middle")}
</>}
function Transmon(){return <>
  <path d="M155 105 H245 M295 105 H380 M435 105 H525 M155 105 V175 H525 V105" fill="none" stroke={line} strokeWidth="3"/>
  <line x1="245" y1="78" x2="245" y2="132" stroke={warm} strokeWidth="3"/>
  <line x1="295" y1="78" x2="295" y2="132" stroke={warm} strokeWidth="3"/>
  <rect x="380" y="80" width="55" height="50" rx="5" fill="#21434b" stroke="#a8c8db" strokeWidth="2"/>
  <path d="M392 115 L423 95 M392 95 L423 115" stroke="#a8c8db" strokeWidth="2"/>
  {caption(270,65,"C", "middle")}{caption(408,65,"Josephson junction", "middle")}
  {caption(335,220,"finite charge basis · Eⱼ / E꜀", "middle")}
</>}

/** A model-specific schematic, not a rendering of a run or measured state. */
export function TheoryIllustration({model}:{model:WorkspaceModel}){
  const twoLevel=["two_level","driven_two_level","landau_zener","stuckelberg","strong_drive"].includes(model);
  const cavity=["jaynes_cummings","quantum_rabi","lindblad"].includes(model);
  return <figure className="theory-visual" data-testid="theory-visual">
    <svg viewBox="0 0 680 250" role="img" aria-label={`Schematic illustration of ${modelLabel(model)}`}>
      <defs><marker id="theory-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#a9d8cc"/></marker>
        <radialGradient id="orbital-cloud"><stop offset="0%" stopColor="#a9d6eb" stopOpacity=".52"/><stop offset="60%" stopColor="#73b6de" stopOpacity=".26"/><stop offset="100%" stopColor="#73b6de" stopOpacity="0"/></radialGradient></defs>
      {twoLevel?<TwoLevel model={model}/>:cavity?<Cavity model={model}/>:model==="ising_chain"?<Ising/>:model==="topology"?<Topology/>:
        model==="hydrogenic"?<Hydrogenic/>:model==="oscillator"?<Oscillator/>:<Transmon/>}
    </svg>
    <figcaption>Conceptual schematic · not a computed wavefunction, trajectory, or saved run</figcaption>
  </figure>;
}
