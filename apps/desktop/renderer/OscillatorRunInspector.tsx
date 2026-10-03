import React from "react";
import type {OscillatorRunContext} from "./oscillator-selection";

function Row({label,children}:{label:string;children:React.ReactNode}){return <div className="key-value"><span>{label}</span><strong>{children}</strong></div>}
export function OscillatorRunInspector({context}:{context:OscillatorRunContext|null}){
  const result=context?.result,item=context?.item;
  return <div className="evolution-inspector oscillator-inspector"><p className="eyebrow">OSCILLATOR RUN INSPECTOR</p><h2>{result?result.operation.replaceAll("_"," "):"Stored oscillator result"}</h2>
    {!result?<p className="inspector-intro">Run an oscillator mode to inspect its recorded result.</p>:<>
      <p className="inspector-intro" data-testid="oscillator-inspector-state">{context.stale?"Edited draft · showing stored run":"Run inputs match the draft"}</p>
      <div className="inspector-section" data-testid="oscillator-inspector-inputs"><p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <Row label="Run"><code title={result.runId}>{result.runId.slice(0,18)}…</code></Row>
        <Row label="Operation">{result.operation}</Row>
        {Object.entries(result.model.parameters).map(([key,value])=><Row key={key} label={key}>{value}</Row>)}
        {"initialState" in result&&<Row label="Initial state">{JSON.stringify(result.initialState)}</Row>}
        {"solver" in result&&<Row label="Solver">{result.solver.type} · {result.solver.tStart} → {result.solver.tStop} · {result.solver.samples} samples</Row>}
        <Row label="Engine">{result.engine.name} {result.engine.version}</Row>
      </div>
      <div className="inspector-section" data-testid="oscillator-inspector-selection"><p className="eyebrow">EXACT-RUN SELECTION</p>
        {!item?<small>Select a stored energy, position or time row; reopening does not invent a state.</small>:
          item.kind==="energy"?<>
            <Row label="Level">{item.index}</Row><Row label="Energy"><span data-testid="oscillator-inspector-value">{item.energy.toFixed(6)}</span></Row>
            {item.coefficients?<><Row label="Stored Fock coefficients">{item.coefficients.map(v=>v.toFixed(4)).join(" / ")}</Row><small>These are finite-basis coefficients, not a stored spatial wavefunction.</small></>:
              <small>{item.spatialStateAvailable?"The static result stores this selected number state's sampled q amplitude and density.":"No spatial state was stored for this other energy level."}</small>}
          </>:item.kind==="position"?<>
            <Row label="q sample">{item.index+1}</Row><Row label="q">{item.q.toFixed(6)}</Row>
            <Row label="Amplitude">{item.amplitude.toFixed(6)}</Row><Row label="Density"><span data-testid="oscillator-inspector-value">{item.density.toFixed(6)}</span></Row>
          </>:<>
            <Row label="Time row">{item.index+1}</Row>
            {Object.entries(item.values).slice(0,12).map(([column,value])=><Row key={column} label={column}><span data-testid={`oscillator-inspector-${column}`}>{value.toFixed(6)}</span></Row>)}
            {Object.entries(item.values).length>12&&<details><summary>Show all {Object.entries(item.values).length} recorded columns</summary>
              {Object.entries(item.values).slice(12).map(([column,value])=><Row key={column} label={column}>{value.toFixed(6)}</Row>)}
            </details>}
            <small>Only columns in this saved artifact are reported. Damped runs record density-matrix elements; other modes have their own distinct schemas. No additional state is inferred.</small>
          </>}
      </div>
      <div className="inspector-section" data-testid="oscillator-inspector-diagnostics"><p className="eyebrow">STORED DIAGNOSTICS</p>
        {Object.entries(result.analysis).map(([key,value])=><Row key={key} label={key}>{typeof value==="number"?value.toExponential(5):String(value)}</Row>)}
        {"data" in result&&<Row label="Stored columns">{result.data.columns.length} named columns · {result.data.rows} rows</Row>}
        <small>Engine comparisons and cutoff studies, when requested, are separate saved runs and are not silently reattached.</small>
      </div>
      <div className="inspector-section provenance"><p className="eyebrow">SAVED PROVENANCE</p>
        <Row label="Runtime">{result.provenance.durationMs.toFixed(2)} ms</Row><Row label="Python">{result.provenance.pythonVersion}</Row>
        <small>{new Date(result.provenance.computedAt).toLocaleString()}{"data" in result?` · artifact SHA-256 ${result.data.sha256.slice(0,16)}…`:" · verified inline result"}</small>
      </div>
    </>}
  </div>;
}
