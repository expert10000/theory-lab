import {isQuantumResult,type SpectrumJob,type SpectrumResult} from "../contracts";
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
/** Compose existing verified, durable diagonalization jobs; cancellation occurs between points. */
export async function runSpectrumStudy(plan:SpectrumStudyPlan,
  run:(job:SpectrumJob)=>Promise<unknown>,onPoint:(point:SpectrumStudyPoint)=>void=()=>{},signal?:AbortSignal):Promise<SpectrumStudyResult>{
  assertSpectrumStudyPlan(plan);
  const points:SpectrumStudyPoint[]=[];
  for(let index=0;index<plan.axis.points;index++){
    if(signal?.aborted)break;
    const delta=studyDelta(plan,index);
    const job:SpectrumJob={schema:"quantum-job/v1",jobId:`${plan.studyId}-${index}`,operation:"diagonalize",
      engine:plan.engine,model:{type:"two_level",parameters:{delta,omega:plan.fixed.omega}}};
    const candidate=await run(job);
    if(!isQuantumResult(candidate)||candidate.operation!=="diagonalize"||
      candidate.jobId!==job.jobId||candidate.engine.name!==job.engine||
      JSON.stringify(candidate.model)!==JSON.stringify(job.model)||
      !consistentTwoLevelSpectrum(job,candidate,true))
      throw new Error(`Study point ${index} failed verified spectrum lineage`);
    const point:SpectrumStudyPoint={index,delta,eigenvalues:candidate.spectrum.eigenvalues,runId:candidate.runId};
    points.push(point);onPoint(point);
    // Yield a UI task so a requested cancellation can stop before the next job.
    if(index+1<plan.axis.points)await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  const result:SpectrumStudyResult={schema:"quantum-spectrum-study-result/v1",studyId:plan.studyId,plan,
    status:points.length===plan.axis.points?"completed":"cancelled",points,computedAt:new Date().toISOString()};
  if(!isSpectrumStudyResult(result))throw new Error("Invalid spectrum study result");
  return result;
}
