import React from "react";
import type {WorkspaceModel} from "./workspace-navigation";
import {modelLabel} from "./workspace-navigation";

type Detail={constituents:[string,string];coupling:string;basis:string;observable:string;limit:string};
const DETAIL:Record<WorkspaceModel,Detail>={
  two_level:{constituents:["|0⟩","|1⟩"],coupling:"Ω σₓ / 2",basis:"2 basis states",observable:"E± and Bloch expectations",limit:"Static Hamiltonian"},
  driven_two_level:{constituents:["|0⟩","|1⟩"],coupling:"A cos(ωt+φ) σₓ",basis:"2 basis states",observable:"P₀, P₁, Bloch at tᵢ",limit:"Finite recorded time grid"},
  landau_zener:{constituents:["|0⟩","|1⟩"],coupling:"Δ(t) passage + Ω",basis:"2 basis states",observable:"Transition and Bloch at tᵢ",limit:"Finite passage, not t→∞"},
  stuckelberg:{constituents:["first crossing","second crossing"],coupling:"phase between passages",basis:"2 basis states",observable:"Interference in P₁(tᵢ)",limit:"Finite double passage"},
  strong_drive:{constituents:["qubit","periodic field"],coupling:"one-period propagator",basis:"2 basis states",observable:"modes and quasienergies",limit:"Quasienergy modulo ω"},
  jaynes_cummings:{constituents:["two-level atom","cavity photons"],coupling:"g(σ₊a + σ₋a†)",basis:"atom ⊗ Fock cutoff",observable:"P(e), ⟨n⟩, excitation N",limit:"Cutoff-edge state flagged"},
  quantum_rabi:{constituents:["two-level atom","cavity photons"],coupling:"gσₓ(a+a†)",basis:"atom ⊗ Fock cutoff",observable:"P(e), ⟨n⟩, run parity",limit:"No stored level parity"},
  lindblad:{constituents:["atom + cavity","environment"],coupling:"drive + jump operators",basis:"density operator",observable:"trace, purity, occupation",limit:"No saved full ρ(tᵢ)"},
  ising_chain:{constituents:["spin sites","neighbor bonds"],coupling:"Jσᶻσᶻ + hₓσˣ",basis:"2ᴺ spin states",observable:"gap, ⟨σᶻᵢ⟩, quench rows",limit:"Finite N = 2…8"},
  topology:{constituents:["SSH chain","QWZ k-mesh"],coupling:"hopping / Bloch d(k)",basis:"sublattice basis",observable:"bands, curvature, winding",limit:"Invariant undefined at closure"},
  hydrogenic:{constituents:["nucleus +Ze","one electron"],coupling:"Coulomb attraction",basis:"Rₙₗ(r)Yₗₘ(θ,φ)",observable:"ψ amplitude and |ψ|²",limit:"One-electron model"},
  oscillator:{constituents:["mode coordinate","restoring potential"],coupling:"ω(a†a+½)",basis:"truncated Fock ladder",observable:"energies, moments, density",limit:"Check Fock cutoff"},
  transmon:{constituents:["junction EJ","capacitance EC"],coupling:"Josephson cosine",basis:"charge |−ncut…ncut⟩",observable:"GHz transitions and drift",limit:"No saved eigenvector"},
};

/** A second, annotated anatomy view; never derived from a numerical run. */
export function DetailedTheoryIllustration({model}:{model:WorkspaceModel}){
  const d=DETAIL[model];
  return <figure className="theory-visual theory-detailed" data-testid="theory-detailed-visual">
    <svg viewBox="0 0 900 320" role="img" aria-label={`Detailed schematic of ${modelLabel(model)}`}>
      <defs><marker id="detail-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#a9d8cc"/></marker></defs>
      <text x="32" y="38" fill="#9bdbcb" fontSize="14" fontFamily="Consolas,monospace">SYSTEM ANATOMY · {modelLabel(model).toUpperCase()}</text>
      <rect x="34" y="67" width="246" height="164" rx="10" fill="#163039" stroke="#5baaa2"/>
      <text x="52" y="95" fill="#a9d8cc" fontSize="12">CONSTITUENTS</text>
      <circle cx="85" cy="151" r="20" fill="#315c59" stroke="#8ed7c4" strokeWidth="2"/>
      <circle cx="222" cy="151" r="20" fill="#5d4d45" stroke="#e1b88b" strokeWidth="2"/>
      <path d="M105 151 H202" stroke="#d4e5dd" strokeWidth="2" markerEnd="url(#detail-arrow)"/>
      <text x="85" y="190" fill="#c9d9d6" fontSize="12" textAnchor="middle">{d.constituents[0]}</text>
      <text x="222" y="190" fill="#c9d9d6" fontSize="12" textAnchor="middle">{d.constituents[1]}</text>
      <path d="M286 150 H324" stroke="#8aafad" strokeWidth="2" markerEnd="url(#detail-arrow)"/>
      <rect x="330" y="67" width="242" height="164" rx="10" fill="#1d303e" stroke="#7199af"/>
      <text x="348" y="95" fill="#adcad9" fontSize="12">INTERACTION / BASIS</text>
      <text x="451" y="143" fill="#f1c58d" fontSize="14" textAnchor="middle">{d.coupling}</text>
      <text x="451" y="186" fill="#c4d6dd" fontSize="12" textAnchor="middle">{d.basis}</text>
      <path d="M578 150 H616" stroke="#8aafad" strokeWidth="2" markerEnd="url(#detail-arrow)"/>
      <rect x="622" y="67" width="246" height="164" rx="10" fill="#1c3536" stroke="#66a99d"/>
      <text x="640" y="95" fill="#a9d8cc" fontSize="12">RECORDED / DERIVED</text>
      <path d="M649 180 L680 151 L712 166 L744 119 L775 137 L840 104" fill="none" stroke="#8ed7c4" strokeWidth="3"/>
      <text x="745" y="205" fill="#c9d9d6" fontSize="12" textAnchor="middle">{d.observable}</text>
      <rect x="34" y="252" width="834" height="45" rx="6" fill="#352b2e" stroke="#b58787"/>
      <text x="52" y="280" fill="#ebc3bd" fontSize="13">INTERPRETATION LIMIT  ·  {d.limit}</text>
    </svg>
    <figcaption>Annotated model anatomy · schematic, not a computed state or measured geometry</figcaption>
  </figure>;
}
