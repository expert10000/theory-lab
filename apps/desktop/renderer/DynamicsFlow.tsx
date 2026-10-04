import React from "react";

/** Shared explanation only; numerical values remain model-specific verified rows. */
export function DynamicsFlow({initial,hamiltonian,recorded}:{initial:string;hamiltonian:string;recorded:string}){
  return <div className="dynamics-flow" aria-label="Dynamics scientific path">
    <div><small>1 · INITIAL STATE</small><strong>{initial}</strong></div><span aria-hidden="true">→</span>
    <div><small>2 · HAMILTONIAN</small><strong>{hamiltonian}</strong></div><span aria-hidden="true">→</span>
    <div><small>3 · EVOLUTION</small><strong>finite time grid</strong></div><span aria-hidden="true">→</span>
    <div><small>4 · RECORDED</small><strong>{recorded}</strong></div>
  </div>;
}
