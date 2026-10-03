import React from "react";
import type {QuantumResult} from "../../../packages/contracts";
import type {ScientificSelectionReference,SelectionCoordinate} from "./selection-reference";

function coordinateLabel(point:SelectionCoordinate):string{
  switch(point.kind){
    case "energy":return `Stored energy level ${point.index}`;
    case "time":return `Stored time row ${point.index}`;
    case "site":return `Stored site ${point.index+1}`;
    case "band":return `Stored band sample ${point.index}`;
    case "cell":return `Stored cell (${point.xIndex}, ${point.yIndex})`;
    case "radial":return `Stored radial bin ${point.index}`;
    case "voxel":return `Stored voxel (${point.x}, ${point.y}, ${point.z})`;
    case "position":return `Stored position sample ${point.index}`;
  }
}

function availability(ref:ScientificSelectionReference,result:QuantumResult):string{
  if(result.operation==="diagonalize"&&ref.coordinate.kind==="energy"){
    if(!result.stateAnalysis)return "This run stores energies but no eigenvectors; state and symmetry-sector views are unavailable.";
    if(result.stateAnalysis.status==="degenerate")return "A unique eigenstate is unavailable at this degeneracy; do not assign a state or sector.";
    return "Verified eigenstate observables appear below; no parity/symmetry sector was recorded.";
  }
  if(result.operation==="many_body")return ref.coordinate.kind==="site"?
    "This run stores site ⟨σᶻ⟩ only; ⟨σˣ⟩, ⟨σʸ⟩ and a full ground-state vector are unavailable.":
    "This run stores low energies, not selected excited-state vectors, symmetry sectors or their observables.";
  if(result.operation==="circuit")return "Energy levels are stored; charge-basis eigenvectors and parity sectors are unavailable.";
  if(result.operation==="sweep")return "This cell stores final P₁ only; no time trajectory or selected state is saved.";
  if(result.operation==="topology")return "Only the model-specific recorded band/site/cell quantities are available; generic eigenvectors are not stored.";
  if(result.operation==="orbital"&&ref.coordinate.kind==="radial")return "This radial bin has no direct 3D scene sample; Scenes opens the full-run field.";
  if(result.operation==="lindblad")return "The saved row contains density-derived observables, not the full density matrix.";
  if(result.operation==="cavity")return "The saved row contains population, photon, boundary and parity values, not a full state vector.";
  if(result.operation.startsWith("oscillator"))return "Only this operation's recorded columns or state samples are available; other wavefunctions are not inferred.";
  return "Selection follows the recorded run sample; unavailable state or sector data are not inferred.";
}

export function SelectionReferenceCard({reference,result}:{reference:ScientificSelectionReference|null;result:QuantumResult|null}){
  if(!reference||!result||reference.runId!==result.runId||reference.model!==result.model.type||
    reference.operation!==result.operation)return null;
  return <section className="inspector-section scientific-reference" data-testid="scientific-reference">
    <p className="eyebrow">QVIS-014 / EXACT-RUN SELECTION</p>
    <div className="key-value"><span>Selected</span><strong data-testid="scientific-reference-coordinate">{coordinateLabel(reference.coordinate)}</strong></div>
    <div className="key-value"><span>Source</span><code title={reference.runId} data-testid="scientific-reference-run">{reference.runId.slice(0,18)}…</code></div>
    <small data-testid="scientific-reference-availability">{availability(reference,result)}</small>
  </section>;
}
