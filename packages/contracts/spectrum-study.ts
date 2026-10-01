import Ajv from "ajv";
import schema from "./schemas/quantum-spectrum-study.v1.json";
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
const ajv=new Ajv({strict:true,allErrors:true});
const planSchema=schema.oneOf[0];
const resultSchema={...schema.oneOf[1],definitions:{plan:schema.oneOf[0]},
  properties:{...schema.oneOf[1].properties,plan:{"$ref":"#/definitions/plan"}}};
// The standalone result validator resolves the embedded plan without changing
// any frozen quantum-job/result protocol branch.
export const isSpectrumStudyPlan=ajv.compile<SpectrumStudyPlan>(planSchema);
export const isSpectrumStudyResult=ajv.compile<SpectrumStudyResult>(resultSchema);
export function assertSpectrumStudyPlan(value:unknown):asserts value is SpectrumStudyPlan{
  if(!isSpectrumStudyPlan(value)||value.axis.start>=value.axis.stop)
    throw new Error("Invalid bounded quantum-spectrum-study/v1 plan");
}
