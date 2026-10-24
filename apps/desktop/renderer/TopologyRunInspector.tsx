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
    {!result||!analysis?<p className="inspector-intro">Run SSH, QWZ, BHZ or BBH to inspect recorded diagnostics.</p>:<>
      <p className="inspector-intro" data-testid="topology-inspector-state">{context.stale?"Edited draft · showing stored run":"Run inputs match the draft"}</p>
      <div className="inspector-section" data-testid="topology-inspector-inputs">
        <p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <Value label="Run"><code title={result.runId}>{result.runId.slice(0,18)}…</code></Value>
        {Object.entries(result.model.parameters).map(([key,value])=><Value key={key} label={key}>{value}</Value>)}
        <Value label="Engine">{result.engine.name} {result.engine.version}</Value>
      </div>
      <div className="inspector-section" data-testid="topology-inspector-selection">
        <p className="eyebrow">EXACT-RUN SELECTION</p>
        {!sample?<small>{analysis.kind==="bbh"?"Select a finite cell to inspect its stored mean midgap density.":analysis.kind==="bhz_general"?"Select one of the four stored ribbon eigenstates below. Reopening does not invent a selection.":analysis.kind==="bhz"?"Open the verified BHZ scene to inspect exact bulk samples.":"Select a stored band point, edge site or curvature cell; reopening does not invent a selection."}</small>:sample.kind==="ssh_band"?<>
          <Value label="SSH band sample">{sample.index+1}</Value>
          <Value label="Stored k">{sample.k.toFixed(6)}</Value>
          <Value label="Lower band">{sample.lower.toFixed(6)}</Value>
          <Value label="Upper band">{sample.upper.toFixed(6)}</Value>
        </>:sample.kind==="ssh_site"?<>
          <Value label="Open-chain site">{sample.index+1}</Value>
          <Value label="Pair density"><span data-testid="topology-selected-value">{sample.density.toFixed(6)}</span></Value>
        </>:sample.kind==="bbh_cell"?<>
          <Value label="Finite cell">({sample.xIndex+1}, {sample.yIndex+1})</Value>
          <Value label="Mean midgap density"><span data-testid="topology-selected-value">{sample.density.toFixed(6)}</span></Value>
        </>:sample.kind==="bhz_ribbon_state"?<>
          <Value label="Ribbon eigenstate">{sample.index+1} at kₓ {sample.k.toFixed(6)}</Value>
          <Value label="Energy">{sample.energy.toFixed(6)}</Value>
          <Value label="Outer-edge weight"><span data-testid="topology-selected-value">{sample.edgeWeight.toFixed(6)}</span></Value>
          <Value label="Spin expectation">{sample.spin.map(v=>v.toFixed(4)).join(" / ")}</Value>
          <Value label="Cell densities">{sample.density.map(v=>v.toFixed(4)).join(" / ")}</Value>
          <details><summary>Complex amplitudes (E+, H+, E−, H− per cell)</summary><code>{sample.amplitudes.map(([re,im],i)=>`${i+1}: ${re.toFixed(5)} ${im<0?"−":"+"} ${Math.abs(im).toFixed(5)}i`).join(" · ")}</code></details>
        </>:<>
          <Value label="Mesh cell">kₓ {sample.xIndex}, kᵧ {sample.yIndex}</Value>
          <Value label="Berry curvature"><span data-testid="topology-selected-value">{sample.curvature.toFixed(6)}</span></Value>
          {sample.lower!==null&&sample.upper!==null?<><Value label="Stored lower band">{sample.lower.toFixed(6)}</Value><Value label="Stored upper band">{sample.upper.toFixed(6)}</Value></>:<small>Band energies were not stored for this legacy grid.</small>}
        </>}
        <small>{analysis.kind==="bhz_general"?"The selected bulk and ribbon eigenvectors below are stored in the immutable result; their complex phases are gauge-dependent.":"These results do not store generic eigenvectors or a selected quantum state."}</small>
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
        </>:analysis.kind==="bhz"?<>
          <Value label="Sampled gap">{analysis.sampledGap.toFixed(6)}</Value>
          <Value label="Momentum grid">{analysis.bandKValues.length} × {analysis.bandKValues.length}</Value>
          <Value label="Block Chern pair">{analysis.blockChern??"undefined"} / {analysis.partnerChern??"undefined"}</Value>
          <Value label="Mass-sign reference">{analysis.expectedBlockChern??"undefined"}</Value>
          <Value label="Spin-conserved Z₂">{analysis.z2??(analysis.gapClosed?"undefined":"unresolved")}</Value>
          <small>Four stored bulk bands; no eigenvectors or edge states. Gap is sampled except known exact closures.</small>
        </>:analysis.kind==="bbh"?<>
          <Value label="Periodic sampled gap">{analysis.bulkGap.toFixed(6)}</Value>
          <Value label="Bulk momentum grid">{analysis.bandKValues.length} × {analysis.bandKValues.length}</Value>
          <Value label="Open cells">{analysis.finite.cells} × {analysis.finite.cells}</Value>
          <Value label="Finite midgap energies">{analysis.finite.midgapEnergies.map(v=>v.toFixed(6)).join(" / ")}</Value>
          <Value label="Mean corner weight">{analysis.finite.cornerWeight.toFixed(6)}</Value>
          <small>Corner localization is a finite-system observation. No nested Wilson loop or quadrupole invariant was computed.</small>
        </>:analysis.kind==="bhz_general"?<>
          <Value label="Continuum/lattice grid">{analysis.latticeKValues.length} × {analysis.latticeKValues.length}</Value>
          <Value label="Indirect lattice energy gap">{(Math.min(...analysis.latticeBandEnergies[2])-Math.max(...analysis.latticeBandEnergies[1])).toFixed(6)}</Value>
          <Value label="Ribbon">{analysis.edge.kValues.length} momentum samples · {analysis.edge.states[0].density.length} cells</Value>
          <Value label="Fu–Kane TRIM parity">{analysis.paritySigns.join(" / ")}</Value>
          <Value label="Lattice Z₂">{analysis.z2??(analysis.gapClosed?"undefined at closure":"unresolved")}</Value>
          <Value label="Block Chern pair">{analysis.blockChern??"not defined with mixing"} / {analysis.partnerChern??"not defined with mixing"}</Value>
          <Value label="Bulk state momentum">{analysis.bulkStateK.map(v=>v.toFixed(4)).join(" / ")}</Value>
          <Value label="Bulk eigenstate energies">{analysis.bulkStates.map(s=>s.energy.toFixed(4)).join(" / ")}</Value>
          <Value label="Bulk spin ⟨sᶻ⟩">{analysis.bulkStates.map(s=>s.spin[2].toFixed(3)).join(" / ")}</Value>
          <Value label="Ribbon center energies">{analysis.edge.states.map(s=>s.energy.toFixed(4)).join(" / ")}</Value>
          <Value label="Ribbon edge weights">{analysis.edge.states.map(s=>s.edgeWeight.toFixed(3)).join(" / ")}</Value>
          <small>The Z₂ is a valence-band invariant checked against the direct gap; an indirect gap ≤ 0 does not establish an insulating Fermi level. Normalized complex eigenvector phases and spin expectations depend on the eigenbasis at degeneracies. No automatic helical-edge label is inferred from finite-ribbon weight.</small>
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
