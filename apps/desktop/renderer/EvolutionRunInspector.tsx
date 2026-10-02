import React from "react";
import { MODEL_REGISTRY } from "../../../packages/models";
import type { EvolutionRunContext } from "./evolution-selection";

const number = (value: number) => value.toFixed(4);

function ModelDiagnostics({ context }: { context: EvolutionRunContext }) {
  const {result, finalSample} = context;
  const {model} = result;
  if (model.type === "landau_zener") {
    const {sweepRate, gap} = model.parameters;
    return <div className="inspector-section" data-testid="evolution-inspector-diagnostics">
      <p className="eyebrow">SINGLE PASSAGE · STORED RUN</p>
      <div className="key-value"><span>Final P₀</span><strong>{number(finalSample.populations[0])}</strong></div>
      <div className="key-value"><span>Asymptotic P₀ reference</span><strong data-testid="inspector-lz-reference">{sweepRate !== 0 ? number(Math.exp(-Math.PI * gap ** 2 / (2 * Math.abs(sweepRate)))) : "Unavailable · zero sweep rate"}</strong></div>
      <small>The formula assumes infinite sweep limits; this recorded run has finite endpoints. It is not a fitted or exact finite-time probability.</small>
    </div>;
  }
  if (model.type === "stuckelberg") {
    const {sweepRate, turnTime, bias} = model.parameters;
    const root = sweepRate === 0 ? null : turnTime ** 2 - 2 * turnTime * bias / sweepRate;
    const crossings = root === null ? "Unavailable · zero crossing rate" : root < 0 ? "None in real time" : `±${Math.sqrt(root).toFixed(3)}`;
    return <div className="inspector-section" data-testid="evolution-inspector-diagnostics">
      <p className="eyebrow">DOUBLE PASSAGE · STORED RUN</p>
      <div className="key-value"><span>Final P₀</span><strong>{number(finalSample.populations[0])}</strong></div>
      <div className="key-value"><span>Real-time crossings t</span><strong data-testid="inspector-stuckelberg-crossings">{crossings}</strong></div>
      <small>Crossings are derived from the stored detuning model; they may fall outside the recorded time interval. The result does not store an independent interference phase.</small>
    </div>;
  }
  if (model.type === "strong_drive") {
    const analysis = result.analysis;
    return <div className="inspector-section" data-testid="evolution-inspector-diagnostics">
      <p className="eyebrow">FLOQUET · STORED ANALYSIS</p>
      {analysis?.kind === "floquet" ? <>
        <div className="key-value"><span>Period</span><strong>{number(analysis.period)}</strong></div>
        <div className="key-value"><span>Quasienergies ε₋ / ε₊</span><strong data-testid="inspector-quasienergies">{number(analysis.quasienergies[0])} / {number(analysis.quasienergies[1])}</strong></div>
        <div className="key-value"><span>Quasienergy gap</span><strong>{number(analysis.quasienergyGap)}</strong></div>
        <div className="key-value"><span>Bloch–Siegert estimate</span><strong>{analysis.blochSiegertEstimate === null ? "Unavailable" : number(analysis.blochSiegertEstimate)}</strong></div>
        <small>Stored one-period modes and the five-cycle resonance map remain in the Dynamics result. The Bloch–Siegert value is a weak-drive estimate, not a strong-drive measurement.</small>
      </> : <small>This saved result contains no Floquet analysis; no quasienergy or mode is inferred from its time series.</small>}
    </div>;
  }
  return null;
}

export function EvolutionRunInspector({ context, modelId }: { context: EvolutionRunContext | null; modelId: EvolutionRunContext["result"]["model"]["type"] }) {
  const safe = context?.result.model.type === modelId ? context : null;
  const result = safe?.result;
  const sample = safe?.sample;
  const testPrefix = modelId === "driven_two_level" ? "rabi-inspector" : "evolution-inspector";
  return <div className="evolution-inspector">
    <p className="eyebrow">{MODEL_REGISTRY[modelId].label.toUpperCase()} RUN INSPECTOR</p>
    <h2>Stored evolution</h2>
    {!safe || !result || !sample ? <p className="inspector-intro">Run {MODEL_REGISTRY[modelId].label} to inspect a saved result and its selected time sample.</p> : <>
      <p className="inspector-intro" data-testid={`${testPrefix}-state`}>
        {safe.stale ? "Edited draft · showing stored run" : "Run inputs match the draft"}
      </p>
      <div className="inspector-section" data-testid={`${testPrefix}-inputs`}>
        <p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <div className="key-value"><span>Run</span><code title={result.runId}>{result.runId.slice(0,18)}…</code></div>
        {Object.entries(result.model.parameters).map(([key, value]) =>
          <div className="key-value" key={key}><span>{key}</span><strong>{number(value)}</strong></div>)}
        <div className="key-value"><span>Initial state</span><strong>|{result.initialState.index}⟩</strong></div>
        <div className="key-value"><span>Time grid</span><strong>{number(result.solver.tStart)}–{number(result.solver.tStop)} · {result.data.rows}</strong></div>
        <div className="key-value"><span>Engine</span><strong>{result.engine.name} {result.engine.version}</strong></div>
      </div>
      <div className="inspector-section" data-testid={`${testPrefix}-sample`}>
        <p className="eyebrow">SELECTED SAMPLE · SAME RUN</p>
        <div className="key-value"><span>Sample</span><strong>{sample.index + 1} / {result.data.rows}</strong></div>
        <div className="key-value"><span>Time</span><strong data-testid={`${testPrefix}-time`}>{number(sample.time)}</strong></div>
        <div className="key-value"><span>P₀ / P₁</span><strong data-testid={`${testPrefix}-populations`}>{number(sample.populations[0])} / {number(sample.populations[1])}</strong></div>
        <div className="key-value"><span>⟨σx⟩ / ⟨σy⟩ / ⟨σz⟩</span><strong>{sample.bloch.map(number).join(" / ")}</strong></div>
        <div className="key-value"><span>Tr ρ / Tr ρ²</span><strong>{number(sample.trace)} / {number(sample.purity)}</strong></div>
      </div>
      <ModelDiagnostics context={safe}/>
      <div className="inspector-section provenance">
        <p className="eyebrow">SAVED PROVENANCE</p>
        <div className="key-value"><span>Runtime</span><strong>{result.provenance.durationMs.toFixed(2)} ms</strong></div>
        <div className="key-value"><span>Python</span><strong>{result.provenance.pythonVersion}</strong></div>
        <small>{new Date(result.provenance.computedAt).toLocaleString()} · SHA-256 {result.data.sha256.slice(0, 16)}…</small>
      </div>
    </>}
  </div>;
}
