import React from "react";
import type {WorkspaceModel} from "./workspace-navigation";
import {modelLabel} from "./workspace-navigation";

const QUBIT_MODELS=new Set<WorkspaceModel>(["two_level","driven_two_level","landau_zener","stuckelberg","strong_drive"]);
export function hasBlochSphere(model:WorkspaceModel){return QUBIT_MODELS.has(model)||model==="topology";}

const descriptions:Record<string,{field:string;interpretation:string;limit:string}>={
  two_level:{field:"Static effective field: (Ω, 0, Δ)",interpretation:"Eigenstates align or oppose the field.",limit:"A schematic direction—not the saved eigenstate expectations."},
  driven_two_level:{field:"Time-dependent transverse drive",interpretation:"A pure-state trajectory can move on the sphere.",limit:"No trajectory is drawn from a saved run here."},
  landau_zener:{field:"Detuning sweeps through zero",interpretation:"The effective field passes an avoided crossing.",limit:"The arrow is not a recorded passage sample."},
  stuckelberg:{field:"Two passages with phase accumulation",interpretation:"Interference depends on the path between crossings.",limit:"The dashed arc is conceptual, not computed data."},
  strong_drive:{field:"Periodic effective field",interpretation:"Floquet modes describe one-period evolution.",limit:"This sphere does not plot a quasienergy or Floquet state."},
};

/** Vector schematic only. Recorded Bloch expectations stay in exact-run lab views. */
export function BlochSphereIllustration({model}:{model:WorkspaceModel}){
  if(!hasBlochSphere(model))return null;
  const topology=model==="topology",description=topology?null:descriptions[model];
  return <figure className="theory-visual theory-bloch" data-testid="theory-bloch-visual">
    <svg viewBox="0 0 900 330" role="img" aria-label={`${topology?"Two-band pseudospin":"Bloch sphere"} schematic for ${modelLabel(model)}`}>
      <defs><marker id="bloch-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#f0bb82"/></marker>
        <radialGradient id="bloch-fill"><stop offset="0%" stopColor="#244b54" stopOpacity=".65"/><stop offset="100%" stopColor="#142a38" stopOpacity=".85"/></radialGradient></defs>
      <text x="35" y="33" fill="#a5ddd0" fontSize="14" fontFamily="Consolas,monospace">{topology?"TWO-BAND PSEUDOSPIN · d(k)/|d(k)|":"QUBIT STATE SPACE · PAULI BASIS"}</text>
      <circle cx="272" cy="169" r="115" fill="url(#bloch-fill)" stroke="#8dc9bb" strokeWidth="2"/>
      <ellipse cx="272" cy="169" rx="115" ry="39" fill="none" stroke="#6a94a1" strokeDasharray="5 6"/>
      <path d="M272 54 C335 111 335 227 272 284 M272 54 C209 111 209 227 272 284" fill="none" stroke="#426e7b" strokeDasharray="4 7"/>
      <path d="M153 214 L392 124 M175 107 L373 231 M272 295 L272 45" fill="none" stroke="#7496a6" strokeWidth="1.5"/>
      <text x="398" y="121" fill="#b7d3dc" fontSize="15">x</text><text x="377" y="241" fill="#b7d3dc" fontSize="15">y</text>
      <text x="282" y="54" fill="#b7d3dc" fontSize="15">z · {topology?"|A⟩":"|0⟩"}</text><text x="282" y="287" fill="#b7d3dc" fontSize="15">−z · {topology?"|B⟩":"|1⟩"}</text>
      {topology?<>
        <path d="M161 169 C204 128 337 128 383 169 C337 211 204 211 161 169" fill="none" stroke="#e6bb8b" strokeWidth="3"/>
        <path d="M272 169 L322 81" stroke="#7fd7c4" strokeWidth="3" markerEnd="url(#bloch-arrow)"/>
        <text x="508" y="93" fill="#e6bb8b" fontSize="16">SSH · d(k) lies on the equator</text>
        <text x="508" y="129" fill="#a9d4d2" fontSize="15">QWZ · d(k) can explore three components</text>
        <text x="508" y="179" fill="#d4e3e1" fontSize="14">This represents a two-component Bloch Hamiltonian,</text>
        <text x="508" y="201" fill="#d4e3e1" fontSize="14">not an electron's physical spin direction.</text>
        <text x="508" y="252" fill="#eabfb6" fontSize="14">At d(k) = 0, the direction and invariant are undefined.</text>
      </>:<>
        <path d="M272 169 L337 92" stroke="#f0bb82" strokeWidth="3" markerEnd="url(#bloch-arrow)"/>
        <path d="M235 146 Q267 105 315 125" fill="none" stroke="#86b4dd" strokeWidth="2" strokeDasharray="5 5"/>
        <text x="508" y="93" fill="#f0c493" fontSize="16">{description!.field}</text>
        <text x="508" y="137" fill="#d4e3e1" fontSize="15">{description!.interpretation}</text>
        <text x="508" y="193" fill="#a9d4d2" fontSize="14">North / south poles: computational basis |0⟩ / |1⟩.</text>
        <text x="508" y="218" fill="#a9d4d2" fontSize="14">A pure qubit state has a unit Bloch vector.</text>
        <text x="508" y="264" fill="#eabfb6" fontSize="14">{description!.limit}</text>
      </>}
    </svg>
    <figcaption>{topology?"Bloch-sphere representation of a two-band Hamiltonian · conceptual pseudospin map":"Bloch-sphere geometry · conceptual, not a saved-run state or measured trajectory"}</figcaption>
  </figure>;
}
