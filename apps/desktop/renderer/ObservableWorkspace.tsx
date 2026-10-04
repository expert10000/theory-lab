import React from "react";
import type {ObservableWorkspaceView} from "./observable-workspace";

function valueLabel(value:number|null,unit:string):string{
  if(value===null)return "Unavailable";
  const number=Math.abs(value)>0&&Math.abs(value)<1e-4?value.toExponential(4):Number(value.toPrecision(6)).toString();
  return `${number} ${unit}`;
}

/** Compact, renderer-only projection. Existing model inspectors retain all detailed diagnostics. */
export function ObservableWorkspace({view}:{view:ObservableWorkspaceView|null}){
  if(!view)return null;
  return <section className="inspector-section observable-workspace" data-testid="observable-workspace">
    <p className="eyebrow">QVIS-016 / OBSERVABLE WORKSPACE</p>
    <small>Exact saved run · {view.engine} · {view.computedAt}</small>
    <div className="observable-card-list">
      {view.cards.map(item=><details className={`observable-card observable-${item.availability}`} key={item.id}
        data-testid={`observable-card-${item.id}`}>
        <summary className="observable-card-heading"><strong>{item.label}</strong><span>{valueLabel(item.value,item.unit)}</span></summary>
        <div className="observable-card-status">{item.availability}</div>
        <div className="key-value"><span>Operator</span><code>{item.operator}</code></div>
        <div className="key-value"><span>State / sample</span><span>{item.state}</span></div>
        <div className="key-value"><span>Basis</span><span>{item.basis}</span></div>
        <div className="key-value"><span>Source</span><span>{item.source}</span></div>
        <small>{item.diagnostic}</small>
      </details>)}
    </div>
  </section>;
}
