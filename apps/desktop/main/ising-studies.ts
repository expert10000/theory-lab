import {createHash,randomUUID} from "node:crypto";
import {mkdir,readFile,readdir,rename,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {isIsingStudyResult,type IsingStudyResult,type IsingStudySummary} from "../../../packages/contracts/ising-study";
import {isingStudyJob,isingStudyPointMatchesPlan} from "../../../packages/models/ising-study";
import {RunStore} from "./runs";

const validId=/^[A-Za-z0-9_-]{1,80}$/;
const digest=(text:string)=>createHash("sha256").update(text).digest("hex");

/** Atomic checkpoints over immutable, independently hash-verified Ising runs. */
export class IsingStudyStore {
  constructor(private readonly root:string,private readonly runs:RunStore){}
  private path(studyId:string){
    if(!validId.test(studyId))throw new Error("Invalid Ising study ID");
    return join(this.root,`${studyId}.json`);
  }
  private async verify(value:unknown):Promise<IsingStudyResult>{
    if(!isIsingStudyResult(value))throw new Error("Invalid Ising study result");
    for(const point of value.points){
      if(!isingStudyPointMatchesPlan(value.plan,point))throw new Error("Ising study point disagrees with plan");
      const saved=await this.runs.verified(point.runId).catch(()=>{
        throw new Error("Ising study point has invalid saved-run lineage");
      });
      const expected=isingStudyJob(value.plan,point.index);
      const sameModel=(actual:typeof expected.model)=>{
        const a=actual.parameters,b=expected.model.parameters;
        return actual.type===expected.model.type&&a.sites===b.sites&&a.interaction===b.interaction&&
          a.transverse===b.transverse&&a.longitudinal===b.longitudinal&&a.boundary===b.boundary;
      };
      if(saved.job.operation!=="many_body"||saved.result.operation!=="many_body"||saved.data!==null||
        saved.job.schema!==expected.schema||saved.job.jobId!==expected.jobId||saved.job.engine!==expected.engine||
        !sameModel(saved.job.model)||saved.result.jobId!==expected.jobId||
        saved.result.runId!==point.runId||saved.result.engine.name!==expected.engine||
        !sameModel(saved.result.model)||
        JSON.stringify(saved.result.spectrum.lowEnergies)!==JSON.stringify(point.lowEnergies)||
        saved.result.spectrum.gap!==point.gap||saved.result.spectrum.units!=="normalized"||saved.result.spectrum.hbar!==1||
        JSON.stringify(saved.result.groundState.siteMagnetization)!==JSON.stringify(point.siteMagnetization)||
        saved.result.groundState.halfChainEntropy!==point.halfChainEntropy)
        throw new Error("Ising study point has invalid saved-run lineage");
    }
    return value;
  }
  async get(studyId:string):Promise<IsingStudyResult>{
    const record:unknown=JSON.parse(await readFile(this.path(studyId),"utf8"));
    if(!record||typeof record!=="object"||Array.isArray(record))throw new Error("Invalid Ising study manifest");
    const manifest=record as Record<string,unknown>;
    if(manifest.schema!=="quantum-ising-study-manifest/v1"||typeof manifest.payload!=="string"||
      typeof manifest.sha256!=="string"||!/^[a-f0-9]{64}$/.test(manifest.sha256)||digest(manifest.payload)!==manifest.sha256)
      throw new Error("Ising study manifest failed integrity check");
    const value=await this.verify(JSON.parse(manifest.payload));
    if(value.studyId!==studyId)throw new Error("Ising study ID mismatch");
    return value;
  }
  async save(value:unknown):Promise<IsingStudyResult>{
    const result=await this.verify(value);
    await mkdir(this.root,{recursive:true});
    let previous:IsingStudyResult|null=null;
    try{previous=await this.get(result.studyId)}
    catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
    if(previous&&(previous.status==="completed"||JSON.stringify(previous.plan)!==JSON.stringify(result.plan)||
      result.points.length<previous.points.length||
      JSON.stringify(result.points.slice(0,previous.points.length))!==JSON.stringify(previous.points)))
      throw new Error("Ising study checkpoint cannot replace verified history");
    const payload=JSON.stringify(result);
    const temporary=join(this.root,`${result.studyId}.${randomUUID()}.tmp`);
    await writeFile(temporary,JSON.stringify({schema:"quantum-ising-study-manifest/v1",sha256:digest(payload),payload})+"\n",{flag:"wx"});
    await rename(temporary,this.path(result.studyId));
    return result;
  }
  async list():Promise<IsingStudySummary[]>{
    await mkdir(this.root,{recursive:true});
    const summaries:IsingStudySummary[]=[];
    for(const entry of await readdir(this.root)){
      if(!entry.endsWith(".json")||!validId.test(entry.slice(0,-5)))continue;
      try{
        const result=await this.get(entry.slice(0,-5));
        summaries.push({studyId:result.studyId,engine:result.plan.engine,sites:result.plan.fixed.sites,
          interaction:result.plan.fixed.interaction,boundary:result.plan.fixed.boundary,
          start:result.plan.axis.start,stop:result.plan.axis.stop,status:result.status,
          completedPoints:result.points.length,totalPoints:result.plan.axis.points,computedAt:result.computedAt});
      }catch{/* Incomplete or tampered studies are not listed as saved. */}
    }
    return summaries.sort((a,b)=>b.computedAt.localeCompare(a.computedAt));
  }
}
