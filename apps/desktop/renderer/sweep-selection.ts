import type { SweepResult } from "../../../packages/contracts";

export interface SweepGridSelection {
  kind:"grid_cell";
  runId:string;
  model:SweepResult["model"]["type"];
  xIndex:number;
  yIndex:number;
}
export interface SweepCell {
  xIndex:number;
  yIndex:number;
  xParameter:string;
  xValue:number;
  yParameter:string|null;
  yValue:number|null;
  finalP1:number;
}
export interface SweepRunContext {
  result:SweepResult;
  selection:SweepGridSelection|null;
  cell:SweepCell|null;
  range:{minimum:number;maximum:number};
  stale:boolean;
}
export function selectedSweepCell(selection:SweepGridSelection|null,result:SweepResult|null,values:Float64Array|null):SweepCell|null{
  if(!selection||!result||!values||selection.kind!=="grid_cell"||selection.runId!==result.runId||
    selection.model!==result.model.type||values.length!==result.data.shape.x*result.data.shape.y||
    result.data.shape.x!==result.sweep.x.points||result.data.shape.y!==(result.sweep.y?.points??1)||
    !Number.isInteger(selection.xIndex)||!Number.isInteger(selection.yIndex)||
    selection.xIndex<0||selection.xIndex>=result.data.shape.x||
    selection.yIndex<0||selection.yIndex>=result.data.shape.y)return null;
  const x=result.sweep.x,y=result.sweep.y;
  const finalP1=values[selection.yIndex*result.data.shape.x+selection.xIndex];
  const xValue=x.start+(x.stop-x.start)*selection.xIndex/(x.points-1);
  const yValue=y?y.start+(y.stop-y.start)*selection.yIndex/(y.points-1):null;
  if(!Number.isFinite(finalP1)||!Number.isFinite(xValue)||(yValue!==null&&!Number.isFinite(yValue)))return null;
  return {xIndex:selection.xIndex,yIndex:selection.yIndex,xParameter:x.parameter,xValue,
    yParameter:y?.parameter??null,yValue,finalP1};
}
