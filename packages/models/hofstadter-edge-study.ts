import type {TopologyJob,TopologyResult,HofstadterAnalysis} from "../contracts";
import {assertHofstadterEdgePlan,assertHofstadterEdgeStudy,type EdgeCrossing,
  type EdgeWidthEvidence,type TrackedEdgeWidthEvidence,type HofstadterEdgePlan,type HofstadterEdgeStudy} from "../contracts/hofstadter-edge-study";
import {consistentTopologyResult} from "./topology";
import {hofstadterResultHash} from "./hofstadter-flux-study";

export function hofstadterEdgeJobs(plan:HofstadterEdgePlan):TopologyJob[]{
  assertHofstadterEdgePlan(plan);
  const base={p:plan.p,q:plan.q,hopping:plan.hopping,grid:plan.grid,occupiedBands:plan.occupiedBands};
  return [
    {schema:"quantum-job/v1",jobId:`${plan.studyId}-bulk`,operation:"topology",engine:"native",model:{type:"hofstadter",parameters:base}},
    ...plan.widths.map(cells=>({schema:"quantum-job/v1" as const,jobId:`${plan.studyId}-strip-${cells}`,
      operation:"topology" as const,engine:"native" as const,
      model:{type:"hofstadter" as const,parameters:{...base,stripCells:cells,stripSamples:plan.stripSamples}}})),
    ...(plan.convergenceSamples?plan.widths.map(cells=>({schema:"quantum-job/v1" as const,
      jobId:`${plan.studyId}-strip-${cells}-coarse`,operation:"topology" as const,engine:"native" as const,
      model:{type:"hofstadter" as const,parameters:{...base,stripCells:cells,stripSamples:17}}})):[])
  ];
}
/** A sampled crossing is admitted only when both interval endpoints are localized at the same edge. */
export function stripCrossingEvidence(strip:NonNullable<HofstadterAnalysis["strip"]>,fermi:number):EdgeWidthEvidence{
  const crossings:EdgeCrossing[]=[];
  for(const [side,weights] of [["left",strip.leftWeights],["right",strip.rightWeights]] as const){
    for(let state=0;state<strip.cells;state++)for(let interval=0;interval<strip.kyValues.length-1;interval++){
      const low=strip.energies[state][interval]-fermi,high=strip.energies[state][interval+1]-fermi;
      const minimumWeight=Math.min(weights[state][interval],weights[state][interval+1]);
      if(low*high>=0||minimumWeight<.35)continue;
      const fraction=-low/(high-low);
      crossings.push({side,stateIndex:state,interval,
        ky:strip.kyValues[interval]+fraction*(strip.kyValues[interval+1]-strip.kyValues[interval]),
        direction:high>low?1:-1,minimumWeight});
    }
  }
  return {cells:strip.cells,crossings,
    leftFlow:crossings.filter(c=>c.side==="left").reduce((n,c)=>n+c.direction,0),
    rightFlow:crossings.filter(c=>c.side==="right").reduce((n,c)=>n+c.direction,0)};
}
function widthDrift(first:{crossings:EdgeCrossing[]},second:{crossings:EdgeCrossing[]},periodic=false):number|null{
  let maximum=0;
  for(const side of ["left","right"] as const){
    const a=first.crossings.filter(c=>c.side===side).sort((x,y)=>x.ky-y.ky);
    const b=second.crossings.filter(c=>c.side===side).sort((x,y)=>x.ky-y.ky);
    if(a.length!==b.length)return null;
    let best:number|null=null;
    for(let shift=0;shift<(periodic?Math.max(1,b.length):1);shift++){
      let candidate=0,valid=true;
      a.forEach((c,i)=>{const paired=b[(i+shift)%b.length];
        if(c.direction!==paired.direction){valid=false;return;}
        const delta=Math.abs(c.ky-paired.ky);
        candidate=Math.max(candidate,periodic?Math.min(delta,2*Math.PI-delta):delta);});
      if(valid&&(best===null||candidate<best))best=candidate;
    }
    if(best===null)return null;
    maximum=Math.max(maximum,best);
  }
  return maximum;
}
export async function deriveHofstadterEdgeStudy(plan:HofstadterEdgePlan,
  results:TopologyResult[]):Promise<HofstadterEdgeStudy>{
  const jobs=hofstadterEdgeJobs(plan);
  if(results.length!==jobs.length)throw new Error("Incomplete edge study sources");
  for(let i=0;i<jobs.length;i++)if(results[i].model.type!=="hofstadter"||results[i].analysis.kind!=="hofstadter"||
    results[i].jobId!==jobs[i].jobId||JSON.stringify(results[i].model)!==JSON.stringify(jobs[i].model)||
    !consistentTopologyResult(jobs[i],results[i]))throw new Error("Mismatched bulk/strip run");
  const bulk=results[0].analysis as HofstadterAnalysis;
  const filling=bulk.filling;
  if(!filling)throw new Error("Bulk run lacks specified filling");
  const strips=results.slice(1,3).map(result=>(result.analysis as HofstadterAnalysis).strip);
  if(strips.some(v=>!v))throw new Error("Finite strip source is missing");
  const fermi=filling.fermiEnergy;
  const widths=strips.map(strip=>fermi===null?
    {cells:strip!.cells,crossings:[],leftFlow:0,rightFlow:0}:
    stripCrossingEvidence(strip!,fermi)) as [EdgeWidthEvidence,EdgeWidthEvidence];
  const drift=fermi===null?null:widthDrift(widths[0],widths[1]);
  let reason="";
  if(filling.status!=="defined"||filling.conductance===null||filling.conductance===undefined||
    filling.gapStatus!=="open"||fermi===null||!bulk.converged)reason="Bulk global gap, Chern or sampling unresolved";
  else if(strips.some(strip=>strip!.maxResidual>1e-7||strip!.maxNormError>1e-7))reason="Strip eigensystem diagnostics unresolved";
  else if(drift===null||drift>2*Math.PI/(plan.stripSamples-1))reason="Edge crossings do not converge across strip widths";
  else if(widths.some(w=>!w.crossings.length||w.leftFlow!==-filling.conductance!||w.rightFlow!==filling.conductance!))
    reason="Localized crossing flow does not resolve the bulk Hall orientation";
  const continuations=strips.map(strip=>strip!.continuation);
  if(continuations.some(Boolean)&&continuations.some(v=>!v))
    throw new Error("Strip continuation evidence is incomplete");
  let tracking:HofstadterEdgeStudy["tracking"];
  if(continuations.every(Boolean)){
    const trackedWidths=continuations.map((continuation,i)=>{
      const crossings=continuation!.crossings;
      return {cells:plan.widths[i],ambiguousCandidates:continuation!.ambiguousCandidates,crossings,
        leftFlow:crossings.filter(c=>c.side==="left").reduce((sum,c)=>sum+c.direction,0),
        rightFlow:crossings.filter(c=>c.side==="right").reduce((sum,c)=>sum+c.direction,0)};
    }) as [TrackedEdgeWidthEvidence,TrackedEdgeWidthEvidence];
    const trackedDrift=widthDrift(trackedWidths[0],trackedWidths[1]);
    let trackingReason="";
    if(filling.status!=="defined"||filling.conductance===null||filling.conductance===undefined||
      filling.gapStatus!=="open"||fermi===null||!bulk.converged)
      trackingReason="Bulk global gap, Chern or sampling unresolved";
    else if(strips.some(strip=>strip!.maxResidual>1e-7||strip!.maxNormError>1e-7))
      trackingReason="Strip eigensystem diagnostics unresolved";
    else if(plan.stripSamples<31)
      trackingReason="Strip momentum sampling is below the validated 31-point comparison grid";
    if(!trackingReason&&trackedWidths.some(w=>w.ambiguousCandidates>0))
      trackingReason="Adjacent eigenspaces have ambiguous overlap at an edge crossing";
    else if(!trackingReason&&(trackedDrift===null||trackedDrift>2*Math.PI/(plan.stripSamples-1)))
      trackingReason="Tracked edge crossings do not converge across strip widths";
    else if(!trackingReason&&trackedWidths.some(w=>!w.crossings.length||
      w.leftFlow!==-filling.conductance!||w.rightFlow!==filling.conductance!))
      trackingReason="Tracked edge flow does not resolve the bulk Hall orientation";
    tracking={method:"maximum-eigenvector-overlap/hungarian-v1",widths:trackedWidths,
      status:trackingReason?"undefined":"consistent",
      reason:trackingReason||"Overlap-validated edge flow agrees with the bulk Hall orientation at both widths",
      maximumKyDrift:trackedDrift};
    reason=trackingReason;
  }
  let convergence:HofstadterEdgeStudy["convergence"];
  if(plan.convergenceSamples){
    const coarse=results.slice(3).map(r=>(r.analysis as HofstadterAnalysis).strip);
    if(coarse.length!==2||coarse.some(v=>!v))throw new Error("Two-grid strip evidence is missing");
    const terminations=plan.widths.map(cells=>({cells,origin:0,leftPhase:0,rightPhase:(cells-1)%plan.q})) as
      NonNullable<HofstadterEdgeStudy["convergence"]>["terminations"];
    const evidence=coarse.map((strip,i)=>{
      const fine=strips[i]!,a=strip!.continuation,b=fine.continuation;
      return {cells:plan.widths[i],coarseAmbiguous:a?.ambiguousCandidates??0,
        fineAmbiguous:b?.ambiguousCandidates??0,coarseCrossings:a?.crossings??[],fineCrossings:b?.crossings??[],
        coarseSeam:a?.seam??null,fineSeam:b?.seam??null,
        maximumKyDrift:a&&b?widthDrift(a,b,true):null};
    });
    const maxDrift=evidence.some(v=>v.maximumKyDrift===null)?null:
      Math.max(...evidence.map(v=>v.maximumKyDrift!));
    let convergenceReason="";
    if(terminations[0].rightPhase!==terminations[1].rightPhase)
      convergenceReason="Strip boundary terminations differ";
    else if(tracking?.status!=="consistent")convergenceReason="Fine-grid bulk-edge tracking is unresolved";
    else if(evidence.some(v=>v.coarseAmbiguous||v.fineAmbiguous||
      !v.coarseSeam||!v.fineSeam||v.coarseSeam.ambiguousStates||v.fineSeam.ambiguousStates||
      v.coarseSeam.minimumOverlap<.5||v.fineSeam.minimumOverlap<.5||
      v.coarseSeam.minimumMargin<.02||v.fineSeam.minimumMargin<.02||
      v.coarseSeam.maximumEnergyDrift>1e-7||v.fineSeam.maximumEnergyDrift>1e-7))
      convergenceReason="Edge assignments or periodic seam are unresolved";
    else if(maxDrift===null||maxDrift>Math.PI/30||
      evidence.some(v=>!v.coarseCrossings.length||
        v.coarseCrossings.reduce((n,c)=>n+(c.side==="left"?c.direction:0),0)!==-filling.conductance!||
        v.coarseCrossings.reduce((n,c)=>n+(c.side==="right"?c.direction:0),0)!==filling.conductance!))
      convergenceReason="Crossing positions or signed flow do not converge across momentum grids";
    convergence={method:"matched-termination-two-grid/v1",terminations,grids:[17,31],
      widths:evidence,status:convergenceReason?"undefined":"consistent",
      reason:convergenceReason||"Same boundary termination and tracked crossings resolve on both momentum grids, including the seam",
      maximumKyDrift:maxDrift};
    if(convergenceReason)reason=convergenceReason;
  }
  const roles=["bulk",...plan.widths.map(w=>`strip-${w}`),
    ...(plan.convergenceSamples?plan.widths.map(w=>`strip-${w}-coarse`):[])];
  const result:HofstadterEdgeStudy={schema:"quantum-hofstadter-edge-study/v1",studyId:plan.studyId,plan,
    sources:await Promise.all(results.map(async(result,i)=>({role:roles[i],
      runId:result.runId,resultSha256:await hofstadterResultHash(result)}))),
    bulk:{gapStatus:filling.gapStatus,globalGap:filling.fineGlobalGap,fermiEnergy:fermi,
      hall:filling.conductance??null,samplingConverged:bulk.converged},widths,
    ...(tracking?{tracking}:{}),...(convergence?{convergence}:{}),
    comparison:{status:reason?"undefined":"consistent",reason:reason||"Sampled edge flow agrees with bulk Hall orientation at both widths",
      maximumKyDrift:tracking?tracking.maximumKyDrift:drift},computedAt:new Date().toISOString()};
  assertHofstadterEdgeStudy(result);return result;
}
