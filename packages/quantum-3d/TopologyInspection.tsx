import React from "react";
import type {SceneTopology} from "../quantum-scene";

export function TopologyInspection({topology,arrays,selected,index,onSelect,unit}:{topology:SceneTopology;arrays:Map<string,Float64Array>;selected:string;index:number;onSelect:(id:string)=>void;unit:(id:string)=>string}) {
  const q=topology.quantities.find(q=>q.object===selected),values=q?arrays.get(q.dataset):undefined,vector=q&&["berry-connection","pseudospin"].includes(q.kind),sample=values?[...values.slice(index*(vector?3:1),(index+1)*(vector?3:1))]:[];
  return <div className="reciprocal-inspection" data-testid="topology-inspection"><h3>Supplied topology quantities</h3>
    {!!topology.quantities.length&&<label>Quantity<select aria-label="Topology quantity" value={q?.id??""} onChange={e=>onSelect(topology.quantities.find(q=>q.id===e.target.value)!.object)}><option value="" disabled>Choose a supplied quantity</option>{topology.quantities.map(q=><option key={q.id} value={q.id}>{q.label}</option>)}</select></label>}
    {q&&<p data-testid="topology-sample">{q.label} · sample {index}: ({sample.map(v=>v.toPrecision(7)).join(", ")}) {unit(q.dataset)} · {q.convention}</p>}
    {topology.invariants.map(i=><p key={i.id} data-testid="topology-invariant">{i.label}: {i.value??i.status} · reported {i.status} · {i.method}</p>)}
    <p>These are supplied quantities and reported worker states, not viewer-computed invariants. Imported provenance is not authenticated.</p>
    <ul>{topology.limitations.map((s,i)=><li key={i}>{s}</li>)}</ul>
  </div>;
}
