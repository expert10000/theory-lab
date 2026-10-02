import type {SpectrumJob,SpectrumResult} from "../contracts";
import {consistentTwoLevelSpectrum} from "./two-level-spectrum";

export type ComplexPair=readonly [number,number];
export type Spinor=readonly [ComplexPair,ComplexPair];
export interface BlochVector {x:number;y:number;z:number}

/** Pauli expectations for a normalized projective state, independent of global phase. */
export function blochFromSpinor([a,b]:Spinor):BlochVector|null{
  const [ar,ai]=a,[br,bi]=b;
  if(![ar,ai,br,bi].every(Number.isFinite))return null;
  const norm=ar*ar+ai*ai+br*br+bi*bi;
  if(!Number.isFinite(norm)||norm<=0)return null;
  return {x:2*(ar*br+ai*bi)/norm,y:2*(ar*bi-ai*br)/norm,
    z:(ar*ar+ai*ai-br*br-bi*bi)/norm};
}

export interface TwoLevelStateViewData {
  runId:string;
  level:0|1;
  energy:number;
  amplitudes:readonly [number,number];
  populations:readonly [number,number];
  bloch:BlochVector;
  residualNorm:number;
}

/** Project only a checked, resolved two-level result. Legacy and degenerate runs have no unique view. */
export function twoLevelStateView(result:SpectrumResult,level:0|1):TwoLevelStateViewData|null{
  if(result.stateAnalysis?.status!=="resolved")return null;
  const job:SpectrumJob={schema:"quantum-job/v1",jobId:result.jobId,operation:"diagonalize",
    engine:result.engine.name,model:result.model};
  try{if(!consistentTwoLevelSpectrum(job,result,true))return null;}
  catch{return null;}
  const state=result.stateAnalysis.states[level];
  const vector=blochFromSpinor([[state.amplitudes[0],0],[state.amplitudes[1],0]]);
  if(!vector)return null;
  const [a,b]=state.amplitudes;
  const sign=(Math.abs(a)>1e-12?a:b)<0?-1:1;
  return {runId:result.runId,level,energy:result.spectrum.eigenvalues[level],
    amplitudes:[sign*a,sign*b],populations:state.populations,bloch:vector,
    residualNorm:state.residualNorm};
}
