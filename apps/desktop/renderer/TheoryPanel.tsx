import React,{useState} from "react";
import { MODEL_REGISTRY } from "../../../packages/models";
import { CAVITY_REGISTRY } from "../../../packages/models/cavity";
import type { WorkspaceModel } from "./workspace-navigation";
import { modelLabel } from "./workspace-navigation";
import {TheoryIllustration} from "./TheoryIllustration";
import {DetailedTheoryIllustration} from "./DetailedTheoryIllustration";

type TheoryContent = {
  idea: string;
  formula: string;
  basis: string;
  parameters: readonly string[];
  shows: readonly string[];
  boundary: string;
};

const OTHER_THEORY: Record<Exclude<WorkspaceModel, keyof typeof MODEL_REGISTRY | keyof typeof CAVITY_REGISTRY>, TheoryContent> = {
  lindblad: {
    idea: "A driven atom–cavity system exchanges energy with its environment. Its density operator obeys a Lindblad master equation rather than a closed-state Schrödinger equation.",
    formula: "H = Δq |e⟩⟨e| + Δc a†a + g(σ₊a + σ₋a†) + F(a + a†)",
    basis: "Atom ⊗ truncated cavity Fock space; rotating frame; ℏ = 1.",
    parameters: ["Atom and cavity detunings Δq, Δc", "Coupling g and cavity drive F", "Relaxation, dephasing and cavity-loss rates", "Fock cutoff and time grid"],
    shows: ["Recorded populations and photon occupation", "Trace and purity diagnostics", "Steady state when the solver reports one"],
    boundary: "Saved evolution columns are density-derived observables, not a stored density matrix at every time sample.",
  },
  ising_chain: {
    idea: "A finite chain of coupled spins competes between Ising alignment and transverse-field fluctuations.",
    formula: "H = −J Σ σᶻᵢσᶻᵢ₊₁ − hₓ Σ σˣᵢ − hᶻ Σ σᶻᵢ",
    basis: "Full spin-½ computational basis, with open or periodic boundary conditions.",
    parameters: ["Site count N and boundary condition", "Interaction J", "Transverse field hₓ and longitudinal field hᶻ"],
    shows: ["Low-lying energies and gap", "Site magnetizations and half-chain entropy", "A separate verified ground-state sidecar when available"],
    boundary: "The ordinary run result stores low energies and observables; detailed state inspection requires its separately verified state artifact.",
  },
  topology: {
    idea: "SSH and QWZ are distinct lattice models. The former tests one-dimensional winding and finite-chain edges; the latter tests two-dimensional Berry curvature and Chern topology.",
    formula: "SSH: H(k) = (t₁ + t₂ cos k) σₓ + t₂ sin k σᵧ   ·   QWZ: H(k) = sin kₓ σₓ + sin kᵧ σᵧ + (m + cos kₓ + cos kᵧ) σᶻ",
    basis: "Two-component Bloch basis; SSH additionally has a finite open chain.",
    parameters: ["SSH intracell/intercell hoppings t₁, t₂ and cell count", "QWZ mass m and momentum mesh"],
    shows: ["Bands and finite SSH edge density", "SSH winding or QWZ Berry curvature and Chern diagnostics"],
    boundary: "At a bulk gap closure the topological invariant is undefined. The finite mesh has an explicit resolution check.",
  },
  hydrogenic: {
    idea: "A single electron in a Coulomb potential has separable radial and angular eigenfunctions. The lab samples selected normalized hydrogenic orbitals.",
    formula: "ψₙₗₘ(r, θ, φ) = Rₙₗ(r) Yₗₘ(θ, φ)",
    basis: "Single-electron Coulomb states in Bohr radii a₀ and Hartree energy units.",
    parameters: ["Principal, angular and magnetic quantum numbers n, l, m", "Nuclear charge Z", "Complex or real angular combination and spatial grid"],
    shows: ["Sampled orbital amplitude and probability density", "Normalization and radial/angular structure"],
    boundary: "This is a hydrogenic one-electron model, not a multi-electron atom, molecule or crystal.",
  },
  oscillator: {
    idea: "The harmonic oscillator has equally spaced levels. The lab also explores bounded free, driven, pulsed, damped, parametric and quartic variants.",
    formula: "H₀ = ω(a†a + ½)   ·   driven: H(t) = H₀ + ε(t)a† + ε*(t)a   ·   quartic: H = p²/2 + ω²x²/2 + λx⁴",
    basis: "Truncated Fock basis for numerical jobs; dimensionless q/p and ℏ = 1.",
    parameters: ["Frequency ω and Fock cutoff", "Chosen initial state and time grid", "Drive, pulse, damping or anharmonic inputs in the selected oscillator mode"],
    shows: ["Energies and wavefunctions in stationary mode", "Recorded populations, moments and convergence diagnostics in evolution modes"],
    boundary: "A finite Fock cutoff and bounded solver settings must be checked for each run. The listed formulas describe different modes, not one combined Hamiltonian.",
  },
  transmon: {
    idea: "A Josephson junction shunted by capacitance becomes a weakly anharmonic quantum circuit. The lab diagonalizes a finite charge-basis approximation.",
    formula: "H = 4E꜀(n − nᵍ)² − Eⱼ cos φ",
    basis: "Charge states |n⟩, truncated at ±ncut; frequencies reported in GHz.",
    parameters: ["Josephson energy Eⱼ and charging energy E꜀", "Offset charge nᵍ", "Charge cutoff ncut and requested levels"],
    shows: ["Stored energy levels and transition frequencies", "Anharmonicity, charge matrix element and cutoff drift"],
    boundary: "The saved result stores energies and derived diagnostics, not a full eigenstate vector.",
  },
};

const REGISTRY_NOTES: Record<keyof typeof MODEL_REGISTRY, Pick<TheoryContent,"idea"|"basis"|"shows"|"boundary">> = {
  two_level: {
    idea: "A static detuning and transverse coupling split two basis states into an avoided crossing.",
    basis: "Computational |0⟩, |1⟩ basis; Pauli operators; normalized energy and ℏ = 1.",
    shows: ["Two eigenenergies and their separation", "Eigenstate Bloch expectations and selected-state observables", "QuTiP/native comparison when both engines are available"],
    boundary: "This is a time-independent two-state model; the spectrum view is not a saved trajectory.",
  },
  driven_two_level: {
    idea: "A periodic transverse field drives transitions between two quantum levels.",
    basis: "Computational |0⟩, |1⟩ basis; time-dependent Pauli Hamiltonian; ℏ = 1.",
    shows: ["Time-resolved P₀, P₁ and Bloch expectations", "Selected recorded time sample and solver diagnostics"],
    boundary: "A plotted sample is a point in a verified trajectory, not a separate saved run.",
  },
  landau_zener: {
    idea: "A linearly changing detuning carries the system through an avoided crossing.",
    basis: "Computational |0⟩, |1⟩ basis; finite sweep interval; ℏ = 1.",
    shows: ["Population transfer and Bloch expectations along the passage", "Recorded passage and numerical diagnostics"],
    boundary: "The result describes a finite numerical passage; asymptotic transition formulas are references, not substituted data.",
  },
  stuckelberg: {
    idea: "Two passages through an avoided crossing can interfere through the phase accumulated between them.",
    basis: "Computational |0⟩, |1⟩ basis; crossings at ±τ when bias is zero.",
    shows: ["Time-resolved populations and Bloch expectations", "Passage/interference diagnostics from the computed run"],
    boundary: "The displayed passage is finite-time and depends on the chosen initial state and sweep interval.",
  },
  strong_drive: {
    idea: "A strong periodic drive calls for one-period Floquet modes and quasienergies in addition to direct evolution.",
    basis: "Computational two-level basis; periodic drive with positive angular frequency.",
    shows: ["Population/Bloch trajectories", "One-period modes, quasienergies and resonance-map diagnostics"],
    boundary: "Quasienergies are defined modulo the drive frequency; they are not ordinary static energy levels.",
  },
};

export function theoryForModel(model:WorkspaceModel):TheoryContent {
  if(model in MODEL_REGISTRY){
    const definition=MODEL_REGISTRY[model as keyof typeof MODEL_REGISTRY];
    const notes=REGISTRY_NOTES[model as keyof typeof MODEL_REGISTRY];
    return {...notes,formula:definition.hamiltonian,
      parameters:definition.parameters.map(item=>`${item.symbol} — ${item.label}: ${item.description}`)};
  }
  if(model in CAVITY_REGISTRY){
    const definition=CAVITY_REGISTRY[model as keyof typeof CAVITY_REGISTRY];
    return {idea:definition.description,formula:definition.hamiltonian,
      basis:"Atom ⊗ truncated cavity Fock states |qubit, n⟩; ℏ = 1.",
      parameters:["Qubit frequency ωq", "Cavity frequency ωc", "Atom–cavity coupling g", "Photon cutoff and initial occupation"],
      shows:["Recorded atom and photon populations", "Boundary occupation and numerical drift", ...(model==="jaynes_cummings"?["Excitation-conserving dressed-state reference"]:[])],
      boundary:model==="jaynes_cummings"?"The rotating-wave interaction conserves excitation number. Saved dynamics do not include a full state vector.":
        "Counter-rotating terms do not conserve excitation number. Saved dynamics do not include a full state vector."};
  }
  return OTHER_THEORY[model as keyof typeof OTHER_THEORY];
}

export function TheoryPanel({model}:{model:WorkspaceModel}){
  const content=theoryForModel(model);
  const [visualMode,setVisualMode]=useState<"overview"|"detail">("overview");
  return <section className="panel theory-panel" data-testid="model-theory">
    <p className="eyebrow">SELECTED SYSTEM / THEORY GUIDE</p>
    <h2>{modelLabel(model)}</h2>
    <p>{content.idea}</p>
    <div className="theory-view-switch" role="group" aria-label="Theory illustration view">
      <button type="button" aria-pressed={visualMode==="overview"} onClick={()=>setVisualMode("overview")}>Overview image</button>
      <button type="button" aria-pressed={visualMode==="detail"} onClick={()=>setVisualMode("detail")}>Detailed view</button>
    </div>
    {visualMode==="overview"?<TheoryIllustration model={model}/>:<DetailedTheoryIllustration model={model}/>}
    <div className="theory-formula" aria-label="Model Hamiltonian or wavefunction">{content.formula}</div>
    <div className="theory-grid">
      <div><h3>Basis & conventions</h3><p>{content.basis}</p></div>
      <div><h3>Inputs in this lab</h3><ul>{content.parameters.map(item=><li key={item}>{item}</li>)}</ul></div>
      <div><h3>What the lab presents</h3><ul>{content.shows.map(item=><li key={item}>{item}</li>)}</ul></div>
      <div><h3>Interpretation boundary</h3><p>{content.boundary}</p></div>
    </div>
    <p className="theory-footnote">This guide describes the selected model and available outputs. Numerical values belong to verified saved runs; changing a draft does not change an earlier result.</p>
  </section>;
}
