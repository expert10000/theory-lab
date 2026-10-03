import type {QuantumResult,SpectrumResult,WorkspaceTab} from "../../../packages/contracts";
import type {WorkspaceModel} from "./workspace-navigation";
import type {ScientificSelection} from "./scientific-selection";
import type {EvolutionRunContext} from "./evolution-selection";
import type {CavityRunContext} from "./cavity-selection";
import type {LindbladRunContext} from "./lindblad-selection";
import type {CircuitRunContext} from "./circuit-selection";
import type {ManyBodyRunContext} from "./many-body-selection";
import type {SweepRunContext} from "./sweep-selection";
import type {TopologyRunContext} from "./topology-selection";
import type {OrbitalRunContext} from "./orbital-selection";
import type {OscillatorRunContext} from "./oscillator-selection";

export type SelectionCoordinate=
  | {kind:"energy";index:number}
  | {kind:"time";index:number}
  | {kind:"site";index:number}
  | {kind:"band";index:number}
  | {kind:"cell";xIndex:number;yIndex:number}
  | {kind:"radial";index:number}
  | {kind:"voxel";x:number;y:number;z:number}
  | {kind:"position";index:number};

/** A local view reference, not a new job/result wire schema or copied numerical data. */
export interface ScientificSelectionReference {
  schema:"scientific-selection/v1";
  runId:string;
  model:QuantumResult["model"]["type"];
  operation:QuantumResult["operation"];
  coordinate:SelectionCoordinate;
}

export interface SelectionSources {
  tab:WorkspaceTab;
  activeModel:WorkspaceModel;
  spectrum:{result:SpectrumResult|null;selection:ScientificSelection|null};
  evolution:EvolutionRunContext|null;
  cavity:CavityRunContext|null;
  lindblad:LindbladRunContext|null;
  circuit:CircuitRunContext|null;
  manyBody:ManyBodyRunContext|null;
  sweep:SweepRunContext|null;
  topology:TopologyRunContext|null;
  orbital:OrbitalRunContext|null;
  oscillator:OscillatorRunContext|null;
}

function reference(result:QuantumResult,runId:string,coordinate:SelectionCoordinate):ScientificSelectionReference|null{
  if(runId!==result.runId)return null;
  const indices=coordinate.kind==="cell"?[coordinate.xIndex,coordinate.yIndex]:
    coordinate.kind==="voxel"?[coordinate.x,coordinate.y,coordinate.z]:[coordinate.index];
  if(indices.some(index=>!Number.isInteger(index)||index<0))return null;
  return {schema:"scientific-selection/v1",runId:result.runId,model:result.model.type,
    operation:result.operation,coordinate};
}

/** Map only a currently resolved, exact-run selection from the active laboratory. */
export function activeSelectionReference(s:SelectionSources):ScientificSelectionReference|null{
  const {tab,activeModel}=s;
  if((tab==="spectrum"||tab==="hamiltonian")&&activeModel==="two_level"){
    const {result,selection}=s.spectrum;
    return result&&selection?.kind==="energy"&&selection.model==="two_level"&&selection.level<result.spectrum.eigenvalues.length?
      reference(result,selection.runId,{kind:"energy",index:selection.level}):null;
  }
  if(tab==="dynamics"&&s.evolution?.result.model.type===activeModel){
    const {result,selection,sample}=s.evolution;
    return selection.kind==="time_sample"&&selection.model===result.model.type&&sample.index===selection.index?
      reference(result,selection.runId,{kind:"time",index:selection.index}):null;
  }
  if(tab==="cavity"&&s.cavity?.result.model.type===activeModel){
    const {result,selection,sample}=s.cavity;
    return selection.kind==="time_sample"&&selection.model===result.model.type&&sample.index===selection.index?
      reference(result,selection.runId,{kind:"time",index:selection.index}):null;
  }
  if(tab==="open"&&activeModel==="lindblad"&&s.lindblad){
    const {result,selection,sample}=s.lindblad;
    return selection.kind==="time_sample"&&selection.model===result.model.type&&sample.index===selection.index?
      reference(result,selection.runId,{kind:"time",index:selection.index}):null;
  }
  if(tab==="circuit"&&activeModel==="transmon"&&s.circuit?.selection&&s.circuit.level){
    const {result,selection,level}=s.circuit;
    return selection.index===level.index?reference(result,selection.runId,{kind:"energy",index:selection.index}):null;
  }
  if(tab==="many_body"&&activeModel==="ising_chain"&&s.manyBody?.selection&&s.manyBody.item){
    const {result,selection,item}=s.manyBody;
    if(selection.kind!==item.kind||selection.index!==item.index)return null;
    return reference(result,selection.runId,{kind:selection.kind==="energy_level"?"energy":"site",index:selection.index});
  }
  if(tab==="sweep"&&activeModel!=="two_level"&&s.sweep?.result.model.type===activeModel&&s.sweep.selection&&s.sweep.cell){
    const {result,selection,cell}=s.sweep;
    return selection.xIndex===cell.xIndex&&selection.yIndex===cell.yIndex?
      reference(result,selection.runId,{kind:"cell",xIndex:selection.xIndex,yIndex:selection.yIndex}):null;
  }
  if(tab==="topology"&&activeModel==="topology"&&s.topology?.selection&&s.topology.sample){
    const {result,selection,sample}=s.topology;
    if(selection.kind!==sample.kind)return null;
    if(selection.kind==="qwz_cell"&&sample.kind==="qwz_cell")
      return selection.xIndex===sample.xIndex&&selection.yIndex===sample.yIndex?
        reference(result,selection.runId,{kind:"cell",xIndex:selection.xIndex,yIndex:selection.yIndex}):null;
    if("index" in selection&&"index" in sample&&selection.index===sample.index)
      return reference(result,selection.runId,{kind:selection.kind==="ssh_band"?"band":"site",index:selection.index});
    return null;
  }
  if(tab==="orbital"&&activeModel==="hydrogenic"&&s.orbital?.selection&&s.orbital.sample){
    const {result,selection,sample}=s.orbital;
    if(selection.kind!==sample.kind)return null;
    if(selection.kind==="radial"&&sample.kind==="radial"&&selection.index===sample.index)
      return reference(result,selection.runId,{kind:"radial",index:selection.index});
    if(selection.kind==="voxel"&&sample.kind==="voxel"&&selection.x===sample.x&&selection.y===sample.y&&selection.z===sample.z)
      return reference(result,selection.runId,{kind:"voxel",x:selection.x,y:selection.y,z:selection.z});
  }
  if(tab==="oscillator"&&activeModel==="oscillator"&&s.oscillator?.selection&&s.oscillator.item){
    const {result,selection,item}=s.oscillator;
    return selection.kind===item.kind&&selection.index===item.index?
      reference(result,selection.runId,{kind:selection.kind,index:selection.index}):null;
  }
  return null;
}
