import React from "react";
import type { ManyBodyRunContext } from "./many-body-selection";

export function ManyBodyRunInspector({context}:{context:ManyBodyRunContext|null}){
  const result=context?.result,item=context?.item;
  return <div className="evolution-inspector many-body-inspector">
    <p className="eyebrow">ISING-CHAIN RUN INSPECTOR</p><h2>Stored finite-chain run</h2>
    {!context||!result?<p className="inspector-intro">Run the Ising chain to inspect saved energies and site magnetizations.</p>:<>
      <p className="inspector-intro" data-testid="many-body-inspector-state">{context.stale?"Edited draft · showing stored run":"Run inputs match the draft"}</p>
      <div className="inspector-section" data-testid="many-body-inspector-inputs">
        <p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <div className="key-value"><span>Run</span><code title={result.runId}>{result.runId.slice(0,18)}…</code></div>
        {Object.entries(result.model.parameters).map(([key,value])=><div className="key-value" key={key}><span>{key}</span><strong>{value}</strong></div>)}
        <div className="key-value"><span>Hilbert dimension</span><strong>{2**result.model.parameters.sites}</strong></div>
        <div className="key-value"><span>Engine</span><strong>{result.engine.name} {result.engine.version}</strong></div>
      </div>
      <div className="inspector-section" data-testid="many-body-inspector-selection">
        <p className="eyebrow">EXACT-RUN SCIENTIFIC SELECTION</p>
        {item?.kind==="energy_level"?<>
          <div className="key-value"><span>Level</span><strong>E{item.index}</strong></div>
          <div className="key-value"><span>Energy</span><strong data-testid="many-body-inspector-energy">{item.energy.toFixed(6)}</strong></div>
          <div className="key-value"><span>E−E₀</span><strong>{item.relativeEnergy.toFixed(6)}</strong></div>
        </>:item?.kind==="site_magnetization"?<>
          <div className="key-value"><span>Site</span><strong>{item.index+1}</strong></div>
          <div className="key-value"><span>⟨σᶻ⟩</span><strong data-testid="many-body-inspector-site">{item.magnetization.toFixed(4)}</strong></div>
        </>:<small>Select a stored level or site; reopening a run does not invent a selection.</small>}
      </div>
      <div className="inspector-section" data-testid="many-body-inspector-diagnostics">
        <p className="eyebrow">STORED GROUND-STATE SUMMARY</p>
        <div className="key-value"><span>Finite-size gap</span><strong data-testid="many-body-inspector-gap">{result.spectrum.gap.toFixed(6)}</strong></div>
        <div className="key-value"><span>Ground energy</span><strong>{result.spectrum.lowEnergies[0].toFixed(6)}</strong></div>
        <div className="key-value"><span>Half-chain entropy</span><strong data-testid="many-body-inspector-entropy">{result.groundState.halfChainEntropy.toFixed(6)}</strong></div>
        <small>Finite-chain values do not establish a thermodynamic phase transition.</small>
      </div>
      <div className="inspector-section provenance">
        <p className="eyebrow">SAVED PROVENANCE</p>
        <div className="key-value"><span>Runtime</span><strong>{result.provenance.durationMs.toFixed(2)} ms</strong></div>
        <div className="key-value"><span>Python</span><strong>{result.provenance.pythonVersion}</strong></div>
        <small>{new Date(result.provenance.computedAt).toLocaleString()} · hash-verified inline result</small>
      </div>
      <p className="inspector-intro">This result stores low energies and ground-state summaries, not a full ground-state vector or arbitrary excited-state observables. A saved comparison partner is not inferred.</p>
    </>}
  </div>;
}
