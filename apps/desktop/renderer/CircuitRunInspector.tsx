import React from "react";
import type { CircuitRunContext } from "./circuit-selection";

export function CircuitRunInspector({context}:{context:CircuitRunContext|null}){
  const result=context?.result,level=context?.level;
  return <div className="evolution-inspector circuit-inspector">
    <p className="eyebrow">TRANSMON RUN INSPECTOR</p><h2>Stored circuit spectrum</h2>
    {!context||!result?<p className="inspector-intro">Run the Transmon circuit to inspect its saved levels.</p>:<>
      <p className="inspector-intro" data-testid="circuit-inspector-state">{context.stale?"Edited draft · showing stored run":"Run inputs match the draft"}</p>
      <div className="inspector-section" data-testid="circuit-inspector-inputs">
        <p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <div className="key-value"><span>Run</span><code title={result.runId}>{result.runId.slice(0,18)}…</code></div>
        {Object.entries(result.model.parameters).map(([key,value])=><div className="key-value" key={key}><span>{key}</span><strong>{value}{key==="EJ"||key==="EC"?" GHz":""}</strong></div>)}
        <div className="key-value"><span>Charge basis</span><strong>{2*result.model.parameters.ncut+1} states</strong></div>
        <div className="key-value"><span>Engine</span><strong>{result.engine.name} {result.engine.version}</strong></div>
      </div>
      <div className="inspector-section" data-testid="circuit-inspector-level">
        <p className="eyebrow">EXACT-RUN ENERGY SELECTION</p>
        {level?<>
          <div className="key-value"><span>Level</span><strong>E{level.index}</strong></div>
          <div className="key-value"><span>Energy</span><strong data-testid="circuit-inspector-energy">{level.energyGHz.toFixed(6)} GHz</strong></div>
          <div className="key-value"><span>E−E₀</span><strong>{level.relativeGHz.toFixed(6)} GHz</strong></div>
        </>:<small>Select a stored level; reopening a run does not invent a selection.</small>}
      </div>
      <div className="inspector-section" data-testid="circuit-inspector-diagnostics">
        <p className="eyebrow">STORED TRANSITION & CUTOFF DIAGNOSTICS</p>
        <div className="key-value"><span>E₀₁ / E₁₂</span><strong>{result.spectrum.e01.toFixed(6)} / {result.spectrum.e12.toFixed(6)} GHz</strong></div>
        <div className="key-value"><span>Anharmonicity</span><strong>{result.spectrum.anharmonicity.toFixed(6)} GHz</strong></div>
        <div className="key-value"><span>|⟨0|n|1⟩|</span><strong>{result.spectrum.chargeMatrixElement01.toFixed(6)}</strong></div>
        <div className="key-value"><span>|ΔE₀₁| at ncut+2</span><strong data-testid="circuit-inspector-cutoff">{result.spectrum.cutoffDriftE01.toExponential(3)} GHz</strong></div>
        <small>Cutoff drift is a diagnostic, not a convergence proof.</small>
      </div>
      <div className="inspector-section provenance">
        <p className="eyebrow">SAVED PROVENANCE</p>
        <div className="key-value"><span>Runtime</span><strong>{result.provenance.durationMs.toFixed(2)} ms</strong></div>
        <div className="key-value"><span>Python</span><strong>{result.provenance.pythonVersion}</strong></div>
        <small>{new Date(result.provenance.computedAt).toLocaleString()} · hash-verified inline result</small>
      </div>
      <p className="inspector-intro">This result stores energies and scalar diagnostics, not eigenvectors or charge-basis amplitudes. A saved comparison partner is not inferred when reopening one run.</p>
    </>}
  </div>;
}
