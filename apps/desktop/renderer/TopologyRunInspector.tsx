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
    {!result||!analysis?<p className="inspector-intro">Run a supplied lattice or continuum model to inspect recorded diagnostics.</p>:<>
      <p className="inspector-intro" data-testid="topology-inspector-state">{context.stale?"Edited draft · showing stored run":"Run inputs match the draft"}</p>
      <div className="inspector-section" data-testid="topology-inspector-inputs">
        <p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <Value label="Run"><code title={result.runId}>{result.runId.slice(0,18)}…</code></Value>
        {Object.entries(result.model.parameters).map(([key,value])=><Value key={key} label={key}>{value}</Value>)}
        <Value label="Engine">{result.engine.name} {result.engine.version}</Value>
      </div>
      <div className="inspector-section" data-testid="topology-inspector-selection">
        <p className="eyebrow">EXACT-RUN SELECTION</p>
        {!sample?<small>{analysis.kind==="hofstadter"?"Select a stored magnetic band or finite-strip sample; reopening does not invent a selection.":analysis.kind==="landau_continuum"?"Select a stored field and level; reopening does not invent a selection.":analysis.kind==="nodal_line_two_band"?"Select a stored loop sample; reopening does not invent a selection.":analysis.kind==="weyl_minimal"?"Select a stored sphere sample; reopening does not invent a selection.":analysis.kind==="kitaev_chain"?"Select a saved momentum sample or finite site; reopening does not invent a selection.":analysis.kind==="bbh"?"Select a finite cell to inspect its stored mean midgap density.":analysis.kind==="bhz_general"?"Select one of the four stored ribbon eigenstates below. Reopening does not invent a selection.":analysis.kind==="bhz"?"Open the verified BHZ scene to inspect exact bulk samples.":"Select a stored band point, edge site or curvature cell; reopening does not invent a selection."}</small>:sample.kind==="hofstadter_band_sample"?<><Value label="Band">{sample.band}</Value><Value label="Stored k">{sample.kx.toFixed(6)} / {sample.ky.toFixed(6)}</Value><Value label="Exact energy"><span data-testid="topology-selected-value">{sample.energy.toFixed(6)}</span></Value></>:sample.kind==="hofstadter_strip_sample"?<><Value label="Finite-strip sorted state">{sample.state}</Value><Value label="Stored ky">{sample.ky.toFixed(6)}</Value><Value label="Exact energy"><span data-testid="topology-selected-value">{sample.energy.toFixed(6)}</span></Value><Value label="Left / right two-site weight">{sample.leftWeight.toFixed(6)} / {sample.rightWeight.toFixed(6)}</Value></>:sample.kind==="landau_level_sample"?<>
          <Value label="Signed field B">{sample.field.toFixed(6)}</Value><Value label="Level n">{sample.level}</Value>
          <Value label="Exact stored energy"><span data-testid="topology-selected-value">{sample.energy.toFixed(6)}</span></Value>
          <Value label="Cyclotron frequency">{sample.frequency.toFixed(6)}</Value>
          <Value label="Coarse/fine error">{sample.coarseError.toExponential(3)} / {sample.fineError.toExponential(3)}</Value>
        </>:sample.kind==="nodal_loop_sample"?<>
          <Value label="Loop sample">{sample.index+1}</Value><Value label="Stored k">{sample.q.map(v=>v.toFixed(6)).join(" / ")}</Value>
          <Value label="Bands">{sample.lower.toFixed(6)} / {sample.upper.toFixed(6)}</Value>
        </>:sample.kind==="weyl_sphere_sample"?<>
          <Value label="Sphere sample">{sample.index+1}</Value><Value label="Stored q">{sample.q.map(v=>v.toFixed(6)).join(" / ")}</Value>
          <Value label="Bands">{sample.lower.toFixed(6)} / {sample.upper.toFixed(6)}</Value><Value label="Berry curvature">{sample.berry.map(v=>v.toFixed(6)).join(" / ")}</Value>
        </>:sample.kind==="kitaev_band"?<>
          <Value label="BdG momentum sample">{sample.index+1}</Value><Value label="Stored k">{sample.k.toFixed(6)}</Value>
          <Value label="Particle-hole bands">{sample.lower.toFixed(6)} / {sample.upper.toFixed(6)}</Value>
        </>:sample.kind==="kitaev_site"?<>
          <Value label="Finite site">{sample.index+1}</Value><Value label="Near-zero pair density"><span data-testid="topology-selected-value">{sample.density.toFixed(6)}</span></Value>
        </>:sample.kind==="ssh_band"?<>
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
        {analysis.kind!=="landau_continuum"&&analysis.kind!=="hofstadter"&&<Value label={analysis.kind==="nodal_line_two_band"?"Loop gap":analysis.kind==="weyl_minimal"?"Enclosing-sphere gap":"Bulk gap"}>{(analysis.kind==="nodal_line_two_band"?analysis.loopGap:analysis.kind==="weyl_minimal"?analysis.sphereGap:analysis.bulkGap).toFixed(6)}</Value>}
        {analysis.kind==="hofstadter"?<><Value label="Flux p/q">{analysis.flux}</Value><Value label="Magnetic bands">{analysis.bandIndices.length}</Value><Value label="k grid">{analysis.kxValues.length} × {analysis.kyValues.length}</Value><Value label="Extrema drift">{Math.max(...analysis.extremaDrift).toExponential(3)} {analysis.units.energy}</Value><Value label="Sampling check">{analysis.converged?"within target":"refine grid"}</Value>{analysis.chernGaps?.map(gap=><div key={gap.occupiedBands} data-testid="harper-chern-gap"><Value label={`Occupied ${gap.occupiedBands} · Chern`}>{gap.chern??"undefined"}</Value><Value label="Gap / status">{gap.fineGap.toFixed(6)} {analysis.units.energy} · {gap.status}</Value><Value label="Minimum link">{gap.minimumLink?.toFixed(6)??"undefined"}</Value></div>)}{analysis.strip&&<><Value label="Finite strip">{analysis.strip.cells} open x sites · {analysis.strip.kyValues.length} ky samples</Value><Value label="Boundary sites">{analysis.strip.edgeSites} per side</Value><Value label="Eigensolver residual">{analysis.strip.maxResidual.toExponential(3)}</Value><Value label="Norm error">{analysis.strip.maxNormError.toExponential(3)}</Value></>}<small>{analysis.chernGaps?"The invariant belongs to each gapped occupied subspace. A touching gap is undefined.":"This older run stores no Chern diagnostics."} The finite strip stores left/right boundary weights separately from periodic bulk Chern values; no filling or Hall response is supplied.</small></>:analysis.kind==="landau_continuum"?<><Value label="Field samples">{analysis.fieldValues.length}</Value><Value label="Levels">{analysis.levelIndices.length}</Value><Value label="Finite-difference check">{analysis.converged?"converged":"unresolved"}</Value><Value label="Maximum fine error">{Math.max(...analysis.fineMaxErrors).toExponential(3)} {analysis.units.energy}</Value><Value label="Units">ħ={analysis.units.hbar}; {analysis.units.field}; {analysis.units.energy}</Value><small>2D uniform-field continuum only. No filling, Hall conductivity, edge channel or plateau is calculated.</small></>:analysis.kind==="nodal_line_two_band"?<><Value label="Ring radius">{analysis.ringRadius?.toFixed(6)??"absent"}</Value><Value label="Berry phase">{analysis.berryPhase?.toFixed(6)??"undefined"}</Value><Value label="Winding">{analysis.winding??"undefined"}</Value><Value label="Minimum Wilson link">{analysis.minimumLink?.toFixed(6)??"undefined"}</Value><Value label="Mesh convergence">{analysis.convergenceError?.toExponential(3)??"undefined"}</Value><Value label="Status">{analysis.status}</Value><small>Continuum bulk only. No lattice boundary or drumhead states are supplied.</small></>:analysis.kind==="weyl_minimal"?<><Value label="Local chirality">{analysis.chirality}</Value><Value label="Occupied Chern">{analysis.lowerChern??"unresolved"}</Value><Value label="Enclosing flux">{analysis.flux.toFixed(6)}</Value><Value label="Minimum Wilson link">{analysis.minimumLink.toFixed(6)}</Value><Value label="Sphere mesh">{analysis.positions.length} samples / {analysis.triangles.length} faces</Value><small>Local linearization only; no lattice, arc or surface state is supplied.</small></>:analysis.kind==="ssh"?<>
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
        </>:analysis.kind==="kitaev_chain"?<>
          <Value label="Sampled gap">{analysis.sampledGap.toFixed(6)}</Value>
          <Value label="Bulk closure">{analysis.gapClosed?"yes":"no"}</Value>
          <Value label="Band samples">{analysis.kValues.length}</Value>
          {analysis.invariant?<div data-testid="kitaev-bulk-invariant">
            <Value label="Pfaffian signs at 0 / π">{analysis.invariant.pfaffianSigns.join(" / ")}</Value>
            <Value label="Bulk parity"><span data-testid="kitaev-parity">{analysis.invariant.parity??"undefined"}</span></Value>
            <Value label="Real-pairing winding"><span data-testid="kitaev-winding">{analysis.invariant.winding??"undefined"}</span></Value>
            <Value label="Invariant status">{analysis.invariant.status}</Value>
            <Value label="Largest mesh phase step">{analysis.invariant.maxPhaseStep===null?"undefined":analysis.invariant.maxPhaseStep.toFixed(6)} rad</Value>
            <small>{analysis.invariant.method}. The bulk gap and mesh conditions control whether a claim is made.</small>
          </div>:<small>This earlier saved run has no bulk invariant data.</small>}
          <Value label="Open sites">{analysis.finite.cells}</Value>
          <Value label="Finite pair energies">{analysis.finite.nearZeroEnergies.map(v=>v.toFixed(6)).join(" / ")}</Value>
          <Value label="Mean end-site weight">{analysis.finite.endWeight.toFixed(6)}</Value>
          <small>Finite-chain localization is a separate observation; no finite-state classification is inferred from it.</small>
        </>:analysis.kind==="bbh"?<>
          <Value label="Periodic sampled gap">{analysis.bulkGap.toFixed(6)}</Value>
          <Value label="Bulk momentum grid">{analysis.bandKValues.length} × {analysis.bandKValues.length}</Value>
          <Value label="Open cells">{analysis.finite.cells} × {analysis.finite.cells}</Value>
          <Value label="Finite midgap energies">{analysis.finite.midgapEnergies.map(v=>v.toFixed(6)).join(" / ")}</Value>
          <Value label="Mean corner weight">{analysis.finite.cornerWeight.toFixed(6)}</Value>
          {analysis.wilson?<div data-testid="bbh-wilson-diagnostics">
            <Value label="Exact periodic gap">{analysis.wilson.bulkGapExact.toFixed(6)}</Value>
            <Value label="Wannier gaps x / y">{analysis.wilson.wannierGapX.toFixed(6)} / {analysis.wilson.wannierGapY.toFixed(6)}</Value>
            <Value label="Occupied link minimum">{analysis.wilson.minOccupiedLinkSingular.toFixed(6)}</Value>
            <Value label="Nested x-sector polarizations">{analysis.wilson.nestedX.map(v=>v===null?"undefined":v.toFixed(6)).join(" / ")}</Value>
            <Value label="Nested y-sector polarizations">{analysis.wilson.nestedY.map(v=>v===null?"undefined":v.toFixed(6)).join(" / ")}</Value>
            <Value label="Quadrupole invariant"><span data-testid="bbh-quadrupole">{analysis.wilson.quadrupole??"undefined"}</span></Value>
            <Value label="Invariant status">{analysis.wilson.status}</Value>
          </div>:<small>This earlier saved run has no Wilson-loop arrays or quadrupole calculation.</small>}
          <small>Periodic nested Wilson loops diagnose the bulk. Corner localization is a separate finite-system observation; a gap closure leaves the invariant undefined.</small>
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
