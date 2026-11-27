import Ajv from "ajv";
import jobSchema from "./schemas/quantum-ute2-topology-job.v1.json";
import resultSchema from "./schemas/quantum-ute2-topology-result.v1.json";

export interface Ute2TopologyParameters { mu:number; delta:number; mesh:number }
export interface Ute2TopologyModel { type:"square_lattice_class_d"; parameters:Ute2TopologyParameters }
export interface Ute2TopologyJob { schema:"quantum-ute2-topology-job/v1"; jobId:string; model:Ute2TopologyModel }
export type Ute2InvariantStatus = "defined"|"gap_closed"|"mesh_unresolved";
export interface Ute2TopologyResult {
  schema:"quantum-ute2-topology-result/v1"; jobId:string; runId:string; status:"completed";
  model:Ute2TopologyModel; basis:"spinless two-component Nambu lattice toy";
  orientation:"occupied band; kx then ky; x-major half-open torus";
  bulkMinimumEnergy:number; bulkGap:number; sampledMinimumEnergy:number; gapClosed:boolean;
  coarseMesh:number; fineMesh:number;
  coarseLinkChern:number|null; fineLinkChern:number|null;
  coarseMinimumLink:number|null; fineMinimumLink:number|null;
  curvatureIntegralCoarse:number|null; curvatureIntegralFine:number|null;
  analyticExpectedChern:number|null; chern:number|null; invariantStatus:Ute2InvariantStatus;
  units:{momentum:"rad/a";energy:"t=1"};
  provenance:{pythonVersion:string;workerVersion:string;computedAt:string;durationMs:number};
}
export interface Ute2TopologyRunSummary {
  runId:string;computedAt:string;parameters:Ute2TopologyParameters;
  bulkGap:number;invariantStatus:Ute2InvariantStatus;chern:number|null;resultSha256:string;
}
export interface Ute2TopologyBridge {
  runUte2Topology(job:Ute2TopologyJob):Promise<Ute2TopologyResult>;
  listUte2TopologyRuns():Promise<Ute2TopologyRunSummary[]>;
  getUte2TopologyRun(runId:string):Promise<Ute2TopologyResult>;
}
const ajv=new Ajv({allErrors:true,strict:true});
export const isUte2TopologyJob=ajv.compile<Ute2TopologyJob>(jobSchema);
export const isUte2TopologyResult=ajv.compile<Ute2TopologyResult>(resultSchema);
export function assertUte2TopologyJob(value:unknown):asserts value is Ute2TopologyJob {
  if(!isUte2TopologyJob(value))throw new Error(`Invalid class-D toy job: ${ajv.errorsText(isUte2TopologyJob.errors)}`);
}
