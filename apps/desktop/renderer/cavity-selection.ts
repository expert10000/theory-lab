import type { CavityResult } from "../../../packages/contracts";

export interface CavityTimeSelection {
  kind: "time_sample";
  model: CavityResult["model"]["type"];
  runId: string;
  index: number;
}
export interface CavitySample {
  index: number;
  time: number;
  pExcited: number;
  meanPhoton: number;
  boundaryProbability: number;
  norm: number;
  parity: number;
}
export interface CavityDiagnostics {
  maxBoundary: number;
  maxNormDrift: number;
  maxParityDrift: number;
  maxReferenceError: number;
  dressedSplitting: number;
}
export interface CavityRunContext {
  result: CavityResult;
  selection: CavityTimeSelection;
  sample: CavitySample;
  diagnostics: CavityDiagnostics;
  stale: boolean;
}
export function selectedCavitySample(selection:CavityTimeSelection|null,result:CavityResult|null,data:Float64Array|null):CavitySample|null {
  if(!selection||!result||!data||selection.kind!=="time_sample"||
    selection.model!==result.model.type||selection.runId!==result.runId||
    data.length!==result.data.rows*6||!Number.isInteger(selection.index)||
    selection.index<0||selection.index>=result.data.rows)return null;
  const values=data.subarray(selection.index*6,selection.index*6+6);
  if(values.length!==6||Array.from(values).some(value=>!Number.isFinite(value)))return null;
  return {index:selection.index,time:values[0],pExcited:values[1],meanPhoton:values[2],
    boundaryProbability:values[3],norm:values[4],parity:values[5]};
}
