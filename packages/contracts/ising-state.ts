import Ajv from "ajv";
import schema from "./schemas/quantum-ising-state.v1.json";

export interface IsingStateSource {runId:string;jobSha256:string;resultSha256:string}
export interface IsingStateArtifact {
  schema:"quantum-ising-state/v1";source:IsingStateSource;engine:"native"|"quspin";
  sites:number;basis:"z-up-is-0-msb-first";groundEnergy:number;gap:number;degeneracyThreshold:number;
  status:"resolved"|"degenerate";norm:number;residual:number;
  siteMagnetization:number[]|null;connectedZCorrelation:number[][]|null;cutEntropy:number[]|null;
  dominantBasis:{bits:string;probability:number}[];omittedProbability:number|null;
}
const validate=new Ajv({allErrors:true,strict:false}).compile(schema);
export function isIsingStateArtifact(value:unknown):value is IsingStateArtifact{
  if(!validate(value))return false;
  const state=value as unknown as IsingStateArtifact,n=state.sites;
  if(state.status==="degenerate")return state.siteMagnetization===null&&state.connectedZCorrelation===null&&
    state.cutEntropy===null&&state.dominantBasis.length===0&&state.omittedProbability===null;
  if(state.siteMagnetization?.length!==n||state.connectedZCorrelation?.length!==n||
    !state.connectedZCorrelation.every(row=>row.length===n)||state.cutEntropy?.length!==n-1||
    state.omittedProbability===null||state.dominantBasis.length<1||state.dominantBasis.length>Math.min(16,2**n))return false;
  if(state.dominantBasis.some((item,index)=>item.bits.length!==n||
    (index>0&&state.dominantBasis[index-1].probability<item.probability)))return false;
  const total=state.dominantBasis.reduce((sum,item)=>sum+item.probability,0)+state.omittedProbability;
  return Math.abs(total-1)<1e-7&&state.connectedZCorrelation.every((row,i)=>row.every((entry,j)=>
    Math.abs(entry-state.connectedZCorrelation![j][i])<1e-7&&
    (i!==j||Math.abs(entry-(1-state.siteMagnetization![i]**2))<1e-7)));
}
