import Ajv from "ajv";
import jobSchema from "./schemas/quantum-ute2-edge-job.v1.json";
import resultSchema from "./schemas/quantum-ute2-edge-result.v1.json";
import type {Ute2TopologyModel} from "./ute2-topology";

export interface Ute2EdgeSource {runId:string;resultSha256:string}
export interface Ute2EdgeRequest {sourceRunId:string;sourceResultSha256:string;width:12|16|20}
export interface Ute2EdgeJob {
  schema:"quantum-ute2-edge-job/v1";jobId:string;source:Ute2EdgeSource;
  model:Ute2TopologyModel;bulkChern:-1|0|1;width:12|16|20;
}
export interface Ute2EdgeState {re:number[];im:number[]}
export interface Ute2EdgeWidth {
  width:number;energies:number[];pairStates:[Ute2EdgeState,Ute2EdgeState];
  pairDensity:number[];boundaryWeight:number;maxResidual:number;
  maxNormError:number;particleHoleOverlap:number;
}
export interface Ute2EdgeResult {
  schema:"quantum-ute2-edge-result/v1";jobId:string;runId:string;status:"completed";
  source:Ute2EdgeSource;model:Ute2TopologyModel;bulkChern:-1|0|1;
  boundary:"open x; periodic y; t=a=1";ky:number;bulkMinimumEnergy:number;
  widths:[Ute2EdgeWidth,Ute2EdgeWidth];edgeStatus:"localized_in_gap"|"not_resolved";
  units:{momentum:"rad/a";energy:"t=1";density:"probability per x cell"};
  provenance:{pythonVersion:string;workerVersion:string;computedAt:string;durationMs:number};
}
export interface Ute2EdgeRunSummary {
  runId:string;computedAt:string;source:Ute2EdgeSource;mu:number;delta:number;
  width:number;edgeStatus:"localized_in_gap"|"not_resolved";resultSha256:string;
}
export interface Ute2EdgeBridge {
  runUte2Edge(request:Ute2EdgeRequest):Promise<Ute2EdgeResult>;
  listUte2EdgeRuns():Promise<Ute2EdgeRunSummary[]>;
  getUte2EdgeRun(runId:string):Promise<Ute2EdgeResult>;
}
const ajv=new Ajv({allErrors:true,strict:true});
export const isUte2EdgeJob=ajv.compile<Ute2EdgeJob>(jobSchema);
export const isUte2EdgeResult=ajv.compile<Ute2EdgeResult>(resultSchema);
export function assertUte2EdgeJob(value:unknown):asserts value is Ute2EdgeJob {
  if(!isUte2EdgeJob(value))throw new Error(`Invalid class-D edge job: ${ajv.errorsText(isUte2EdgeJob.errors)}`);
}
