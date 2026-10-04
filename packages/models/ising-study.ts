import type {ManyBodyJob,ManyBodyResult} from "../contracts";
import {assertIsingStudyPlan,isIsingStudyResult,type IsingStudyPlan,type IsingStudyPoint,type IsingStudyResult} from "../contracts/ising-study";

export function isingStudyPlan(studyId:string,engine:IsingStudyPlan["engine"],fixed:IsingStudyPlan["fixed"],start:number,stop:number,points:number):IsingStudyPlan {
  const plan:IsingStudyPlan={schema:"quantum-ising-study/v1",studyId,engine,fixed,
    axis:{parameter:"transverse_over_interaction",start,stop,points},output:"low_energies_gap_magnetization_entropy"};
  assertIsingStudyPlan(plan);return plan;
}
export function isingStudyRatio(plan:IsingStudyPlan,index:number):number {
  if(!Number.isInteger(index)||index<0||index>=plan.axis.points)throw new Error("Ising study point out of range");
  return index===plan.axis.points-1?plan.axis.stop:
    plan.axis.start+(plan.axis.stop-plan.axis.start)*index/(plan.axis.points-1);
}
export function isingStudyJob(plan:IsingStudyPlan,index:number):ManyBodyJob {
  const ratio=isingStudyRatio(plan,index);
  return {schema:"quantum-job/v1",jobId:`${plan.studyId}-${index}`,operation:"many_body",engine:plan.engine,
    model:{type:"ising_chain",parameters:{...plan.fixed,transverse:ratio*plan.fixed.interaction}}};
}
export function isingStudyPointMatchesPlan(plan:IsingStudyPlan,point:IsingStudyPoint):boolean {
  return point.index>=0&&point.index<plan.axis.points&&point.ratio===isingStudyRatio(plan,point.index)&&
    point.lowEnergies.every((energy,index)=>index===0||energy>=point.lowEnergies[index-1]-1e-8)&&
    Math.abs(point.gap-(point.lowEnergies[1]-point.lowEnergies[0]))<=1e-7*Math.max(1,Math.abs(point.gap));
}
function candidate(v:unknown):v is ManyBodyResult {
  if(!v||typeof v!=="object"||Array.isArray(v))return false;
  const r=v as Partial<ManyBodyResult>;
  return r.schema==="quantum-result/v1"&&r.operation==="many_body"&&r.status==="completed"&&
    typeof r.runId==="string"&&/^[A-Za-z0-9_-]{1,100}$/.test(r.runId)&&
    !!r.model&&!!r.engine&&!!r.spectrum&&!!r.groundState&&
    Array.isArray(r.spectrum.lowEnergies)&&Array.isArray(r.groundState.siteMagnetization);
}
export async function runIsingStudy(plan:IsingStudyPlan,run:(job:ManyBodyJob)=>Promise<unknown>,
  onPoint:(point:IsingStudyPoint)=>void|Promise<void>=()=>{},signal?:AbortSignal,
  resumePoints:readonly IsingStudyPoint[]=[]):Promise<IsingStudyResult> {
  assertIsingStudyPlan(plan);
  if(resumePoints.length>plan.axis.points||resumePoints.some((point,index)=>point.index!==index||!isingStudyPointMatchesPlan(plan,point)))
    throw new Error("Invalid Ising study resume prefix");
  const points:IsingStudyPoint[]=[...resumePoints];
  for(let index=points.length;index<plan.axis.points;index++){
    if(signal?.aborted)break;
    const job=isingStudyJob(plan,index),result=await run(job);
    if(!candidate(result)||result.jobId!==job.jobId||result.engine.name!==job.engine||
      JSON.stringify(result.model)!==JSON.stringify(job.model))throw new Error(`Ising study point ${index} failed run lineage`);
    const point:IsingStudyPoint={index,ratio:isingStudyRatio(plan,index),runId:result.runId,
      lowEnergies:result.spectrum.lowEnergies,gap:result.spectrum.gap,
      siteMagnetization:result.groundState.siteMagnetization,halfChainEntropy:result.groundState.halfChainEntropy};
    if(!isIsingStudyResult({schema:"quantum-ising-study-result/v1",studyId:plan.studyId,plan,
      status:index+1===plan.axis.points?"completed":"cancelled",points:[...points,point],computedAt:new Date().toISOString()}))
      throw new Error(`Ising study point ${index} has invalid observables`);
    if(!isingStudyPointMatchesPlan(plan,point))throw new Error(`Ising study point ${index} has inconsistent gap`);
    points.push(point);await onPoint(point);
    if(index+1<plan.axis.points)await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  const result:IsingStudyResult={schema:"quantum-ising-study-result/v1",studyId:plan.studyId,plan,
    status:points.length===plan.axis.points?"completed":"cancelled",points,computedAt:new Date().toISOString()};
  if(!isIsingStudyResult(result))throw new Error("Invalid Ising study result");
  return result;
}
