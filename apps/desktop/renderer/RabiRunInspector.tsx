import React from "react";
import type { RabiRunContext } from "./rabi-selection";

const number = (value: number) => value.toFixed(4);

export function RabiRunInspector({ context }: { context: RabiRunContext | null }) {
  const result = context?.result;
  const sample = context?.sample;
  return <div className="rabi-inspector">
    <p className="eyebrow">RABI RUN INSPECTOR</p>
    <h2>Stored evolution</h2>
    {!context || !result || !sample ? <p className="inspector-intro">Run Rabi dynamics to inspect a saved result and its selected time sample.</p> : <>
      <p className="inspector-intro" data-testid="rabi-inspector-state">
        {context.stale ? "Edited draft · showing stored run" : "Run inputs match the draft"}
      </p>
      <div className="inspector-section" data-testid="rabi-inspector-inputs">
        <p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <div className="key-value"><span>Run</span><code title={result.runId}>{result.runId.slice(0,18)}…</code></div>
        {Object.entries(result.model.parameters).map(([key, value]) =>
          <div className="key-value" key={key}><span>{key}</span><strong>{number(value)}</strong></div>)}
        <div className="key-value"><span>Initial state</span><strong>|{result.initialState.index}⟩</strong></div>
        <div className="key-value"><span>Time grid</span><strong>{number(result.solver.tStart)}–{number(result.solver.tStop)} · {result.data.rows}</strong></div>
        <div className="key-value"><span>Engine</span><strong>{result.engine.name} {result.engine.version}</strong></div>
      </div>
      <div className="inspector-section" data-testid="rabi-inspector-sample">
        <p className="eyebrow">SELECTED SAMPLE · SAME RUN</p>
        <div className="key-value"><span>Sample</span><strong>{sample.index + 1} / {result.data.rows}</strong></div>
        <div className="key-value"><span>Time</span><strong data-testid="rabi-inspector-time">{number(sample.time)}</strong></div>
        <div className="key-value"><span>P₀ / P₁</span><strong data-testid="rabi-inspector-populations">{number(sample.populations[0])} / {number(sample.populations[1])}</strong></div>
        <div className="key-value"><span>⟨σx⟩ / ⟨σy⟩ / ⟨σz⟩</span><strong>{sample.bloch.map(number).join(" / ")}</strong></div>
        <div className="key-value"><span>Tr ρ / Tr ρ²</span><strong>{number(sample.trace)} / {number(sample.purity)}</strong></div>
      </div>
      <div className="inspector-section provenance">
        <p className="eyebrow">SAVED PROVENANCE</p>
        <div className="key-value"><span>Runtime</span><strong>{result.provenance.durationMs.toFixed(2)} ms</strong></div>
        <div className="key-value"><span>Python</span><strong>{result.provenance.pythonVersion}</strong></div>
        <small>{new Date(result.provenance.computedAt).toLocaleString()} · SHA-256 {result.data.sha256.slice(0, 16)}…</small>
      </div>
    </>}
  </div>;
}
