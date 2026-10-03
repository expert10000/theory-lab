import React from "react";
import { MODEL_REGISTRY, type EvolutionModelId } from "../../../packages/models";
import type { SweepAxis } from "../../../packages/contracts";
import type { SweepRunContext } from "./sweep-selection";

function Axis({name,axis}:{name:string;axis:SweepAxis}){
  return <div className="key-value"><span>{name} · {axis.parameter}</span><strong>{axis.start} → {axis.stop} · {axis.points} points</strong></div>;
}
export function SweepRunInspector({context,modelId}:{context:SweepRunContext|null;modelId:EvolutionModelId}){
  const safe=context?.result.model.type===modelId?context:null;
  const result=safe?.result,cell=safe?.cell;
  return <div className="evolution-inspector sweep-inspector">
    <p className="eyebrow">{MODEL_REGISTRY[modelId].label.toUpperCase()} SWEEP INSPECTOR</p>
    <h2>Stored final-population grid</h2>
    {!safe||!result?<p className="inspector-intro">Run a final-population sweep to inspect its recorded grid.</p>:<>
      <p className="inspector-intro" data-testid="sweep-inspector-state">{safe.stale?"Edited draft · showing stored run":"Run inputs match the draft"}</p>
      <div className="inspector-section" data-testid="sweep-inspector-inputs">
        <p className="eyebrow">IMMUTABLE RUN INPUTS</p>
        <div className="key-value"><span>Run</span><code title={result.runId}>{result.runId.slice(0,18)}…</code></div>
        {Object.entries(result.model.parameters).map(([key,value])=><div className="key-value" key={key}><span>{key}</span><strong>{value}</strong></div>)}
        <Axis name="X axis" axis={result.sweep.x}/>
        {result.sweep.y&&<Axis name="Y axis" axis={result.sweep.y}/>}
        <div className="key-value"><span>Grid</span><strong>{result.data.shape.x} × {result.data.shape.y} final P₁ cells</strong></div>
        <div className="key-value"><span>Time window</span><strong>{result.sweep.tStart} → {result.sweep.tStop}</strong></div>
        <div className="key-value"><span>Initial basis index</span><strong>{result.sweep.initialIndex}</strong></div>
        <div className="key-value"><span>Engine</span><strong>{result.engine.name} {result.engine.version}{result.engine.device?` · ${result.engine.device}`:""}</strong></div>
      </div>
      <div className="inspector-section" data-testid="sweep-inspector-cell">
        <p className="eyebrow">EXACT-RUN GRID SELECTION</p>
        {cell?<>
          <div className="key-value"><span>Point</span><strong>{cell.xIndex+1}{cell.yParameter?` / ${cell.yIndex+1}`:""}</strong></div>
          <div className="key-value"><span>{cell.xParameter}</span><strong data-testid="sweep-inspector-x">{cell.xValue.toFixed(4)}</strong></div>
          {cell.yParameter&&<div className="key-value"><span>{cell.yParameter}</span><strong data-testid="sweep-inspector-y">{cell.yValue?.toFixed(4)}</strong></div>}
          <div className="key-value"><span>Final P₁</span><strong data-testid="sweep-inspector-value">{cell.finalP1.toFixed(6)}</strong></div>
        </>:<small>Select a recorded point or cell; reopening a run does not invent a selection.</small>}
        <small>A sweep cell stores final P₁ at one parameter setting, not a time trajectory or state vector.</small>
      </div>
      <div className="inspector-section" data-testid="sweep-inspector-cache">
        <p className="eyebrow">GRID & CACHE DIAGNOSTICS</p>
        <div className="key-value"><span>Range</span><strong>{safe.range.minimum.toFixed(6)} – {safe.range.maximum.toFixed(6)}</strong></div>
        <div className="key-value"><span>Reused / computed</span><strong>{result.cache.reusedPoints} / {result.cache.computedPoints}</strong></div>
        <small>Resume key {result.cache.key.slice(0,16)}…</small>
      </div>
      <div className="inspector-section provenance">
        <p className="eyebrow">SAVED PROVENANCE</p>
        <div className="key-value"><span>Runtime</span><strong>{result.provenance.durationMs.toFixed(2)} ms</strong></div>
        <div className="key-value"><span>Python</span><strong>{result.provenance.pythonVersion}</strong></div>
        <small>{new Date(result.provenance.computedAt).toLocaleString()} · artifact SHA-256 {result.data.sha256.slice(0,16)}…</small>
      </div>
    </>}
  </div>;
}
