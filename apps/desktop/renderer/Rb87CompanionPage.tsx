import React from "react";
import { AtlasFormula } from "./AtlasFormula";
import { BoseHubbardCompanion } from "./BoseHubbardCompanion";
import { Rb87ChapterOnePath } from "./Rb87ChapterOnePath";
import { Rb87ChapterTwoPath } from "./Rb87ChapterTwoPath";
import { DimerEnergyFigure } from "./CompanionVisuals";
import { Rb87LatticePath } from "./Rb87LatticePath";
import { Rb87MeasurementPath } from "./Rb87MeasurementPath";
import { Rb87MonitoringVisual } from "./Rb87MonitoringVisual";

/** Library entry for the bounded dimer already implemented in the Lab. */
export function Rb87CompanionPage({ onOpenDimer, onOpenRuns, onOpenTheory, onOpenOrbitals }: {
  onOpenDimer: () => void; onOpenRuns: () => void; onOpenTheory: () => void; onOpenOrbitals: () => void;
}) {
  return <div className="companion-page" data-testid="rb87-companion-page">
    <section className="panel companion-hero">
      <p className="eyebrow">LIBRARY / RB87 QUANTUM COMPANION</p>
      <h2>A two-site bosonic system you can calculate.</h2>
      <p>The working example is a fixed-particle-number Bose–Hubbard dimer. Theory Lab diagonalizes its finite Hamiltonian, saves the result, and opens a selected eigenstate as a verified scene. The supplied chapters support the explanation below; the calculation happens in the Lab.</p>
      <div className="dynamics-actions">
        <button type="button" className="run-button" data-testid="companion-open-dimer" onClick={onOpenDimer}>Open runnable dimer in Atlas ↗</button>
        <button type="button" data-testid="companion-open-theory" onClick={onOpenTheory}>Read dimer Theory ↗</button>
        <button type="button" data-testid="companion-open-runs" onClick={onOpenRuns}>View saved dimer runs ↗</button>
      </div>
    </section>
    <Rb87ChapterOnePath onOpenOrbitals={onOpenOrbitals} />
    <Rb87ChapterTwoPath />
    <Rb87LatticePath onInspectRun={() => document.getElementById("companion-saved-energy")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
    <Rb87MeasurementPath onInspectRun={() => document.getElementById("companion-saved-energy")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
    <Rb87MonitoringVisual />
    <section className="panel companion-model" aria-labelledby="companion-model-heading">
      <p className="eyebrow">IMPLEMENTED MODEL / TWO SITES</p>
      <h3 id="companion-model-heading">Hamiltonian and basis</h3>
      <AtlasFormula latex={String.raw`H/J=-\left(b_1^\dagger b_2+b_2^\dagger b_1\right)+\frac{U}{2J}\sum_{i=1}^{2}n_i(n_i-1)`}/>
      <p>The Lab sets J=1 as the energy unit, fixes N from 2 to 8, and uses one open bond. The basis is |n,N−n⟩ for n=0…N. U/J can be set from 0 to 20. A fixed-N chemical-potential term would shift every level equally, so the implemented matrix omits it.</p>
      <div className="companion-model-grid">
        <div><h4>Computed and saved</h4><p>Energy levels and the gap in J; for a selected eigenstate, site occupations in bosons per site, number variances in bosons², and one-body coherence in bosons. Saved values are checked again when reopened.</p></div>
        <div><h4>Interpretation boundary</h4><p>The two-site crossover is finite and static. The scene positions are schematic. This job does not calculate an extended gas, a thermodynamic phase transition, a quench, fluorescence, or an Rb87-specific parameter conversion.</p></div>
      </div>
      <DimerEnergyFigure onOpenDimer={onOpenDimer} />
    </section>
    <BoseHubbardCompanion />
  </div>;
}
