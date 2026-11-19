import React, { useEffect, useState } from "react";
import type { BoseHubbardResult, BoseHubbardRunSummary } from "../../../packages/contracts/bose-hubbard";
import { AtlasFormula } from "./AtlasFormula";
import { BoseHubbardCompanion } from "./BoseHubbardCompanion";
import { DimerSchematic } from "./DimerSchematic";

/** Theory view for the experimental finite dimer; numerical values require a verified saved run. */
export function BoseHubbardTheoryPage({ preferredRun, onOpenDimer, onOpenRuns, onOpenCompanion }: {
  preferredRun?: { runId: string; nonce: number } | null;
  onOpenDimer: (runId?: string) => void;
  onOpenRuns: () => void;
  onOpenCompanion: () => void;
}) {
  const [runs, setRuns] = useState<BoseHubbardRunSummary[]>([]);
  const [selected, setSelected] = useState<{ summary: BoseHubbardRunSummary; result: BoseHubbardResult } | null>(null);
  const [stateIndex, setStateIndex] = useState(0);
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void window.quantum.listBoseHubbardRuns().then(rows => { if (active) setRuns(rows); })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : String(error)); });
    return () => { active = false; };
  }, []);
  async function open(runId: string, requestedStateIndex = 0) {
    setOpening(true); setMessage(""); setSelected(null);
    try {
      const result = await window.quantum.getBoseHubbardRun(runId);
      const rows = await window.quantum.listBoseHubbardRuns();
      setRuns(rows);
      const summary = rows.find(row => row.runId === result.runId);
      if (!summary) throw new Error("Verified dimer run is missing from saved history");
      setSelected({ summary, result }); setStateIndex(requestedStateIndex);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setOpening(false); }
  }
  useEffect(() => {
    if (preferredRun?.runId) void open(preferredRun.runId);
  }, [preferredRun?.nonce]);
  const state = selected?.result.states[stateIndex];
  return <div className="companion-page" data-testid="dimer-theory-page">
    <section className="panel dimer-theory-hero">
      <div className="dimer-theory-hero-grid">
        <div className="dimer-theory-lead">
          <p className="eyebrow">BOSE–HUBBARD DIMER / THEORY GUIDE</p>
          <h2>One bond.<br /><span>Many-body behavior.</span></h2>
          <p>Two bosonic lattice modes share a fixed number of particles. Hopping competes with repulsive onsite interaction in a finite, static system.</p>
          <div className="dimer-facts" aria-label="Dimer model bounds"><span>2 sites</span><span>2 ≤ N ≤ 8</span><span>J = 1</span><span>0 ≤ U/J ≤ 20</span></div>
        </div>
        <DimerSchematic />
      </div>
      <p className="eyebrow dimer-formula-label">IMPLEMENTED HAMILTONIAN</p>
      <AtlasFormula latex={String.raw`H/J=-\left(b_1^\dagger b_2+b_2^\dagger b_1\right)+\frac{U}{2J}\sum_{i=1}^{2}n_i(n_i-1)`}/>
      <div className="theory-grid dimer-fact-grid">
        <div><h3>Basis & conventions</h3><p>Ordered Fock basis |n,N−n⟩, n=0…N. Two sites, one open bond, fixed 2 ≤ N ≤ 8. J=1 is the energy unit. A fixed-N chemical-potential term shifts all levels equally and is omitted.</p></div>
        <div><h3>Inputs in this lab</h3><ul><li>Particle number N: integer from 2 to 8</li><li>Repulsive interaction ratio U/J: 0 to 20</li></ul></div>
        <div><h3>Saved observables</h3><ul><li>Eigenenergies and the first gap in J</li><li>Selected eigenstate amplitudes in the ordered basis</li><li>Site occupation in bosons per site, number variance in bosons², and one-body coherence in bosons</li></ul></div>
        <div><h3>Interpretation boundary</h3><p>This two-site crossover is not a thermodynamic phase transition. The job has no quench, time of flight, fluorescence, detector model, or Rb87-specific parameter conversion. Scene site positions are schematic.</p></div>
      </div>
      <p>The diagonal matrix element Hₙₙ/J is (U/2J)[n(n−1)+(N−n)(N−n−1)]. Neighboring basis states couple with Hₙ,ₙ₊₁/J = −√[(n+1)(N−n)]. For N=2 and U=0, the ground energy is −2J.</p>
      <div className="dynamics-actions">
        <button type="button" className="run-button" data-testid="theory-open-dimer" onClick={() => onOpenDimer(selected?.result.runId)}>Open {selected?"this run":"runnable dimer"} in Atlas ↗</button>
        <button type="button" onClick={onOpenRuns}>View saved Runs ↗</button>
        <button type="button" onClick={onOpenCompanion}>Open Companion Library ↗</button>
      </div>
    </section>
    <section className="panel dimer-evidence-panel" data-testid="dimer-theory-runs">
      <p className="eyebrow">SAVED EVIDENCE / VERIFIED ON OPEN</p>
      <h3>Inspect a saved dimer</h3>
      <p>Selecting a run rechecks its saved result before any numerical values appear here. A changed source is withheld.</p>
      {runs.length === 0 ? <p>No verified dimer runs are listed. Run the dimer in Atlas to create one.</p> :
        <div className="dynamics-actions">{runs.map(run => <button key={run.runId} type="button" disabled={opening}
          data-testid="theory-saved-dimer" onClick={() => void open(run.runId)}>Open N={run.particles}, U/J={run.interactionRatio} · {run.computedAt}</button>)}</div>}
      {message && <p role="alert">{message}</p>}
      {selected && state && <div data-testid="dimer-theory-result">
        <p><strong>Verified run:</strong> <code>{selected.result.runId}</code> · result SHA-256 <code>{selected.summary.resultSha256}</code></p>
        <p>N={selected.result.model.parameters.particles}, U/J={selected.result.model.parameters.interactionRatio}. Eigenenergies ({selected.result.spectrum.energyUnits}): {selected.result.spectrum.energies.map(value => value.toFixed(6)).join(", ")}. First gap: {selected.result.spectrum.gap.toFixed(6)} {selected.result.spectrum.energyUnits}.</p>
        <label>Saved eigenstate <select aria-label="Theory dimer eigenstate" value={stateIndex} disabled={opening}
          onChange={event => void open(selected.result.runId, Number(event.target.value))}>
          {selected.result.states.map(item => <option key={item.index} value={item.index}>{item.index}</option>)}</select></label>
        <p>Energy: {selected.result.spectrum.energies[stateIndex].toFixed(6)} {selected.result.spectrum.energyUnits}. Basis amplitudes: {state.amplitudes.map(value => value.toFixed(6)).join(", ")}.</p>
        <p>Site occupations: {state.occupation.map(value => value.toFixed(6)).join(" / ")} {selected.result.units.occupation}. Number variance: {state.numberVariance.map(value => value.toFixed(6)).join(" / ")} {selected.result.units.numberVariance}.</p>
        <p>One-body coherence ⟨b†₁b₂⟩: {state.oneBodyCoherence.toFixed(6)} {selected.result.units.oneBodyCoherence}.</p>
      </div>}
    </section>
    <BoseHubbardCompanion />
  </div>;
}
