import type {TopologyResult} from "../../../packages/contracts";

export type TopologySelection=
  | {kind:"ssh_band";runId:string;index:number}
  | {kind:"ssh_site";runId:string;index:number}
  | {kind:"qwz_cell";runId:string;xIndex:number;yIndex:number};
export type TopologySample=
  | {kind:"ssh_band";index:number;k:number;lower:number;upper:number}
  | {kind:"ssh_site";index:number;density:number}
  | {kind:"qwz_cell";xIndex:number;yIndex:number;curvature:number;lower:number|null;upper:number|null};
export interface TopologyRunContext {
  result:TopologyResult;
  selection:TopologySelection|null;
  sample:TopologySample|null;
  stale:boolean;
}
export function selectedTopologySample(selection:TopologySelection|null,result:TopologyResult|null):TopologySample|null{
  if(!selection||!result||selection.runId!==result.runId)return null;
  const analysis=result.analysis;
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
  return null;
}
