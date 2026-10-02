import React from "react";
import { CAVITY_REGISTRY } from "../../../packages/models/cavity";
import type { CavityRunContext } from "./cavity-selection";

export function CavityRunInspector({context,modelId}:{context:CavityRunContext|null;modelId:CavityRunContext["result"]["model"]["type"]}){
  const safe=context?.result.model.type===modelId?context:null;
  const result=safe?.result,sample=safe?.sample,diagnostics=safe?.diagnostics;
  return <div className="evolution-inspector cavity-inspector">
    <p className="eyebrow">{CAVITY_REGISTRY[modelId].label.toUpperCase()} RUN INSPECTOR</p>
    <h2>Stored cavity run</h2>
    {!safe||!result||!sample||!diagnostics?<p className="inspector-intro">Run {CAVITY_REGISTRY[modelId].label} to inspect recorded observables.</p>:<>
      <p className="inspector-intro" data-testid="cavity-inspector-state">{safe.stale?"Edited draft · showing stored run":"Run inputs match the draft"}</p>
      <div className="inspector-section" data-testid="cavity-inspector-inputs">
        <p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <div className="key-value"><span>Run</span><code title={result.runId}>{result.runId.slice(0,18)}…</code></div>
        {Object.entries(result.model.parameters).map(([key,value])=><div className="key-value" key={key}><span>{key}</span><strong>{value}</strong></div>)}
        <div className="key-value"><span>Initial qubit / photons</span><strong>{result.initialState.qubit} / {result.initialState.photons}</strong></div>
        <div className="key-value"><span>Time grid</span><strong>{result.solver.tStart.toFixed(4)}–{result.solver.tStop.toFixed(4)} · {result.data.rows}</strong></div>
        <div className="key-value"><span>Engine</span><strong>{result.engine.name} {result.engine.version}</strong></div>
      </div>
      <div className="inspector-section" data-testid="cavity-inspector-sample">
        <p className="eyebrow">SELECTED SAMPLE · SAME RUN</p>
        <div className="key-value"><span>Sample</span><strong>{sample.index+1} / {result.data.rows}</strong></div>
        <div className="key-value"><span>Time</span><strong data-testid="cavity-inspector-time">{sample.time.toFixed(4)}</strong></div>
        <div className="key-value"><span>P(e)</span><strong data-testid="cavity-inspector-excited">{sample.pExcited.toFixed(5)}</strong></div>
        <div className="key-value"><span>⟨n⟩</span><strong data-testid="cavity-inspector-photons">{sample.meanPhoton.toFixed(5)}</strong></div>
        <div className="key-value"><span>Boundary</span><strong data-testid="cavity-inspector-boundary">{sample.boundaryProbability.toExponential(2)}</strong></div>
        <div className="key-value"><span>Norm / parity</span><strong data-testid="cavity-inspector-norm-parity">{sample.norm.toFixed(5)} / {sample.parity.toFixed(5)}</strong></div>
      </div>
      <div className="inspector-section" data-testid="cavity-inspector-diagnostics">
        <p className="eyebrow">RECORDED-ROW DIAGNOSTICS</p>
        <div className="key-value"><span>Max boundary</span><strong data-testid="cavity-inspector-max-boundary">{diagnostics.maxBoundary.toExponential(3)}</strong></div>
        <div className="key-value"><span>Max norm drift</span><strong>{diagnostics.maxNormDrift.toExponential(3)}</strong></div>
        <div className="key-value"><span>Max parity drift</span><strong>{diagnostics.maxParityDrift.toExponential(3)}</strong></div>
        <small>{diagnostics.maxBoundary>0.02?"Boundary occupation exceeds 0.02; the stored Fock cutoff may affect this result.":"Boundary occupation is below the displayed 0.02 cutoff warning threshold."}</small>
        {modelId==="jaynes_cummings"&&<div className="inspector-section" data-testid="cavity-inspector-jc-reference">
          <p className="eyebrow">JAYNES–CUMMINGS REFERENCE</p>
          {result.initialState.qubit==="excited"&&result.initialState.photons===0?<>
            <div className="key-value"><span>Vacuum-Rabi max error</span><strong data-testid="cavity-inspector-jc-error">{diagnostics.maxReferenceError.toExponential(3)}</strong></div>
            <div className="key-value"><span>Dressed splitting</span><strong>{diagnostics.dressedSplitting.toFixed(4)}</strong></div>
          </>:<small>Vacuum-Rabi reference applies only to the stored |e,0⟩ initial state.</small>}
        </div>}
      </div>
      <div className="inspector-section provenance">
        <p className="eyebrow">SAVED PROVENANCE</p>
        <div className="key-value"><span>Runtime</span><strong>{result.provenance.durationMs.toFixed(2)} ms</strong></div>
        <div className="key-value"><span>Python</span><strong>{result.provenance.pythonVersion}</strong></div>
        <small>{new Date(result.provenance.computedAt).toLocaleString()} · SHA-256 {result.data.sha256.slice(0,16)}…</small>
      </div>
      <p className="inspector-intro">This artifact stores six time-series observables, not cavity state amplitudes or a Bloch vector.</p>
    </>}
  </div>;
}
