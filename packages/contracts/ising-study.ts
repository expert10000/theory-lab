import type {ManyBodyEngineName,ManyBodyModel} from "./index";

export interface IsingStudyPlan {
  schema:"quantum-ising-study/v1";
  studyId:string;
  engine:ManyBodyEngineName;
  fixed:{sites:number;interaction:number;longitudinal:number;boundary:ManyBodyModel["parameters"]["boundary"]};
  axis:{parameter:"transverse_over_interaction";start:number;stop:number;points:number};
  output:"low_energies_gap_magnetization_entropy";
}
export interface IsingStudyPoint {
  index:number;ratio:number;runId:string;
  lowEnergies:number[];gap:number;siteMagnetization:number[];halfChainEntropy:number;
}
export interface IsingStudyResult {
  schema:"quantum-ising-study-result/v1";studyId:string;plan:IsingStudyPlan;
  status:"completed"|"cancelled";points:IsingStudyPoint[];computedAt:string;
}
export interface IsingStudySummary {
  studyId:string;engine:ManyBodyEngineName;sites:number;interaction:number;boundary:IsingStudyPlan["fixed"]["boundary"];
  start:number;stop:number;status:IsingStudyResult["status"];completedPoints:number;totalPoints:number;computedAt:string;
}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,expected:string[])=>Object.keys(v).length===expected.length&&expected.every(k=>Object.hasOwn(v,k));
const finite=(v:unknown)=>typeof v==="number"&&Number.isFinite(v);
const id=(v:unknown,max:number)=>typeof v==="string"&&v.length<=max&&/^[A-Za-z0-9_-]+$/.test(v);
export function isIsingStudyPlan(v:unknown):v is IsingStudyPlan {
  if(!record(v)||!keys(v,["schema","studyId","engine","fixed","axis","output"])||v.schema!=="quantum-ising-study/v1"||
    !id(v.studyId,80)||(v.engine!=="native"&&v.engine!=="quspin")||v.output!=="low_energies_gap_magnetization_entropy"||
    !record(v.fixed)||!keys(v.fixed,["sites","interaction","longitudinal","boundary"])||
    !Number.isInteger(v.fixed.sites)||!(typeof v.fixed.sites==="number"&&v.fixed.sites>=2&&v.fixed.sites<=8)||
    !finite(v.fixed.interaction)||v.fixed.interaction===0||Math.abs(v.fixed.interaction as number)>10||
    !finite(v.fixed.longitudinal)||Math.abs(v.fixed.longitudinal as number)>10||
    (v.fixed.boundary!=="open"&&v.fixed.boundary!=="periodic")||
    !record(v.axis)||!keys(v.axis,["parameter","start","stop","points"])||
    v.axis.parameter!=="transverse_over_interaction"||!finite(v.axis.start)||!finite(v.axis.stop)||
    !Number.isInteger(v.axis.points)||!(typeof v.axis.points==="number"&&v.axis.points>=3&&v.axis.points<=31))return false;
  return (v.axis.start as number)<(v.axis.stop as number)&&
    Math.abs((v.axis.start as number)*(v.fixed.interaction as number))<=10&&
    Math.abs((v.axis.stop as number)*(v.fixed.interaction as number))<=10;
}
export function isIsingStudyResult(v:unknown):v is IsingStudyResult {
  if(!record(v)||!keys(v,["schema","studyId","plan","status","points","computedAt"])||
    v.schema!=="quantum-ising-study-result/v1"||!isIsingStudyPlan(v.plan)||v.studyId!==v.plan.studyId||
    (v.status!=="completed"&&v.status!=="cancelled")||typeof v.computedAt!=="string"||!Number.isFinite(Date.parse(v.computedAt))||
    !Array.isArray(v.points)||v.points.length>v.plan.axis.points||
    (v.status==="completed")!==(v.points.length===v.plan.axis.points))return false;
  const plan=v.plan;
  return v.points.every((p:unknown,index:number)=>record(p)&&keys(p,["index","ratio","runId","lowEnergies","gap","siteMagnetization","halfChainEntropy"])&&
    p.index===index&&finite(p.ratio)&&id(p.runId,100)&&Array.isArray(p.lowEnergies)&&
    p.lowEnergies.length>=2&&p.lowEnergies.length<=2**plan.fixed.sites&&p.lowEnergies.every(finite)&&
    finite(p.gap)&&(p.gap as number)>=0&&Array.isArray(p.siteMagnetization)&&p.siteMagnetization.length===plan.fixed.sites&&
    p.siteMagnetization.every((m:unknown)=>finite(m)&&Math.abs(m as number)<=1+1e-6)&&finite(p.halfChainEntropy)&&(p.halfChainEntropy as number)>=0);
}
export function assertIsingStudyPlan(v:unknown):asserts v is IsingStudyPlan {
  if(!isIsingStudyPlan(v))throw new Error("Invalid bounded quantum-ising-study/v1 plan");
}
