import React from "react";
import type { LindbladRunContext } from "./lindblad-selection";

export function LindbladRunInspector({context}:{context:LindbladRunContext|null}){
  const result=context?.result,sample=context?.sample,diagnostics=context?.diagnostics;
  return <div className="evolution-inspector lindblad-inspector">
    <p className="eyebrow">LINDBLAD RUN INSPECTOR</p>
    <h2>Stored open-system run</h2>
    {!context||!result||!sample||!diagnostics?<p className="inspector-intro">Run Lindblad dynamics to inspect recorded observables.</p>:<>
      <p className="inspector-intro" data-testid="lindblad-inspector-state">{context.stale?"Edited draft · showing stored run":"Run inputs match the draft"}</p>
      <div className="inspector-section" data-testid="lindblad-inspector-inputs">
        <p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <div className="key-value"><span>Run</span><code title={result.runId}>{result.runId.slice(0,18)}…</code></div>
        {Object.entries(result.model.parameters).map(([key,value])=><div className="key-value" key={key}><span>{key}</span><strong>{value}</strong></div>)}
        <div className="key-value"><span>Initial qubit / photons</span><strong>{result.initialState.qubit} / {result.initialState.photons}</strong></div>
        <div className="key-value"><span>Time grid</span><strong>{result.solver.tStart.toFixed(4)}–{result.solver.tStop.toFixed(4)} · {result.data.rows}</strong></div>
        <div className="key-value"><span>Engine</span><strong>{result.engine.name} {result.engine.version}</strong></div>
      </div>
      <div className="inspector-section" data-testid="lindblad-inspector-sample">
        <p className="eyebrow">SELECTED SAMPLE · SAME RUN</p>
        <div className="key-value"><span>Sample</span><strong>{sample.index+1} / {result.data.rows}</strong></div>
        <div className="key-value"><span>Time</span><strong data-testid="lindblad-inspector-time">{sample.time.toFixed(4)}</strong></div>
        <div className="key-value"><span>P(e)</span><strong data-testid="lindblad-inspector-excited">{sample.pExcited.toFixed(5)}</strong></div>
        <div className="key-value"><span>⟨n⟩</span><strong data-testid="lindblad-inspector-photons">{sample.meanPhoton.toFixed(5)}</strong></div>
        <div className="key-value"><span>Purity</span><strong data-testid="lindblad-inspector-purity">{sample.purity.toFixed(5)}</strong></div>
        <div className="key-value"><span>|ρge|</span><strong data-testid="lindblad-inspector-coherence">{sample.coherence.toFixed(5)}</strong></div>
        <div className="key-value"><span>Boundary</span><strong data-testid="lindblad-inspector-boundary">{sample.boundaryProbability.toExponential(2)}</strong></div>
        <div className="key-value"><span>Trace</span><strong data-testid="lindblad-inspector-trace">{sample.trace.toFixed(5)}</strong></div>
      </div>
      <div className="inspector-section" data-testid="lindblad-inspector-diagnostics">
        <p className="eyebrow">RECORDED-ROW DIAGNOSTICS</p>
        <div className="key-value"><span>Min purity</span><strong data-testid="lindblad-inspector-min-purity">{diagnostics.minPurity.toFixed(6)}</strong></div>
        <div className="key-value"><span>Max trace drift</span><strong>{diagnostics.maxTraceDrift.toExponential(2)}</strong></div>
        <div className="key-value"><span>Max boundary</span><strong>{diagnostics.maxBoundary.toExponential(2)}</strong></div>
        <small>{diagnostics.maxBoundary>.02?"Boundary occupation exceeds 0.02; increase the stored Fock cutoff before trusting this result.":"Boundary occupation is below the displayed 0.02 cutoff warning threshold."}</small>
      </div>
      <div className="inspector-section" data-testid="lindblad-inspector-steady">
        <p className="eyebrow">STORED STEADY-STATE READOUT</p>
        {result.steadyState?<>
          <div className="key-value"><span>P(e) / ⟨n⟩</span><strong>{result.steadyState.pExcited.toFixed(5)} / {result.steadyState.meanPhoton.toFixed(5)}</strong></div>
          <div className="key-value"><span>Purity / |ρge|</span><strong>{result.steadyState.purity.toFixed(5)} / {result.steadyState.coherence.toFixed(5)}</strong></div>
          <div className="key-value"><span>Boundary / trace</span><strong>{result.steadyState.boundaryProbability.toExponential(2)} / {result.steadyState.trace.toFixed(5)}</strong></div>
        </>:<small>Not reported: the existing unique-steady-state check requires positive atom relaxation and cavity loss.</small>}
      </div>
      <div className="inspector-section provenance">
        <p className="eyebrow">SAVED PROVENANCE</p>
        <div className="key-value"><span>Runtime</span><strong>{result.provenance.durationMs.toFixed(2)} ms</strong></div>
        <div className="key-value"><span>Python</span><strong>{result.provenance.pythonVersion}</strong></div>
        <small>{new Date(result.provenance.computedAt).toLocaleString()} · SHA-256 {result.data.sha256.slice(0,16)}…</small>
      </div>
      <p className="inspector-intro">This artifact stores seven time-series columns and an optional steady-state readout, not a density matrix, state vector, or amplitudes.</p>
    </>}
  </div>;
}
