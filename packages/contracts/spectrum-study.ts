import type {EngineName} from "./index";

export interface SpectrumStudyPlan {
  schema:"quantum-spectrum-study/v1";
  studyId:string;
  engine:EngineName;
  fixed:{omega:number};
  axis:{parameter:"delta";start:number;stop:number;points:number};
  output:"eigenvalues";
}
export interface SpectrumStudyPoint {index:number;delta:number;eigenvalues:[number,number];runId:string}
export interface SpectrumStudyResult {
  schema:"quantum-spectrum-study-result/v1";
  studyId:string;
  plan:SpectrumStudyPlan;
  status:"completed"|"cancelled";
  points:SpectrumStudyPoint[];
  computedAt:string;
}
export interface SpectrumStudySummary {
  studyId:string;
  engine:SpectrumStudyPlan["engine"];
  fixedOmega:number;
  deltaStart:number;
  deltaStop:number;
  output:SpectrumStudyPlan["output"];
  status:SpectrumStudyResult["status"];
  completedPoints:number;
  totalPoints:number;
  computedAt:string;
}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const exactKeys=(value:Record<string,unknown>,keys:string[])=>
  Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const bounded=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)&&value>=-1e6&&value<=1e6;
const identifier=(value:unknown,max:number)=>typeof value==="string"&&value.length<=max&&/^[A-Za-z0-9_-]+$/.test(value);
/** CSP-safe mirror of the separate study schema; AJV parity is tested in Node. */
export function isSpectrumStudyPlan(value:unknown):value is SpectrumStudyPlan{
  if(!record(value)||!exactKeys(value,["schema","studyId","engine","fixed","axis","output"])||
    value.schema!=="quantum-spectrum-study/v1"||!identifier(value.studyId,80)||
    (value.engine!=="qutip"&&value.engine!=="native")||value.output!=="eigenvalues"||
    !record(value.fixed)||!exactKeys(value.fixed,["omega"])||!bounded(value.fixed.omega)||
    !record(value.axis)||!exactKeys(value.axis,["parameter","start","stop","points"])||
    value.axis.parameter!=="delta"||!bounded(value.axis.start)||!bounded(value.axis.stop)||
    !Number.isInteger(value.axis.points)||!(typeof value.axis.points==="number"&&value.axis.points>=3&&value.axis.points<=31))return false;
  return (value.axis.start as number)<(value.axis.stop as number);
}
export function isSpectrumStudyResult(value:unknown):value is SpectrumStudyResult{
  if(!record(value)||!exactKeys(value,["schema","studyId","plan","status","points","computedAt"])||
    value.schema!=="quantum-spectrum-study-result/v1"||!identifier(value.studyId,80)||
    !isSpectrumStudyPlan(value.plan)||value.studyId!==value.plan.studyId||
    (value.status!=="completed"&&value.status!=="cancelled")||
    typeof value.computedAt!=="string"||value.computedAt.length<20||
    !Array.isArray(value.points)||value.points.length>value.plan.axis.points||
    (value.status==="completed"&&value.points.length!==value.plan.axis.points))return false;
  return value.points.every((point,index)=>record(point)&&exactKeys(point,["index","delta","eigenvalues","runId"])&&
    point.index===index&&bounded(point.delta)&&identifier(point.runId,100)&&
    Array.isArray(point.eigenvalues)&&point.eigenvalues.length===2&&
    point.eigenvalues.every((energy:unknown)=>typeof energy==="number"&&Number.isFinite(energy)));
}
export function assertSpectrumStudyPlan(value:unknown):asserts value is SpectrumStudyPlan{
  if(!isSpectrumStudyPlan(value))
    throw new Error("Invalid bounded quantum-spectrum-study/v1 plan");
}
