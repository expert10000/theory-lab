import React,{useEffect,useMemo,useState} from "react";
import type {QuantumBridge,QuantumJob,QuantumResult,RunComparisonPins,VerifiedSavedRun} from "../../../packages/contracts";
import {compareVerifiedRuns} from "../../../packages/models/run-comparison";
import {comparisonContext,type ComparisonDelta} from "../../../packages/models/run-comparison-context";

function flatten(value:unknown,prefix="",output:Record<string,string>={}):Record<string,string>{
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    for(const [key,child] of Object.entries(value))flatten(child,prefix?`${prefix}.${key}`:key,output);
  }else output[prefix]=typeof value==="string"?value:JSON.stringify(value);
  return output;
}
function inputs(job:QuantumJob){
  const {jobId,schema,...rest}=job;
  return flatten(rest);
}
function diagnostics(result:QuantumResult){
  const groups:Record<string,unknown>={};
  if("analysis" in result)groups.analysis=result.analysis;
  if("stateAnalysis" in result)groups.stateAnalysis=result.stateAnalysis;
  if("cache" in result)groups.cache=result.cache;
  if("steadyState" in result)groups.steadyState=result.steadyState;
  return flatten(groups);
}
const label=(value:string|undefined)=>value===undefined?"—":value.length>160?`${value.slice(0,157)}…`:value;
const short=(id:string|null)=>id?`${id.slice(0,22)}…`:"Not pinned";
const fmt=(value:number)=>Math.abs(value)<1e-4&&value!==0?value.toExponential(5):value.toFixed(6);
function DeltaLine({item}:{item:ComparisonDelta}){
  return <div className="comparison-context-line"><span>{item.label}</span><code>{fmt(item.a)} → {fmt(item.b)}</code>
    <strong>Δ {fmt(item.delta)} <small>{item.unit}</small></strong></div>;
}

export function RunComparisonPanel({bridge,onChangePins}:{bridge:QuantumBridge;onChangePins?:()=>void}){
  const [pins,setPins]=useState<RunComparisonPins|null>(null);
  const [a,setA]=useState<VerifiedSavedRun|null>(null),[b,setB]=useState<VerifiedSavedRun|null>(null);
  const [error,setError]=useState(""),[busy,setBusy]=useState(true);
  const [metricIndex,setMetricIndex]=useState(0),[sampleIndex,setSampleIndex]=useState(0);
  useEffect(()=>{
    let live=true;
    void (async()=>{
      try{
        const selected=await bridge.getRunComparisonPins();
        if(!live)return;
        setPins(selected);
        const loaded=await Promise.all([selected.a,selected.b].map(async id=>id?bridge.getVerifiedRun(id):null));
        if(!live)return;
        setA(loaded[0]);setB(loaded[1]);setError("");
      }catch(cause){if(live)setError(cause instanceof Error?cause.message:String(cause));}
      finally{if(live)setBusy(false);}
    })();
    return ()=>{live=false;};
  },[bridge]);
  const comparison=useMemo(()=>a&&b?compareVerifiedRuns(a,b):null,[a,b]);
  const context=useMemo(()=>a&&b&&comparison?comparisonContext(a,b,comparison):null,[a,b,comparison]);
  const metric=comparison?.observables[metricIndex]??null;
  const sample=metric?Math.min(sampleIndex,metric.a.length-1):0;
  const aInputs=a?inputs(a.job):{},bInputs=b?inputs(b.job):{};
  const keys=Array.from(new Set([...Object.keys(aInputs),...Object.keys(bInputs)])).sort();
  const aDiagnostics=a?diagnostics(a.result):{},bDiagnostics=b?diagnostics(b.result):{};
  const diagnosticKeys=Array.from(new Set([...Object.keys(aDiagnostics),...Object.keys(bDiagnostics)])).sort();
  return <section className="panel run-comparison" data-testid="run-comparison">
    <div className="comparison-head"><div><p className="eyebrow">QLAB-UI-6 / IMMUTABLE RUNS</p><h2>A/B analysis</h2>
      <p>Two verified saved runs. Pin IDs are durable; calculations, exports and worker jobs are unchanged.</p></div>
      {onChangePins&&<button type="button" className="text-button" onClick={onChangePins}>Change pins in Runs</button>}</div>
    <div className="comparison-pins"><div><span>A</span><code title={pins?.a??undefined} data-testid="comparison-pin-a">{short(pins?.a??null)}</code></div>
      <div><span>B</span><code title={pins?.b??undefined} data-testid="comparison-pin-b">{short(pins?.b??null)}</code></div></div>
    {busy?<p role="status">Verifying saved runs…</p>:error?<p className="error-message" role="alert">Pinned run unavailable or altered: {error}. The pin IDs were retained; no substitute run was selected.</p>:
      !pins?.a||!pins.b?<p role="status">Pin distinct A and B runs from Runs to enable analysis.</p>:
      !a||!b?<p role="status">Both pinned runs must be available and verified.</p>:
      <>
        <div className="comparison-provenance" data-testid="comparison-provenance">
          {[a,b].map((run,index)=><div key={run.result.runId}><h3>{index===0?"A":"B"} · {run.result.model.type.replaceAll("_"," ")}</h3>
            <code title={run.result.runId}>{run.result.runId}</code>
            <p>{run.result.operation} · {run.result.engine.name} {run.result.engine.version}</p>
            <small>{run.result.provenance.pythonVersion} Python · {run.result.provenance.workerVersion} worker · {new Date(run.result.provenance.computedAt).toLocaleString()} · {run.result.provenance.durationMs.toFixed(2)} ms</small>
            <small>{"data" in run.result?`Artifact SHA-256 ${run.result.data.sha256}`:"Verified inline result"}</small></div>)}
        </div>
        {context&&<details className="comparison-context" data-testid="comparison-context" open>
          <summary>QVIS-018 · Contextual A/B summary</summary>
          <p>Only exact, hash-verified saved runs are inspected. Δ = B − A. No job is run and no sample is interpolated.</p>
          <div className="comparison-context-grid">
            <div><h4>Changed model inputs</h4>
              {context.compatibleModel?(context.parameters.length?context.parameters.map(item=><DeltaLine key={item.label} item={item}/>):<p>No numerical model input changed.</p>):
                <p>Unavailable: different operation or model.</p>}</div>
            <div><h4>Stored gap / transition</h4>
              {context.gap?<DeltaLine item={context.gap}/>:<p>Unavailable: no compatible aligned stored gap.</p>}
              <h4>Backend and runtime</h4>
              <p>A: {context.backend.a} · B: {context.backend.b}</p>
              {context.runtime?<><DeltaLine item={context.runtime}/><small>Elapsed worker time is context, not a numerical accuracy measure.</small></>:
                <p>Runtime delta unavailable across incompatible runs.</p>}</div>
            <div><h4>Aligned recorded observables</h4>
              {context.observables.length?context.observables.map(item=><div className="comparison-context-line" key={item.name}>
                <span>{item.name}</span><code>max |Δ| {fmt(item.maxAbsDelta)}</code><strong>RMS {fmt(item.rmsDelta)} <small>{item.unit}</small></strong></div>):
                <p>Unavailable: model, units, or sample coordinates do not align.</p>}</div>
            <div><h4>Recorded numerical diagnostics</h4>
              {context.diagnostics.length?context.diagnostics.map(item=><DeltaLine key={item.label} item={item}/>):
                <p>No paired, declared numerical diagnostic is available.</p>}
              {!!context.withheld.length&&<details><summary>Why values are withheld ({context.withheld.length})</summary>
                <ul>{context.withheld.map(reason=><li key={reason}>{reason}</li>)}</ul></details>}</div>
          </div>
        </details>}
        <h3>Exact stored inputs</h3>
        <p>Changed inputs are highlighted; neither run is edited or rerun.</p>
        <div className="comparison-inputs" data-testid="comparison-inputs"><div className="comparison-row comparison-header"><span>Field</span><strong>A</strong><strong>B</strong></div>
          {keys.map(key=><div key={key} className={`comparison-row ${aInputs[key]===bInputs[key]?"":"comparison-changed"}`}>
            <span>{key}</span><code title={aInputs[key]}>{label(aInputs[key])}</code><code title={bInputs[key]}>{label(bInputs[key])}</code></div>)}</div>
        <h3>Saved numerical diagnostics</h3>
        <p>Recorded analysis and cache fields are shown side by side. Differences are highlighted; no diagnostic delta is assigned a unit unless a declared observable above defines one.</p>
        <div className="comparison-inputs" data-testid="comparison-diagnostics"><div className="comparison-row comparison-header"><span>Field</span><strong>A</strong><strong>B</strong></div>
          {diagnosticKeys.length?diagnosticKeys.map(key=><div key={key} className={`comparison-row ${aDiagnostics[key]===bDiagnostics[key]?"":"comparison-changed"}`}>
            <span>{key}</span><code title={aDiagnostics[key]}>{label(aDiagnostics[key])}</code><code title={bDiagnostics[key]}>{label(bDiagnostics[key])}</code></div>):
            <p>No separate analysis or cache block was stored for either run.</p>}
        </div>
        <div className="comparison-science" data-testid="comparison-science"><h3>Recorded observable alignment</h3>
          <p data-testid="comparison-status">{comparison?.status==="aligned"?"Aligned":"Metadata only"} · {comparison?.reason}</p>
          {metric&&<><label>Observable <select aria-label="Comparison observable" value={metricIndex} onChange={event=>{setMetricIndex(Number(event.target.value));setSampleIndex(0);}}>
            {comparison!.observables.map((entry,index)=><option key={`${entry.name}-${index}`} value={index}>{entry.name} · {entry.unit}</option>)}</select></label>
            <p>{metric.a.length} saved aligned samples · {metric.coordinate} · {metric.unit} · Δ = B − A, with no interpolation</p>
            <div className="comparison-summary"><div><span>Maximum |Δ|</span><strong data-testid="comparison-max-delta">{fmt(metric.maxAbsDelta)}</strong></div>
              <div><span>RMS Δ</span><strong>{fmt(metric.rmsDelta)}</strong></div></div>
            <label>Saved coordinate <input type="range" aria-label="Comparison sample cursor" min="0" max={metric.a.length-1} value={sample} onChange={event=>setSampleIndex(Number(event.target.value))}/></label>
            <div className="comparison-summary" data-testid="comparison-selected"><div><span>{metric.coordinate}</span><strong>{fmt(metric.positions[sample])}</strong></div>
              <div><span>A</span><strong>{fmt(metric.a[sample])}</strong></div><div><span>B</span><strong>{fmt(metric.b[sample])}</strong></div>
              <div><span>Δ (B − A)</span><strong data-testid="comparison-delta">{fmt(metric.b[sample]-metric.a[sample])}</strong></div></div>
          </>}
          {!!comparison?.withheld.length&&<details><summary>Withheld comparisons ({comparison.withheld.length})</summary><ul>{comparison.withheld.map(reason=><li key={reason}>{reason}</li>)}</ul></details>}
        </div>
      </>}
  </section>;
}
