import type { LindbladResult } from "../../../packages/contracts";

export interface LindbladTimeSelection {
  kind: "time_sample";
  model: "open_jaynes_cummings";
  runId: string;
  index: number;
}
export interface LindbladSample {
  index: number;
  time: number;
  pExcited: number;
  meanPhoton: number;
  purity: number;
  coherence: number;
  boundaryProbability: number;
  trace: number;
}
export interface LindbladDiagnostics {
  maxBoundary: number;
  maxTraceDrift: number;
  minPurity: number;
}
export interface LindbladRunContext {
  result: LindbladResult;
  selection: LindbladTimeSelection;
  sample: LindbladSample;
  diagnostics: LindbladDiagnostics;
  stale: boolean;
}
export function selectedLindbladSample(selection:LindbladTimeSelection|null,result:LindbladResult|null,data:Float64Array|null):LindbladSample|null {
  if(!selection||!result||!data||selection.kind!=="time_sample"||selection.model!==result.model.type||
    selection.runId!==result.runId||data.length!==result.data.rows*7||!Number.isInteger(selection.index)||
    selection.index<0||selection.index>=result.data.rows)return null;
  const values=data.subarray(selection.index*7,selection.index*7+7);
  if(values.length!==7||Array.from(values).some(value=>!Number.isFinite(value)))return null;
  return {index:selection.index,time:values[0],pExcited:values[1],meanPhoton:values[2],
    purity:values[3],coherence:values[4],boundaryProbability:values[5],trace:values[6]};
}
