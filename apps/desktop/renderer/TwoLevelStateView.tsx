import React from "react";
import type {SpectrumResult} from "../../../packages/contracts";
import {twoLevelStateView,type TwoLevelStateViewData} from "../../../packages/models/two-level-state-view";
import {format} from "./Spectrum";

const labels=["E₋","E₊"] as const;
const colors=["#79d9c1","#f2b36f"] as const;
const center=150,radius=99;

export function TwoLevelStateView({result,selectedLevel,onSelectLevel,stale=false}:{
  result:SpectrumResult|null;selectedLevel:0|1|null;
  onSelectLevel:(level:0|1)=>void;stale?:boolean;
}){
  const views=result?([twoLevelStateView(result,0),twoLevelStateView(result,1)] as const):null;
  const resolved=!!views&&!!views[0]&&!!views[1];
  const selected=selectedLevel===null?null:views?.[selectedLevel]??null;
  const position=(state:TwoLevelStateViewData)=>({x:center+radius*state.bloch.x,y:center-radius*state.bloch.z});
  return <section className="panel two-level-state-view" data-testid="two-level-state-view">
    <div className="panel-heading"><div><p className="eyebrow">LINKED VERIFIED STATE / QLAB-UI-5</p>
      <h2>One run, two antipodal states.</h2></div>
      {result&&<span className={`result-badge ${stale?"stale":""}`}>{stale?"SAVED RUN · DRAFT CHANGED":"VERIFIED RUN"}</span>}
    </div>
    {!result?<p className="state-view-unavailable" data-testid="state-view-unavailable">Run a two-level spectrum to inspect its state.</p>
      :!result.stateAnalysis?<p className="state-view-unavailable" data-testid="state-view-unavailable">This older saved run contains energies only. No eigenvector or Bloch point can be inferred.</p>
      :result.stateAnalysis.status==="degenerate"?<p className="state-view-unavailable" data-testid="state-view-unavailable">The gap is at or below the degeneracy threshold. Individual eigenvectors are basis-dependent; no unique Bloch point is displayed.</p>
      :!resolved?<p className="state-view-unavailable" data-testid="state-view-unavailable">State diagnostics failed independent consistency checks; visualization is unavailable.</p>
      :<>
        <p className="state-view-provenance">Computational basis |0⟩, |1⟩ · Δ = {format(result.model.parameters.delta)} · Ω = {format(result.model.parameters.omega)} · <code title={result.runId}>{result.runId}</code></p>
        <div className="state-view-run-hamiltonian" data-testid="state-view-run-matrix">
          <span>STORED-RUN HAMILTONIAN · |0⟩, |1⟩ BASIS</span>
          <div aria-label="Stored two-level Hamiltonian matrix">
            {[result.model.parameters.delta/2,result.model.parameters.omega/2,
              result.model.parameters.omega/2,-result.model.parameters.delta/2].map((value,index)=><code key={index}>{format(value)}</code>)}
          </div>
          <small>This matrix, spectrum and state come from the same immutable run; draft controls above may differ.</small>
        </div>
        <div className="state-view-layout">
          <svg className="bloch-sphere" viewBox="0 0 300 300" role="group" aria-label="Bloch x-z great circle for verified real eigenstates" data-testid="bloch-sphere">
            <circle cx={center} cy={center} r={radius} fill="#152a32" stroke="#55786f" strokeWidth="2"/>
            <line x1="35" y1={center} x2="265" y2={center} stroke="#4a6470" strokeDasharray="4 5"/>
            <line x1={center} y1="35" x2={center} y2="265" stroke="#4a6470" strokeDasharray="4 5"/>
            <circle cx={center} cy={center} r="4" fill="#c7d9d5"/>
            <text x="155" y="34" fill="#afcbc2" fontSize="12">|0⟩ · +z</text>
            <text x="155" y="283" fill="#afcbc2" fontSize="12">|1⟩ · −z</text>
            <text x="263" y="145" fill="#afcbc2" fontSize="12">+x</text>
            {views.map((state,index)=>{
              const level=index as 0|1,point=position(state!);
              return <g key={level} role="button" tabIndex={0}
                aria-label={`Select verified ${level===0?"lower":"upper"} Bloch state`}
                aria-pressed={selectedLevel===level} data-testid={`bloch-select-${level}`}
                data-bloch-x={state!.bloch.x} data-bloch-z={state!.bloch.z}
                onClick={()=>onSelectLevel(level)}
                onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelectLevel(level);}}}>
                <line x1={center} y1={center} x2={point.x} y2={point.y} stroke={colors[level]}
                  strokeWidth={selectedLevel===level?"3.5":"1.5"} opacity={selectedLevel===null||selectedLevel===level?1:.55}/>
                <line x1={center} y1={center} x2={point.x} y2={point.y} stroke="transparent" strokeWidth="18"/>
                <circle cx={point.x} cy={point.y} r="16" fill="transparent"/>
                <circle cx={point.x} cy={point.y} r={selectedLevel===level?"8":"6"} fill={colors[level]}
                  stroke={selectedLevel===level?"#fff":"none"} strokeWidth="2"/>
              </g>;
            })}
          </svg>
          <div className="state-view-readout">
            <p className="eyebrow">SELECT A VERIFIED EIGENSTATE</p>
            <div className="state-view-levels" aria-label="Select Bloch eigenstate">
              {([0,1] as const).map(level=><button type="button" key={level}
                aria-pressed={selectedLevel===level} onClick={()=>onSelectLevel(level)}>
                <span style={{color:colors[level]}}>{labels[level]}</span> · {format(views[level]!.energy)}</button>)}
            </div>
            {selected?<div className="state-view-details" data-testid="state-view-details" aria-live="polite">
              <p className="eyebrow">{labels[selected.level]} · VERIFIED RUN STATE</p>
              <p className="state-view-spinor">|ψ⟩ = {format(selected.amplitudes[0])}|0⟩ {selected.amplitudes[1]<0?"−":"+"} {format(Math.abs(selected.amplitudes[1]))}|1⟩</p>
              {([0,1] as const).map(basis=><div className="state-view-population" key={basis}>
                <span>P{basis} · |{basis}⟩</span><div className="state-view-bar"><span style={{width:`${Math.max(0,Math.min(100,selected.populations[basis]*100))}%`}}/></div>
                <strong>{format(selected.populations[basis])}</strong></div>)}
              <p className="state-view-bloch">⟨σx⟩ {format(selected.bloch.x)} · ⟨σy⟩ {format(selected.bloch.y)} · ⟨σz⟩ {format(selected.bloch.z)}</p>
              <small>‖Hψ − Eψ‖ = {selected.residualNorm.toExponential(2)} · ‖ψ‖² = 1</small>
            </div>:<p className="state-view-prompt" data-testid="state-view-prompt">Select E₋ or E₊ in the spectrum, inspector, or great circle to reveal coefficients and populations.</p>}
          </div>
        </div>
        <p className="state-view-convention">Only the two verified real eigenstates are selectable. The great circle is the y = 0 slice of the Bloch sphere, not a free-state editor. Display uses a real sign gauge (first significant coefficient positive); a global phase does not change populations or Bloch observables.</p>
      </>}
  </section>;
}
