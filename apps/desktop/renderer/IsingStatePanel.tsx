import React from "react";
import type {IsingStateArtifact} from "../../../packages/contracts/ising-state";

export function IsingStatePanel({state,selectedSite,onSelectSite}:{state:IsingStateArtifact;selectedSite:number|null;onSelectSite:(index:number)=>void}){
  return <section className="panel ising-state-panel" data-testid="ising-state-panel">
    <div className="panel-heading"><div><p className="eyebrow">QVIS-017 / VERIFIED MANY-BODY STATE</p>
      <h2>Finite-chain ground-state inspection</h2></div><span className="pill">{state.sites} SITES · {state.engine.toUpperCase()}</span></div>
    <p>Source run <code>{state.source.runId}</code> · result SHA-256 <code title={state.source.resultSha256}>{state.source.resultSha256.slice(0,16)}…</code></p>
    <p>Basis: site 1 is the most significant bit; 0 = σᶻ up. Ground E {state.groundEnergy.toFixed(8)} · gap {state.gap.toExponential(3)}.
      Norm {state.norm.toFixed(8)} · residual {state.residual.toExponential(2)} · degeneracy threshold {state.degeneracyThreshold.toExponential(2)}.</p>
    {state.status==="degenerate"?<p className="validation" data-testid="ising-state-degenerate">Ground energy is degenerate or near-degenerate at the declared threshold. A unique ground-state correlation matrix, cut entropy or basis distribution is unavailable.</p>:<>
      <div className="ising-state-grid">
        <div><p className="eyebrow">CONNECTED Cᶻᶻᵢⱼ · DIMENSIONLESS</p>
          <div className="ising-correlation-table" role="table" aria-label="Connected Pauli-z correlation matrix">
            <div role="row"><span role="columnheader">i / j</span>{Array.from({length:state.sites},(_,j)=><span role="columnheader" key={j}>{j+1}</span>)}</div>
            {state.connectedZCorrelation!.map((row,i)=><div role="row" key={i} className={selectedSite===i?"selected":""}>
              <span role="rowheader"><button type="button" aria-label={`Focus correlation row ${i+1}`} onClick={()=>onSelectSite(i)}>{i+1}</button></span>
              {row.map((value,j)=><span role="cell" key={j} title={`Czz(${i+1},${j+1}) = ${value.toPrecision(8)}`}>{value.toFixed(3)}</span>)}
            </div>)}
          </div><small>Ground-state pair expectation minus product of site means. Click a row to select the corresponding Ising site.</small></div>
        <div><p className="eyebrow">ENTANGLEMENT BY CONTIGUOUS CUT</p>
          {state.cutEntropy!.map((value,index)=><div className="ising-cut" key={index} data-testid={`ising-cut-${index+1}`}>
            <span>{index+1} | {state.sites-index-1}</span><meter min={0} max={Math.log(2)*Math.min(index+1,state.sites-index-1)} value={value}/><strong>{value.toFixed(5)}</strong></div>)}
          <small>Natural-log von Neumann entropy, not a thermodynamic limit.</small></div>
      </div>
      <div className="ising-basis"><p className="eyebrow">DOMINANT COMPUTATIONAL-BASIS PROBABILITIES</p>
        <div>{state.dominantBasis.map(entry=><div className="key-value" key={entry.bits}><code>|{entry.bits}⟩</code><strong>{entry.probability.toFixed(6)}</strong></div>)}</div>
        <small>Top {state.dominantBasis.length} of {2**state.sites} basis states; omitted probability {state.omittedProbability!.toExponential(3)}. Probabilities only: no amplitudes or full state vector are displayed.</small>
      </div>
    </>}
  </section>;
}
