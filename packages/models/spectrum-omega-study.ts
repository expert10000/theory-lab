import type {SpectrumJob,SpectrumResult} from "../contracts";
import {assertSpectrumOmegaStudyPlan,isSpectrumOmegaStudyResult,type SpectrumOmegaStudyPlan,type SpectrumOmegaStudyPoint,type SpectrumOmegaStudyResult} from "../contracts/spectrum-omega-study";
import {consistentTwoLevelSpectrum} from "./two-level-spectrum";

export function spectrumOmegaStudyPlan(studyId:string,engine:SpectrumOmegaStudyPlan["engine"],delta:number,start:number,stop:number,points:number):SpectrumOmegaStudyPlan {
  const plan:SpectrumOmegaStudyPlan={schema:"quantum-spectrum-study/v2",studyId,engine,fixed:{delta},
    axis:{parameter:"omega",start,stop,points},output:"eigenvalues"};
  assertSpectrumOmegaStudyPlan(plan);return plan;
}
export function studyOmega(plan:SpectrumOmegaStudyPlan,index:number):number {
  if(!Number.isInteger(index)||index<0||index>=plan.axis.points)throw new Error("Study point out of range");
  return index===plan.axis.points-1?plan.axis.stop:
    plan.axis.start+(plan.axis.stop-plan.axis.start)*index/(plan.axis.points-1);
}
export function omegaStudyJob(plan:SpectrumOmegaStudyPlan,index:number):SpectrumJob {
  return {schema:"quantum-job/v1",jobId:`${plan.studyId}-${index}`,operation:"diagonalize",engine:plan.engine,
    model:{type:"two_level",parameters:{delta:plan.fixed.delta,omega:studyOmega(plan,index)}}};
}
export function omegaStudyPointMatchesPlan(plan:SpectrumOmegaStudyPlan,point:SpectrumOmegaStudyPoint):boolean {
  if(point.index<0||point.index>=plan.axis.points||point.omega!==studyOmega(plan,point.index))return false;
  const energy=Math.hypot(plan.fixed.delta,point.omega)/2;
  const tolerance=1e-8*Math.max(1,Math.abs(plan.fixed.delta),Math.abs(point.omega));
  return Math.abs(point.eigenvalues[0]+energy)<=tolerance&&
    Math.abs(point.eigenvalues[1]-energy)<=tolerance&&point.eigenvalues[0]<=point.eigenvalues[1];
}
function candidate(v:unknown):v is SpectrumResult {
  if(!v||typeof v!=="object"||Array.isArray(v))return false;
  const r=v as Partial<SpectrumResult>;
  return r.schema==="quantum-result/v1"&&r.operation==="diagonalize"&&r.status==="completed"&&
    typeof r.runId==="string"&&/^[A-Za-z0-9_-]{1,100}$/.test(r.runId)&&
    !!r.engine&&!!r.model&&!!r.spectrum&&Array.isArray(r.spectrum.eigenvalues)&&
    r.spectrum.eigenvalues.length===2&&r.spectrum.eigenvalues.every(value=>typeof value==="number"&&Number.isFinite(value));
}
export async function runSpectrumOmegaStudy(plan:SpectrumOmegaStudyPlan,run:(job:SpectrumJob)=>Promise<unknown>,
  onPoint:(point:SpectrumOmegaStudyPoint)=>void|Promise<void>=()=>{},signal?:AbortSignal,
  resumePoints:readonly SpectrumOmegaStudyPoint[]=[]):Promise<SpectrumOmegaStudyResult> {
  assertSpectrumOmegaStudyPlan(plan);
  if(resumePoints.length>plan.axis.points||resumePoints.some((point,index)=>point.index!==index||!omegaStudyPointMatchesPlan(plan,point)))
    throw new Error("Invalid Ω study resume prefix");
  const points:SpectrumOmegaStudyPoint[]=[...resumePoints];
  for(let index=points.length;index<plan.axis.points;index++){
    if(signal?.aborted)break;
    const job=omegaStudyJob(plan,index),result=await run(job);
    if(!candidate(result)||result.jobId!==job.jobId||result.engine.name!==job.engine||
      result.model.type!==job.model.type||result.model.parameters.delta!==job.model.parameters.delta||
      result.model.parameters.omega!==job.model.parameters.omega||
      !(()=>{try{return consistentTwoLevelSpectrum(job,result,true)}catch{return false}})())
      throw new Error(`Ω study point ${index} failed verified spectrum lineage`);
    const point:SpectrumOmegaStudyPoint={index,omega:studyOmega(plan,index),eigenvalues:result.spectrum.eigenvalues,runId:result.runId};
    points.push(point);await onPoint(point);
    if(index+1<plan.axis.points)await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  const result:SpectrumOmegaStudyResult={schema:"quantum-spectrum-study-result/v2",studyId:plan.studyId,plan,
    status:points.length===plan.axis.points?"completed":"cancelled",points,computedAt:new Date().toISOString()};
  if(!isSpectrumOmegaStudyResult(result))throw new Error("Invalid Ω study result");
  return result;
}
