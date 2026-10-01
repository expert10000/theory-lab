import React,{useEffect,useState} from "react";
import {MODEL_REGISTRY} from "../../../packages/models";
import {CAVITY_REGISTRY} from "../../../packages/models/cavity";
import {MODEL_GROUPS,type WorkspaceModel} from "./workspace-navigation";

function label(model:WorkspaceModel):string{
  if(model in MODEL_REGISTRY)return MODEL_REGISTRY[model as keyof typeof MODEL_REGISTRY].label;
  if(model in CAVITY_REGISTRY)return CAVITY_REGISTRY[model as keyof typeof CAVITY_REGISTRY].label;
  const labels:Partial<Record<WorkspaceModel,string>>={lindblad:"Lindblad dynamics",ising_chain:"Ising chain",
    topology:"Topological bands",hydrogenic:"Atomic orbitals",oscillator:"Harmonic oscillator",transmon:"Transmon circuit"};
  return labels[model]??model;
}

export function ModelNavigator({activeModel,onSelect}:{activeModel:WorkspaceModel;onSelect:(model:WorkspaceModel)=>void}){
  const [expanded,setExpanded]=useState<ReadonlySet<string>>(()=>new Set(["two-level"]));
  useEffect(()=>{
    const group=MODEL_GROUPS.find(item=>item.models.includes(activeModel));
    if(group)setExpanded(current=>new Set([...current,group.id]));
  },[activeModel]);
  return <nav className="model-navigator" aria-label="Model families">
    {MODEL_GROUPS.map(group=><details key={group.id} data-model-group={group.id} open={expanded.has(group.id)}
      onToggle={event=>{const open=event.currentTarget.open;setExpanded(current=>{
        if(current.has(group.id)===open)return current;
        const next=new Set(current);if(open)next.add(group.id);else next.delete(group.id);return next;
      });}}>
      <summary>{group.label}<span>{group.models.length}</span></summary>
      <div className="model-group-items">{group.models.map(model=><button key={model} type="button"
        className="lab-selected" aria-pressed={activeModel===model}
        data-testid={model==="hydrogenic"?"open-orbitals":model==="oscillator"?"open-oscillator":undefined}
        onClick={()=>onSelect(model)}><span aria-hidden="true">{model==="two_level"||model==="transmon"?"◈":model==="ising_chain"?"⋈":model==="topology"?"◇":model==="hydrogenic"||model==="lindblad"?"◌":model==="jaynes_cummings"||model==="quantum_rabi"?"◉":"∿"}</span>
        {label(model)}<span className="live-dot" aria-hidden="true"/></button>)}</div>
    </details>)}
  </nav>;
}
