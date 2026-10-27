import type {TopologyResult} from "../contracts";
import {assertRiceMeleConvergencePlan,assertRiceMeleConvergenceStudy,
  type RiceMeleConvergencePlan,type RiceMeleConvergenceStudy,type RiceMeleConvergencePoint} from "../contracts/rice-mele-convergence";
import {linkedRiceMeleTraces} from "./rice-mele-comparison";
import {hofstadterResultHash} from "./hofstadter-flux-study";

export async function deriveRiceMeleConvergenceStudy(plan:RiceMeleConvergencePlan,
  results:TopologyResult[],computedAt=new Date().toISOString()):Promise<RiceMeleConvergenceStudy>{
  assertRiceMeleConvergencePlan(plan);
  const ids=[...new Set([...plan.durationRuns,...plan.widthRuns])];
  if(results.length!==ids.length||results.some((r,i)=>r.runId!==ids[i]))
    throw new Error("Rice–Mele study requires the exact saved runs in plan order");
  const linked=results.map(linkedRiceMeleTraces);
  if(linked.some(v=>!v))throw new Error("Each source must contain linked periodic and open-chain traces");
  const rows=linked as NonNullable<(typeof linked)[number]>[];
  const first=rows[0].parameters;
  const cycle={baseHopping:first.baseHopping,modulation:first.modulation,
    staggerAmplitude:first.staggerAmplitude,staggerOffset:first.staggerOffset,
    kSamples:first.kSamples,phaseSamples:first.phaseSamples,stepsPerPhase:first.stepsPerPhase!};
  const byId=new Map(rows.map(row=>[row.runId,row]));
  const anchor=byId.get(plan.anchorRunId)!;
  if(rows.some(row=>Object.entries(cycle).some(([key,value])=>
    row.parameters[key as keyof typeof cycle]!==value)))
    throw new Error("Rice–Mele cycle parameters differ between saved runs");
  const duration=plan.durationRuns.map(id=>byId.get(id)!);
  const width=plan.widthRuns.map(id=>byId.get(id)!);
  if(duration.some(row=>row.parameters.chainCells!==anchor.parameters.chainCells)||
    width.some(row=>row.parameters.duration!==anchor.parameters.duration)||
    duration.some((row,i)=>i>0&&row.bulk.duration<=duration[i-1].bulk.duration)||
    width.some((row,i)=>i>0&&row.chain.cells<=width[i-1].chain.cells))
    throw new Error("Controlled series must vary only ordered duration or ordered chain width");
  const sources:RiceMeleConvergencePoint[]=await Promise.all(rows.map(async(row,i)=>({
    runId:row.runId,resultSha256:await hofstadterResultHash(results[i]),
    duration:row.bulk.duration,chainCells:row.chain.cells,
    periodicCharge:row.bulk.transportedCharge,
    chainCentralBondCharge:row.chain.centralBondCharge.at(-1)!,
    periodicStatus:row.bulk.status,chainStatus:row.chain.status,
    bulkTimeStepDrift:row.bulk.timeStepChargeDrift,bulkMomentumDrift:row.bulk.momentumChargeDrift,
    bulkNormDrift:row.bulk.maxNormDrift,chainTimeStepDrift:row.chain.timeStepChargeDrift,
    chainWidthDrift:row.chain.widthChargeDrift,chainContinuityResidual:row.chain.maxContinuityResidual,
    chainParticleDrift:row.chain.maxParticleDrift,chainNormDrift:row.chain.maxNormDrift
  })));
  const study:RiceMeleConvergenceStudy={schema:"quantum-rice-mele-convergence-study/v1",
    studyId:plan.studyId,plan,computedAt,cycle,sources,
    durationRuns:[...plan.durationRuns],widthRuns:[...plan.widthRuns],
    units:{duration:"inverse hopping energy",periodicCharge:"electron charge / cell",
      chainCentralBondCharge:"electron charge"}};
  assertRiceMeleConvergenceStudy(study);
  return study;
}
