import React, { useEffect, useState } from "react";
import type { BoseHubbardResult, BoseHubbardRunSummary } from "../../../packages/contracts/bose-hubbard";
import { boseHubbardJob } from "../../../packages/models/bose-hubbard";
import { BoseHubbardCompanion } from "./BoseHubbardCompanion";

/** Bounded experimental pane; the Atlas entry remains reference-only. */
export function BoseHubbardLab({ ready, onViewScene, onOpenCompanion, preferredRun }: { ready: boolean; onViewScene?: (runId: string, stateIndex: number) => void; onOpenCompanion?:()=>void; preferredRun?: {runId?: string; nonce: number} | null }) {
  const [particles, setParticles] = useState("2");
  const [interaction, setInteraction] = useState("2");
  const [saved, setSaved] = useState<BoseHubbardRunSummary[]>([]);
  const [result, setResult] = useState<BoseHubbardResult | null>(null);
  const [stateIndex, setStateIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void window.quantum.listBoseHubbardRuns()
      .then(items => { if (active) setSaved(items); })
      .catch(cause => { if (active) setError(String(cause)); });
    return () => { active = false; };
  }, []);
  const n = Number(particles), ratio = Number(interaction);
  const valid = particles.trim() !== "" && interaction.trim() !== "" &&
    Number.isInteger(n) && n >= 2 && n <= 8 && Number.isFinite(ratio) && ratio >= 0 && ratio <= 20;
  async function run() {
    if (!valid || !ready || busy) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const output = await window.quantum.runBoseHubbard(boseHubbardJob(n, ratio, `bh-${crypto.randomUUID()}`));
      const verified = await window.quantum.getBoseHubbardRun(output.runId);
      setResult(verified); setStateIndex(0);
      setSaved(await window.quantum.listBoseHubbardRuns());
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  async function open(runId: string) {
    setBusy(true); setError(""); setResult(null);
    try {
      const verified = await window.quantum.getBoseHubbardRun(runId);
      setParticles(String(verified.model.parameters.particles));
      setInteraction(String(verified.model.parameters.interactionRatio));
      setResult(verified); setStateIndex(0);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (preferredRun?.runId) void open(preferredRun.runId);
  }, [preferredRun?.nonce]);
  const state = result?.states[stateIndex];
  const pinned = saved.find(item => item.runId === result?.runId);
  return <section className="atlas-binding" data-testid="bose-hubbard-lab">
    <p className="eyebrow">EXPERIMENTAL LAB / FIXED-N TWO-SITE DIMER</p>
    <h4>Compute a finite Bose–Hubbard system</h4>
    <p>H/J = −(b†₁b₂ + b†₂b₁) + (U/2J) Σᵢ nᵢ(nᵢ−1). Fixed N, open bond, J=1, basis |n,N−n⟩. The chemical-potential term is constant in this fixed-N sector and is omitted. This is a generic boson dimer motivated by Chapters III–IV, not a full Rb87 gas or a phase-transition calculation.</p>
    <p className="scope-note">Saved eigenstates can be inspected as verified two-site scenes. This panel does not promote the Atlas entry to a tested binding.</p>
    <div className="dynamics-actions"><button type="button" onClick={()=>document.getElementById("bose-hubbard-theory")?.scrollIntoView({behavior:"smooth"})}>Read dimer theory and Companion chapters ↓</button>
      {onOpenCompanion&&<button type="button" data-testid="dimer-open-companion" onClick={onOpenCompanion}>Open Companion in Library ↗</button>}</div>
    <div className="dynamics-actions">
      <label>Particles N <input aria-label="Dimer particles N" type="number" min="2" max="8" step="1" value={particles} onChange={event=>setParticles(event.target.value)}/></label>
      <label>U/J <input aria-label="Dimer interaction U over J" type="number" min="0" max="20" step="0.1" value={interaction} onChange={event=>setInteraction(event.target.value)}/></label>
      <button type="button" className="run-button" data-testid="run-bose-hubbard" disabled={!ready||!valid||busy} onClick={()=>void run()}>{busy?"Working…":"Run and save dimer"}</button>
    </div>
    {!ready&&<p className="scope-note">Native worker unavailable. Existing saved runs can still be reopened and checked.</p>}
    {error&&<p role="alert">{error}</p>}
    {result&&state&&<div data-testid="bose-hubbard-result">
      <p><strong>Verified run:</strong> {result.runId} · {result.provenance.computedAt}</p>
      <p><strong>Result SHA-256:</strong> <code>{pinned?.resultSha256 ?? "saved source unavailable"}</code></p>
      <p>Energy levels ({result.spectrum.energyUnits}): {result.spectrum.energies.map((energy,index)=><button key={index} type="button" aria-pressed={index===stateIndex} onClick={()=>setStateIndex(index)}>{index}: {energy.toFixed(6)}</button>)}</p>
      <p><strong>Selected eigenstate {state.index}:</strong> E = {result.spectrum.energies[stateIndex].toFixed(6)} J; gap E₁−E₀ = {result.spectrum.gap.toFixed(6)} J.</p>
      <p>Site occupations: {state.occupation.map(value=>value.toFixed(6)).join(" / ")} {result.units.occupation}; number variance: {state.numberVariance.map(value=>value.toFixed(6)).join(" / ")} {result.units.numberVariance}.</p>
      <p>⟨b†₁b₂⟩ = {state.oneBodyCoherence.toFixed(6)} {result.units.oneBodyCoherence}. Basis amplitudes: {state.amplitudes.map(value=>value.toFixed(5)).join(", ")}.</p>
      <button type="button" data-testid="view-bose-hubbard-scene" disabled={!pinned||busy} onClick={()=>onViewScene?.(result.runId,stateIndex)}>View selected state in Scenes ↗</button>
      <p className="scope-note">Values come from the saved eigenvector. A changed source is refused on reopen; the scene uses schematic site positions.</p>
    </div>}
    <h4>Saved dimer runs</h4>
    {saved.length===0?<p>No saved dimer runs yet.</p>:<div className="dynamics-actions">{saved.map(item=><button key={item.runId} type="button" disabled={busy} onClick={()=>void open(item.runId)}>
      Open N={item.particles}, U/J={item.interactionRatio} · {item.computedAt}
    </button>)}</div>}
    <BoseHubbardCompanion />
  </section>;
}
