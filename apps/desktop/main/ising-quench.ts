import {createHash} from "node:crypto";
import {lstat,mkdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import type {ManyBodyJob,ManyBodyResult} from "../../../packages/contracts";
import {isIsingQuenchArtifact,isIsingQuenchRequest,type IsingQuenchArtifact,type IsingQuenchRequest} from "../../../packages/contracts/ising-quench";
import {RunStore} from "./runs";

const identifier=/^[A-Za-z0-9_-]{1,100}$/;
const hash=(text:string)=>createHash("sha256").update(text).digest("hex");
type Source=IsingQuenchArtifact["source"];
type Compute=(job:ManyBodyJob,source:Source,result:ManyBodyResult,request:IsingQuenchRequest)=>Promise<unknown>;

/** Immutable, keyed quench sidecars; each retrieval re-verifies the parent run. */
export class IsingQuenchStore {
  constructor(private readonly root:string,private readonly runs:RunStore){}
  private path(runId:string,request:IsingQuenchRequest){
    if(!identifier.test(runId)||!isIsingQuenchRequest(request))throw new Error("Invalid Ising quench key");
    return join(this.root,`${runId}-${hash(JSON.stringify(request)).slice(0,24)}.json`);
  }
  private async source(runId:string){
    const [inspected,result]=await Promise.all([this.runs.inspect(runId),this.runs.manyBody(runId)]);
    const job=inspected.job;
    if(job.operation!=="many_body"||job.jobId!==result.jobId||result.runId!==runId||
      job.engine!==result.engine.name||JSON.stringify(job.model)!==JSON.stringify(result.model))
      throw new Error("Invalid Ising quench source lineage");
    return {job,result,source:{runId,jobSha256:inspected.hashes.job,resultSha256:inspected.hashes.result}};
  }
  private check(value:unknown,source:Source,job:ManyBodyJob,result:ManyBodyResult,request:IsingQuenchRequest):IsingQuenchArtifact{
    if(!isIsingQuenchArtifact(value))throw new Error("Invalid Ising quench artifact");
    const artifact=value as IsingQuenchArtifact;
    if(JSON.stringify(artifact.source)!==JSON.stringify(source)||
      artifact.targetTransverse!==request.targetTransverse||artifact.duration!==request.duration||artifact.samples!==request.samples||
      artifact.initial.sites!==job.model.parameters.sites||artifact.initial.interaction!==job.model.parameters.interaction||
      artifact.initial.transverse!==job.model.parameters.transverse||artifact.initial.longitudinal!==job.model.parameters.longitudinal||
      artifact.initial.boundary!==job.model.parameters.boundary||artifact.provenance.sourceEngine!==job.engine||
      Math.abs(artifact.initial.groundEnergy-result.spectrum.lowEnergies[0])>1e-7||
      Math.abs(artifact.initial.gap-result.spectrum.gap)>1e-7||artifact.initial.gap<=1e-8*Math.max(1,Math.abs(artifact.initial.groundEnergy)))
      throw new Error("Ising quench disagrees with verified source run or requested grid");
    if(artifact.rows[0].siteMagnetization.some((value,index)=>Math.abs(value-result.groundState.siteMagnetization[index])>1e-7))
      throw new Error("Initial quench magnetization disagrees with verified source run");
    return artifact;
  }
  async get(runId:string,request:IsingQuenchRequest):Promise<IsingQuenchArtifact>{
    const {job,result,source}=await this.source(runId),path=this.path(runId,request);
    const stat=await lstat(path);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>262144)throw new Error("Invalid Ising quench sidecar file");
    const wrapper:unknown=JSON.parse(await readFile(path,"utf8"));
    if(!wrapper||typeof wrapper!=="object"||Array.isArray(wrapper))throw new Error("Invalid Ising quench sidecar");
    const record=wrapper as Record<string,unknown>;
    if(Object.keys(record).length!==3||record.schema!=="quantum-ising-quench-manifest/v1"||
      typeof record.payload!=="string"||typeof record.sha256!=="string"||
      !/^[a-f0-9]{64}$/.test(record.sha256)||hash(record.payload)!==record.sha256)
      throw new Error("Ising quench sidecar failed integrity check");
    return this.check(JSON.parse(record.payload),source,job,result,request);
  }
  async ensure(runId:string,request:IsingQuenchRequest,compute:Compute):Promise<IsingQuenchArtifact>{
    if(!isIsingQuenchRequest(request))throw new Error("Invalid bounded Ising quench request");
    const {job,result,source}=await this.source(runId);
    try{return await this.get(runId,request)}catch(error){
      if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    }
    const artifact=this.check(await compute(job,source,result,request),source,job,result,request);
    await mkdir(this.root,{recursive:true});
    const payload=JSON.stringify(artifact);
    try{await writeFile(this.path(runId,request),JSON.stringify({schema:"quantum-ising-quench-manifest/v1",sha256:hash(payload),payload})+"\n",{flag:"wx"})}
    catch(error){if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error;}
    return this.get(runId,request);
  }
}
