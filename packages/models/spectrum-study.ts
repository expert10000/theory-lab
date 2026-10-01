import type {SpectrumJob,SpectrumResult} from "../contracts";
import {assertSpectrumStudyPlan,isSpectrumStudyResult,type SpectrumStudyPlan,type SpectrumStudyPoint,type SpectrumStudyResult} from "../contracts/spectrum-study";
import {consistentTwoLevelSpectrum} from "./two-level-spectrum";

export function spectrumStudyPlan(studyId:string,engine:SpectrumStudyPlan["engine"],omega:number,start:number,stop:number,points:number):SpectrumStudyPlan{
  const plan:SpectrumStudyPlan={schema:"quantum-spectrum-study/v1",studyId,engine,
    fixed:{omega},axis:{parameter:"delta",start,stop,points},output:"eigenvalues"};
  assertSpectrumStudyPlan(plan);
  return plan;
}
export function studyDelta(plan:SpectrumStudyPlan,index:number):number{
  if(!Number.isInteger(index)||index<0||index>=plan.axis.points)throw new Error("Study point out of range");
  return index===plan.axis.points-1?plan.axis.stop:
    plan.axis.start+(plan.axis.stop-plan.axis.start)*index/(plan.axis.points-1);
}
function spectrumCandidate(value:unknown):value is SpectrumResult{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const result=value as Partial<SpectrumResult>;
  return result.schema==="quantum-result/v1"&&result.operation==="diagonalize"&&
    result.status==="completed"&&typeof result.jobId==="string"&&
    typeof result.runId==="string"&&/^[A-Za-z0-9_-]{1,100}$/.test(result.runId)&&
    !!result.engine&&typeof result.engine.name==="string"&&!!result.model&&
    !!result.spectrum&&Array.isArray(result.spectrum.eigenvalues)&&result.spectrum.eigenvalues.length===2&&
    result.spectrum.eigenvalues.every(value=>typeof value==="number"&&Number.isFinite(value));
}
/** Compose existing verified, durable diagonalization jobs; cancellation occurs between points. */
export function studyPointMatchesPlan(plan:SpectrumStudyPlan,point:SpectrumStudyPoint):boolean{
  if(point.index<0||point.index>=plan.axis.points||point.delta!==studyDelta(plan,point.index))return false;
  const energy=Math.hypot(point.delta,plan.fixed.omega)/2;
  const tolerance=1e-8*Math.max(1,Math.abs(point.delta),Math.abs(plan.fixed.omega));
  return Math.abs(point.eigenvalues[0]+energy)<=tolerance&&
    Math.abs(point.eigenvalues[1]-energy)<=tolerance&&point.eigenvalues[0]<=point.eigenvalues[1];
}
export async function runSpectrumStudy(plan:SpectrumStudyPlan,
  run:(job:SpectrumJob)=>Promise<unknown>,onPoint:(point:SpectrumStudyPoint)=>void|Promise<void>=()=>{},
  signal?:AbortSignal,resumePoints:readonly SpectrumStudyPoint[]=[]):Promise<SpectrumStudyResult>{
  assertSpectrumStudyPlan(plan);
  if(resumePoints.length>plan.axis.points||resumePoints.some((point,index)=>point.index!==index||!studyPointMatchesPlan(plan,point)))
    throw new Error("Invalid spectrum study resume prefix");
  const points:SpectrumStudyPoint[]=[...resumePoints];
  for(let index=points.length;index<plan.axis.points;index++){
    if(signal?.aborted)break;
    const delta=studyDelta(plan,index);
    const job:SpectrumJob={schema:"quantum-job/v1",jobId:`${plan.studyId}-${index}`,operation:"diagonalize",
      engine:plan.engine,model:{type:"two_level",parameters:{delta,omega:plan.fixed.omega}}};
    const candidate=await run(job);
    if(!spectrumCandidate(candidate)||
      candidate.jobId!==job.jobId||candidate.engine.name!==job.engine||
      JSON.stringify(candidate.model)!==JSON.stringify(job.model)||
      !(()=>{try{return consistentTwoLevelSpectrum(job,candidate,true)}catch{return false}})())
      throw new Error(`Study point ${index} failed verified spectrum lineage`);
    const point:SpectrumStudyPoint={index,delta,eigenvalues:candidate.spectrum.eigenvalues,runId:candidate.runId};
    points.push(point);await onPoint(point);
    // Yield a UI task so a requested cancellation can stop before the next job.
    if(index+1<plan.axis.points)await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  const result:SpectrumStudyResult={schema:"quantum-spectrum-study-result/v1",studyId:plan.studyId,plan,
    status:points.length===plan.axis.points?"completed":"cancelled",points,computedAt:new Date().toISOString()};
  if(!isSpectrumStudyResult(result))throw new Error("Invalid spectrum study result");
  return result;
}
