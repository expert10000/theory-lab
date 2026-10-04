import {createHash,randomUUID} from "node:crypto";
import {lstat,mkdir,readFile,rename,writeFile} from "node:fs/promises";
import {join} from "node:path";
import type {ManyBodyJob,ManyBodyResult} from "../../../packages/contracts";
import {isIsingStateArtifact,type IsingStateArtifact,type IsingStateSource} from "../../../packages/contracts/ising-state";
import {RunStore} from "./runs";

const identifier=/^[A-Za-z0-9_-]{1,100}$/;
const hash=(text:string)=>createHash("sha256").update(text).digest("hex");
type Compute=(job:ManyBodyJob,source:IsingStateSource)=>Promise<unknown>;

/** An independent, hash-wrapped cache bound to one already verified Ising run. */
export class IsingStateStore {
  constructor(private readonly root:string,private readonly runs:RunStore){}
  private path(runId:string){
    if(!identifier.test(runId))throw new Error("Invalid Ising source run ID");
    return join(this.root,`${runId}.json`);
  }
  private async source(runId:string){
    const [inspected,result]=await Promise.all([this.runs.inspect(runId),this.runs.manyBody(runId)]);
    const job=inspected.job;
    if(job.operation!=="many_body"||result.runId!==runId||job.engine!==result.engine.name||
      JSON.stringify(job.model)!==JSON.stringify(result.model))throw new Error("Invalid Ising source lineage");
    return {job,result,source:{runId,jobSha256:inspected.hashes.job,resultSha256:inspected.hashes.result}};
  }
  private check(value:unknown,source:IsingStateSource,job:ManyBodyJob,result:ManyBodyResult):IsingStateArtifact{
    if(!isIsingStateArtifact(value)||JSON.stringify(value.source)!==JSON.stringify(source)||
      value.engine!==job.engine||value.sites!==job.model.parameters.sites||
      Math.abs(value.groundEnergy-result.spectrum.lowEnergies[0])>1e-7||
      Math.abs(value.gap-result.spectrum.gap)>1e-7||
      (value.status==="resolved")!==(value.gap>value.degeneracyThreshold)||
      value.residual>1e-7)throw new Error("Ising state artifact disagrees with verified source run");
    if(value.status==="resolved"&&value.siteMagnetization&&value.cutEntropy){
      if(value.siteMagnetization.some((number,i)=>Math.abs(number-result.groundState.siteMagnetization[i])>1e-7)||
        Math.abs(value.cutEntropy[Math.floor(value.sites/2)-1]-result.groundState.halfChainEntropy)>1e-7)
        throw new Error("Ising state observables disagree with verified source run");
    }
    return value;
  }
  async get(runId:string):Promise<IsingStateArtifact>{
    const {job,result,source}=await this.source(runId),path=this.path(runId);
    const stat=await lstat(path);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)throw new Error("Invalid Ising state sidecar file");
    const wrapper:unknown=JSON.parse(await readFile(path,"utf8"));
    if(!wrapper||typeof wrapper!=="object"||Array.isArray(wrapper))throw new Error("Invalid Ising state sidecar");
    const record=wrapper as Record<string,unknown>;
    if(Object.keys(record).length!==3||record.schema!=="quantum-ising-state-manifest/v1"||
      typeof record.payload!=="string"||typeof record.sha256!=="string"||
      !/^[a-f0-9]{64}$/.test(record.sha256)||hash(record.payload)!==record.sha256)
      throw new Error("Ising state sidecar failed integrity check");
    return this.check(JSON.parse(record.payload),source,job,result);
  }
  async ensure(runId:string,compute:Compute):Promise<IsingStateArtifact>{
    const {job,result,source}=await this.source(runId);
    try{return await this.get(runId)}catch(error){
      if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    }
    const calculated=this.check(await compute(job,source),source,job,result);
    await mkdir(this.root,{recursive:true});
    const payload=JSON.stringify(calculated),temporary=join(this.root,`${runId}.${randomUUID()}.tmp`);
    await writeFile(temporary,JSON.stringify({schema:"quantum-ising-state-manifest/v1",sha256:hash(payload),payload})+"\n",{flag:"wx"});
    try{await rename(temporary,this.path(runId))}catch(error){
      // A concurrent request may have completed first; never overwrite or trust blindly.
      await import("node:fs/promises").then(fs=>fs.unlink(temporary)).catch(()=>{});
      throw error;
    }
    return this.get(runId);
  }
}
