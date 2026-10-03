import React from "react";
import type {OrbitalRunContext} from "./orbital-selection";

function Row({label,children}:{label:string;children:React.ReactNode}){return <div className="key-value"><span>{label}</span><strong>{children}</strong></div>}
export function OrbitalRunInspector({context}:{context:OrbitalRunContext|null}){
  const result=context?.result,sample=context?.sample;
  return <div className="evolution-inspector orbital-inspector"><p className="eyebrow">HYDROGENIC ORBITAL INSPECTOR</p><h2>Stored field and radial samples</h2>
    {!result?<p className="inspector-intro">Compute an orbital to inspect its verified field.</p>:<>
      <p className="inspector-intro" data-testid="orbital-inspector-state">{context.stale?"Edited draft · showing stored run":"Run inputs match the draft"}</p>
      <div className="inspector-section" data-testid="orbital-inspector-inputs"><p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <Row label="Run"><code title={result.runId}>{result.runId.slice(0,18)}…</code></Row>
        {Object.entries(result.model.parameters).map(([key,value])=><Row key={key} label={key}>{value}</Row>)}
        <Row label="Engine">{result.engine.name} {result.engine.version}</Row>
        <Row label="Grid order">xyz · z fastest</Row>
      </div>
      <div className="inspector-section" data-testid="orbital-inspector-selection"><p className="eyebrow">EXACT-RUN SAMPLE</p>
        {!sample?<small>Select a stored radial point or field voxel; reopening does not invent a selection.</small>:sample.kind==="radial"?<>
          <Row label="Radial sample">{sample.index+1}</Row><Row label="Radius / a₀">{sample.radius.toFixed(6)}</Row>
          <Row label="r²|R|²"><span data-testid="orbital-inspector-value">{sample.probability.toFixed(6)}</span></Row>
          <small>Radial probability is not the three-dimensional density.</small>
        </>:<>
          <Row label="Voxel index">{sample.x}, {sample.y}, {sample.z}</Row>
          <Row label="Position / a₀">{sample.position.map(value=>value.toFixed(4)).join(", ")}</Row>
          <Row label="Re ψ">{sample.real.toExponential(6)}</Row><Row label="Im ψ">{sample.imaginary.toExponential(6)}</Row>
          <Row label="|ψ|²"><span data-testid="orbital-inspector-value">{sample.density.toExponential(6)}</span></Row>
          <small>Sampled complex amplitude from the verified finite Cartesian grid; no analytic off-grid value is inferred.</small>
        </>}
      </div>
      <div className="inspector-section" data-testid="orbital-inspector-diagnostics"><p className="eyebrow">STORED DIAGNOSTICS</p>
        <Row label="Energy / Hartree">{result.analysis.energyHartree.toFixed(6)}</Row>
        <Row label="Radial norm">{result.analysis.radialNormalization.toFixed(8)}</Row>
        <Row label="Cube integral">{result.analysis.gridProbability.toFixed(6)}</Row>
        <Row label="Mean radius / a₀">{result.analysis.meanRadius.toFixed(6)}</Row>
        <Row label="Radial nodes">{result.analysis.radialNodes?.map(value=>value.toFixed(6)).join(" / ")??"not recorded"}</Row>
        <small>The finite grid is not renormalized. Missing tails and discretization error remain.</small>
      </div>
      <div className="inspector-section provenance"><p className="eyebrow">SAVED PROVENANCE</p>
        <Row label="Runtime">{result.provenance.durationMs.toFixed(2)} ms</Row><Row label="Python">{result.provenance.pythonVersion}</Row>
        <small>{new Date(result.provenance.computedAt).toLocaleString()} · artifact SHA-256 {result.data.sha256.slice(0,16)}…</small>
      </div>
    </>}
  </div>;
}
