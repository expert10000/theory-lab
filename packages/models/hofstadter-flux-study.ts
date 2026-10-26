import type {TopologyJob,TopologyResult,HofstadterAnalysis} from "../contracts";
import {assertHofstadterFluxPlan,assertHofstadterFluxStudy,reducedFluxes,type HofstadterFluxPlan,type HofstadterFluxPoint,type HofstadterFluxStudy} from "../contracts/hofstadter-flux-study";
import {consistentTopologyResult} from "./topology";

export async function hofstadterResultHash(result:TopologyResult):Promise<string>{
  const bytes=new TextEncoder().encode(JSON.stringify(result,null,2)+"\n");
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export function hofstadterFluxJob(plan:HofstadterFluxPlan,index:number):TopologyJob {
  assertHofstadterFluxPlan(plan);const flux=reducedFluxes(plan.maxDenominator)[index];
  if(!flux)throw new Error("Flux point out of range");
  return {schema:"quantum-job/v1",jobId:`${plan.studyId}-${index}`,operation:"topology",engine:"native",
    model:{type:"hofstadter",parameters:{p:flux.p,q:flux.q,hopping:plan.hopping,grid:plan.grid,
      ...(plan.occupiedBands!==null&&plan.occupiedBands<flux.q?{occupiedBands:plan.occupiedBands}:{})}}};
}
export async function hofstadterFluxPoint(plan:HofstadterFluxPlan,index:number,result:TopologyResult):Promise<HofstadterFluxPoint> {
  const job=hofstadterFluxJob(plan,index);
  if(result.model.type!=="hofstadter"||result.analysis.kind!=="hofstadter"||
    result.jobId!==job.jobId||JSON.stringify(result.model)!==JSON.stringify(job.model)||
    !consistentTopologyResult(job,result))throw new Error("Flux point has invalid run lineage");
  const a:HofstadterAnalysis=result.analysis;
  const f=a.filling;
  const point:HofstadterFluxPoint={index,p:result.model.parameters.p,q:result.model.parameters.q,
    runId:result.runId,resultSha256:await hofstadterResultHash(result),energies:a.bandEnergies,
    coarseBounds:a.coarseBounds,fineBounds:a.fineBounds,extremaDrift:a.extremaDrift,converged:a.converged,
    gaps:(a.chernGaps??[]).map(g=>({occupiedBands:g.occupiedBands,fineGap:g.fineGap,status:g.status})),
    filling:f?{occupiedBands:f.occupiedBands,coarseGlobalGap:f.coarseGlobalGap,fineGlobalGap:f.fineGlobalGap,
      gapStatus:f.gapStatus,conductance:f.conductance??null,status:f.status??"mesh-unresolved"}:null};
  return point;
}
export async function runHofstadterFluxStudy(plan:HofstadterFluxPlan,run:(job:TopologyJob)=>Promise<TopologyResult>,
  onPoint:(point:HofstadterFluxPoint)=>Promise<void>|void=()=>{},signal?:AbortSignal,
  resume:readonly HofstadterFluxPoint[]=[]):Promise<HofstadterFluxStudy> {
  assertHofstadterFluxPlan(plan);const fluxes=reducedFluxes(plan.maxDenominator);
  if(resume.length>fluxes.length||resume.some((point,index)=>point.index!==index||point.p!==fluxes[index].p||point.q!==fluxes[index].q))
    throw new Error("Invalid flux resume prefix");
  const points=[...resume];
  for(let index=points.length;index<fluxes.length;index++){
    if(signal?.aborted)break;
    const point=await hofstadterFluxPoint(plan,index,await run(hofstadterFluxJob(plan,index)));
    points.push(point);await onPoint(point);
  }
  const result:HofstadterFluxStudy={schema:"quantum-hofstadter-flux-study/v1",studyId:plan.studyId,plan,
    status:points.length===fluxes.length?"completed":"cancelled",points,computedAt:new Date().toISOString()};
  assertHofstadterFluxStudy(result);return result;
}
