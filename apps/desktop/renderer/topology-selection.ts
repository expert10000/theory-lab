import type {TopologyResult} from "../../../packages/contracts";

export type TopologySelection=
  | {kind:"ssh_band";runId:string;index:number}
  | {kind:"ssh_site";runId:string;index:number}
  | {kind:"qwz_cell";runId:string;xIndex:number;yIndex:number}
  | {kind:"bbh_cell";runId:string;index:number}
  | {kind:"kitaev_band";runId:string;index:number}
  | {kind:"kitaev_site";runId:string;index:number}
  | {kind:"weyl_sphere_sample";runId:string;index:number}
  | {kind:"nodal_loop_sample";runId:string;index:number}
  | {kind:"bhz_ribbon_state";runId:string;index:number};
export type TopologySample=
  | {kind:"ssh_band";index:number;k:number;lower:number;upper:number}
  | {kind:"ssh_site";index:number;density:number}
  | {kind:"qwz_cell";xIndex:number;yIndex:number;curvature:number;lower:number|null;upper:number|null}
  | {kind:"bbh_cell";index:number;xIndex:number;yIndex:number;density:number}
  | {kind:"kitaev_band";index:number;k:number;lower:number;upper:number}
  | {kind:"kitaev_site";index:number;density:number}
  | {kind:"weyl_sphere_sample";index:number;q:[number,number,number];lower:number;upper:number;berry:[number,number,number]}
  | {kind:"nodal_loop_sample";index:number;q:[number,number,number];lower:number;upper:number}
  | {kind:"bhz_ribbon_state";index:number;k:number;energy:number;edgeWeight:number;density:number[];spin:number[];amplitudes:[number,number][]};
export interface TopologyRunContext {
  result:TopologyResult;
  selection:TopologySelection|null;
  sample:TopologySample|null;
  stale:boolean;
}
export function selectedTopologySample(selection:TopologySelection|null,result:TopologyResult|null):TopologySample|null{
  if(!selection||!result||selection.runId!==result.runId)return null;
  const analysis=result.analysis;
  if(result.model.type==="nodal_line_two_band"&&analysis.kind==="nodal_line_two_band"&&selection.kind==="nodal_loop_sample"){
    const index=selection.index;
    if(!Number.isInteger(index)||index<0||index>=analysis.loopPositions.length)return null;
    return {kind:"nodal_loop_sample",index,q:analysis.loopPositions[index],lower:analysis.lowerBand[index],upper:analysis.upperBand[index]};
  }
  if(result.model.type==="weyl_minimal"&&analysis.kind==="weyl_minimal"&&selection.kind==="weyl_sphere_sample"){
    const index=selection.index;
    if(!Number.isInteger(index)||index<0||index>=analysis.positions.length)return null;
    return {kind:"weyl_sphere_sample",index,q:analysis.positions[index],lower:analysis.lowerBand[index],
      upper:analysis.upperBand[index],berry:analysis.berryCurvature[index]};
  }
  if(result.model.type==="kitaev_chain"&&analysis.kind==="kitaev_chain"){
    if(selection.kind==="kitaev_band"&&Number.isInteger(selection.index)&&selection.index>=0&&selection.index<analysis.kValues.length){
      const index=selection.index;
      return {kind:"kitaev_band",index,k:analysis.kValues[index],lower:analysis.lowerBand[index],upper:analysis.upperBand[index]};
    }
    if(selection.kind==="kitaev_site"&&Number.isInteger(selection.index)&&selection.index>=0&&selection.index<analysis.finite.siteDensity.length)
      return {kind:"kitaev_site",index:selection.index,density:analysis.finite.siteDensity[selection.index]};
  }
  if(result.model.type==="bbh"&&analysis.kind==="bbh"&&selection.kind==="bbh_cell"){
    const index=selection.index,c=analysis.finite.cells;
    if(!Number.isInteger(index)||index<0||index>=c*c)return null;
    return {kind:"bbh_cell",index,xIndex:Math.floor(index/c),yIndex:index%c,density:analysis.finite.midgapDensity[index]};
  }
  if(result.model.type==="ssh"&&analysis.kind==="ssh"){
    if(selection.kind==="ssh_band"&&Number.isInteger(selection.index)&&selection.index>=0&&selection.index<analysis.kValues.length){
      const k=analysis.kValues[selection.index],lower=analysis.lowerBand[selection.index],upper=analysis.upperBand[selection.index];
      return [k,lower,upper].every(Number.isFinite)?{kind:"ssh_band",index:selection.index,k,lower,upper}:null;
    }
    if(selection.kind==="ssh_site"&&Number.isInteger(selection.index)&&selection.index>=0&&selection.index<analysis.edgeDensity.length){
      const density=analysis.edgeDensity[selection.index];
      return Number.isFinite(density)?{kind:"ssh_site",index:selection.index,density}:null;
    }
  }
  if(result.model.type==="qwz"&&analysis.kind==="qwz"&&selection.kind==="qwz_cell"&&!analysis.gapClosed){
    const grid=result.model.parameters.grid,{xIndex,yIndex}=selection,index=xIndex*grid+yIndex;
    if(!Number.isInteger(xIndex)||!Number.isInteger(yIndex)||xIndex<0||xIndex>=grid||yIndex<0||yIndex>=grid||analysis.berryCurvature.length!==grid*grid)return null;
    const curvature=analysis.berryCurvature[index];
    const lower=analysis.lowerBand?.[index]??null,upper=analysis.upperBand?.[index]??null;
    return Number.isFinite(curvature)&&(lower===null||Number.isFinite(lower))&&(upper===null||Number.isFinite(upper))?
      {kind:"qwz_cell",xIndex,yIndex,curvature,lower,upper}:null;
  }
  if(result.model.type==="bhz_general"&&analysis.kind==="bhz_general"&&selection.kind==="bhz_ribbon_state"){
    const index=selection.index,state=analysis.edge.states[index];
    if(!Number.isInteger(index)||index<0||index>=analysis.edge.states.length||!state)return null;
    return {kind:"bhz_ribbon_state",index,k:analysis.edge.kValues[analysis.edge.selectedKIndex],
      energy:state.energy,edgeWeight:state.edgeWeight,density:state.density,spin:state.spin,amplitudes:state.amplitudes};
  }
  return null;
}
