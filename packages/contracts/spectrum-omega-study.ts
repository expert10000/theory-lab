import type {EngineName} from "./index";

/** Additive static Ω-axis study. Existing Δ-axis v1 records are unchanged. */
export interface SpectrumOmegaStudyPlan {
  schema:"quantum-spectrum-study/v2";studyId:string;engine:EngineName;
  fixed:{delta:number};axis:{parameter:"omega";start:number;stop:number;points:number};output:"eigenvalues";
}
export interface SpectrumOmegaStudyPoint {index:number;omega:number;eigenvalues:[number,number];runId:string}
export interface SpectrumOmegaStudyResult {
  schema:"quantum-spectrum-study-result/v2";studyId:string;plan:SpectrumOmegaStudyPlan;
  status:"completed"|"cancelled";points:SpectrumOmegaStudyPoint[];computedAt:string;
}
export interface SpectrumOmegaStudySummary {
  studyId:string;engine:EngineName;fixedDelta:number;omegaStart:number;omegaStop:number;
  output:"eigenvalues";status:SpectrumOmegaStudyResult["status"];
  completedPoints:number;totalPoints:number;computedAt:string;
}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,expected:string[])=>Object.keys(v).length===expected.length&&expected.every(k=>Object.hasOwn(v,k));
const bounded=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=1e6;
const id=(v:unknown,max:number)=>typeof v==="string"&&v.length<=max&&/^[A-Za-z0-9_-]+$/.test(v);
export function isSpectrumOmegaStudyPlan(v:unknown):v is SpectrumOmegaStudyPlan {
  return record(v)&&keys(v,["schema","studyId","engine","fixed","axis","output"])&&
    v.schema==="quantum-spectrum-study/v2"&&id(v.studyId,80)&&(v.engine==="qutip"||v.engine==="native")&&
    v.output==="eigenvalues"&&record(v.fixed)&&keys(v.fixed,["delta"])&&bounded(v.fixed.delta)&&
    record(v.axis)&&keys(v.axis,["parameter","start","stop","points"])&&v.axis.parameter==="omega"&&
    bounded(v.axis.start)&&bounded(v.axis.stop)&&(v.axis.start as number)<(v.axis.stop as number)&&
    Number.isInteger(v.axis.points)&&typeof v.axis.points==="number"&&v.axis.points>=3&&v.axis.points<=31;
}
export function isSpectrumOmegaStudyResult(v:unknown):v is SpectrumOmegaStudyResult {
  if(!record(v)||!keys(v,["schema","studyId","plan","status","points","computedAt"])||
    v.schema!=="quantum-spectrum-study-result/v2"||!isSpectrumOmegaStudyPlan(v.plan)||v.studyId!==v.plan.studyId||
    (v.status!=="completed"&&v.status!=="cancelled")||typeof v.computedAt!=="string"||!Number.isFinite(Date.parse(v.computedAt))||
    !Array.isArray(v.points)||v.points.length>v.plan.axis.points||
    (v.status==="completed")!==(v.points.length===v.plan.axis.points))return false;
  return v.points.every((point:unknown,index:number)=>record(point)&&keys(point,["index","omega","eigenvalues","runId"])&&
    point.index===index&&bounded(point.omega)&&id(point.runId,100)&&
    Array.isArray(point.eigenvalues)&&point.eigenvalues.length===2&&point.eigenvalues.every((energy:unknown)=>typeof energy==="number"&&Number.isFinite(energy)));
}
export function assertSpectrumOmegaStudyPlan(v:unknown):asserts v is SpectrumOmegaStudyPlan {
  if(!isSpectrumOmegaStudyPlan(v))throw new Error("Invalid bounded quantum-spectrum-study/v2 Ω plan");
}
