import React from "react";
import type {SpectrumResult} from "../../../packages/contracts";
import {format} from "./Spectrum";
import type {ScientificSelection} from "./scientific-selection";

export function ScientificSelectionPanel({selection,result,draft}:{selection:ScientificSelection;result:SpectrumResult|null;draft:Record<string,string>}){
  if(selection.kind==="energy"){
    if(!result||result.runId!==selection.runId)return null;
    const label=selection.level===1?"E₊":"E₋";
    return <section className="panel scientific-selection" data-testid="scientific-selection">
      <p className="eyebrow">SELECTED VERIFIED LEVEL / {result.runId}</p>
      <h2>{label} = {format(result.spectrum.eigenvalues[selection.level])}</h2>
      <p>This result contains eigenvalues, not eigenvectors. No eigenstate or Bloch state is inferred from energy alone.</p>
    </section>;
  }
  if(selection.kind==="parameter"){
    const symbol=selection.key==="omega"?"Ω":"Δ";
    return <section className="panel scientific-selection" data-testid="scientific-selection">
      <p className="eyebrow">SELECTED DRAFT PARAMETER</p><h2>{symbol} · {selection.key}</h2>
      <p>Draft value: <code>{draft[selection.key]}</code>{result&&<> · Last verified run: <code>{result.model.parameters[selection.key]}</code></>}. Editing the draft does not change a saved run.</p>
    </section>;
  }
  const x=selection.key==="sigma_x";
  return <section className="panel scientific-selection" data-testid="scientific-selection">
    <p className="eyebrow">SELECTED MODEL OPERATOR</p><h2>{x?"σx":"σz"} · Pauli matrix</h2>
    <div className="operator-matrix" aria-label={`${x?"Sigma x":"Sigma z"} matrix`}>
      {(x?[0,1,1,0]:[1,0,0,-1]).map((value,index)=><span key={index}>{value}</span>)}
    </div>
    <p>This is the exact operator definition, not an eigenvector reconstructed from the spectrum.</p>
  </section>;
}
