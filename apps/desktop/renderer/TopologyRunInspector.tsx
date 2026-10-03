import React from "react";
import type {TopologyRunContext} from "./topology-selection";

function Value({label,children}:{label:string;children:React.ReactNode}){
  return <div className="key-value"><span>{label}</span><strong>{children}</strong></div>;
}
export function TopologyRunInspector({context}:{context:TopologyRunContext|null}){
  const result=context?.result,analysis=result?.analysis,sample=context?.sample;
  return <div className="evolution-inspector topology-inspector">
    <p className="eyebrow">{result?.model.type.toUpperCase()??"TOPOLOGY"} RUN INSPECTOR</p>
    <h2>Stored topology result</h2>
    {!result||!analysis?<p className="inspector-intro">Run SSH or QWZ to inspect recorded samples and diagnostics.</p>:<>
      <p className="inspector-intro" data-testid="topology-inspector-state">{context.stale?"Edited draft · showing stored run":"Run inputs match the draft"}</p>
      <div className="inspector-section" data-testid="topology-inspector-inputs">
        <p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <Value label="Run"><code title={result.runId}>{result.runId.slice(0,18)}…</code></Value>
        {Object.entries(result.model.parameters).map(([key,value])=><Value key={key} label={key}>{value}</Value>)}
        <Value label="Engine">{result.engine.name} {result.engine.version}</Value>
      </div>
      <div className="inspector-section" data-testid="topology-inspector-selection">
        <p className="eyebrow">EXACT-RUN SELECTION</p>
        {!sample?<small>Select a stored band point, edge site or curvature cell; reopening does not invent a selection.</small>:sample.kind==="ssh_band"?<>
          <Value label="SSH band sample">{sample.index+1}</Value>
          <Value label="Stored k">{sample.k.toFixed(6)}</Value>
          <Value label="Lower band">{sample.lower.toFixed(6)}</Value>
          <Value label="Upper band">{sample.upper.toFixed(6)}</Value>
        </>:sample.kind==="ssh_site"?<>
          <Value label="Open-chain site">{sample.index+1}</Value>
          <Value label="Pair density"><span data-testid="topology-selected-value">{sample.density.toFixed(6)}</span></Value>
        </>:<>
          <Value label="Mesh cell">kₓ {sample.xIndex}, kᵧ {sample.yIndex}</Value>
          <Value label="Berry curvature"><span data-testid="topology-selected-value">{sample.curvature.toFixed(6)}</span></Value>
          {sample.lower!==null&&sample.upper!==null?<><Value label="Stored lower band">{sample.lower.toFixed(6)}</Value><Value label="Stored upper band">{sample.upper.toFixed(6)}</Value></>:<small>Band energies were not stored for this legacy grid.</small>}
        </>}
        <small>These results do not store generic eigenvectors or a selected quantum state.</small>
      </div>
      <div className="inspector-section" data-testid="topology-inspector-diagnostics">
        <p className="eyebrow">STORED DIAGNOSTICS</p>
        <Value label="Bulk gap">{analysis.bulkGap.toFixed(6)}</Value>
        {analysis.kind==="ssh"?<>
          <Value label="Winding">{analysis.winding??"undefined at gap closure"}</Value>
          <Value label="Band samples">{analysis.kValues.length}</Value>
          <Value label="Edge pair energies">{analysis.edgeEnergies.map(value=>value.toFixed(6)).join(" / ")}</Value>
          <Value label="Exposed-site weight">{analysis.edgeWeight.toFixed(6)}</Value>
          <small>Open-chain edge diagnostics belong to the finite chain; winding belongs to the periodic bulk.</small>
        </>:<>
          <Value label="Sampled gap">{analysis.sampledGap.toFixed(6)}</Value>
          <Value label="Momentum grid">{result.model.type==="qwz"?`${result.model.parameters.grid} × ${result.model.parameters.grid}`:"—"}</Value>
          <Value label="Gap closed">{analysis.gapClosed?"yes":"no"}</Value>
          <Value label="Verified Chern">{analysis.chern??(analysis.gapClosed?"undefined at gap closure":"unresolved on this mesh")}</Value>
          <Value label="Raw lattice Chern">{analysis.latticeChern??"undefined"}</Value>
          <Value label="Mass-sign reference">{analysis.analyticChern??"undefined"}</Value>
          <Value label="Midpoint integral">{analysis.chernIntegral?.toFixed(6)??"undefined"}</Value>
          <small>{analysis.gapClosed?"No isolated lower-band Berry curvature or Chern invariant exists at this gap closure.":analysis.meshResolved?"This run's mesh passed its declared phase-resolution check; refine the grid to assess convergence.":"Momentum mesh unresolved: do not use this run as a phase label. Refine the saved source grid."}</small>
        </>}
      </div>
      <div className="inspector-section provenance" data-testid="topology-inspector-provenance">
        <p className="eyebrow">SAVED PROVENANCE</p>
        <Value label="Runtime">{result.provenance.durationMs.toFixed(2)} ms</Value>
        <Value label="Python">{result.provenance.pythonVersion}</Value>
        <Value label="Worker">{result.provenance.workerVersion}</Value>
        <small>{new Date(result.provenance.computedAt).toLocaleString()} · result {result.runId}</small>
      </div>
    </>}
  </div>;
}
