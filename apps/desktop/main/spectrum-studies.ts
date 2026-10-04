import {createHash,randomUUID} from "node:crypto";
import {mkdir,readFile,readdir,rename,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {isSpectrumStudyResult,type SpectrumStudyResult,type SpectrumStudySummary} from "../../../packages/contracts/spectrum-study";
import {isSpectrumOmegaStudyResult,type SpectrumOmegaStudyResult,type SpectrumOmegaStudySummary} from "../../../packages/contracts/spectrum-omega-study";
import type {SpectrumJob} from "../../../packages/contracts";
import {studyPointMatchesPlan} from "../../../packages/models/spectrum-study";
import {omegaStudyJob,omegaStudyPointMatchesPlan} from "../../../packages/models/spectrum-omega-study";
import {RunStore} from "./runs";

const validId=/^[A-Za-z0-9_-]{1,80}$/;
const digest=(value:string)=>createHash("sha256").update(value).digest("hex");
type Result=SpectrumStudyResult|SpectrumOmegaStudyResult;
type Summary=SpectrumStudySummary|SpectrumOmegaStudySummary;

/** An atomic, progressively updated manifest over existing immutable run records. */
export class SpectrumStudyStore {
  constructor(private readonly root:string,private readonly runs:RunStore){}
  private path(studyId:string){
    if(!validId.test(studyId))throw new Error("Invalid spectrum study ID");
    return join(this.root,`${studyId}.json`);
  }
  private async verify(value:unknown):Promise<Result>{
    if(!isSpectrumStudyResult(value)&&!isSpectrumOmegaStudyResult(value))throw new Error("Invalid spectrum study result");
    if(value.status==="cancelled"&&value.points.length===value.plan.axis.points)
      throw new Error("Complete study cannot be cancelled");
    if(value.schema==="quantum-spectrum-study-result/v1"){
      for(const point of value.points){
        if(!studyPointMatchesPlan(value.plan,point))throw new Error("Spectrum study point disagrees with plan");
        const saved=await this.runs.spectrum(point.runId).catch(()=>{
          throw new Error("Spectrum study point has invalid saved-run lineage");
        });
        const expected:SpectrumJob={schema:"quantum-job/v1",jobId:`${value.studyId}-${point.index}`,
          operation:"diagonalize",engine:value.plan.engine,
          model:{type:"two_level",parameters:{delta:point.delta,omega:value.plan.fixed.omega}}};
        if(saved.jobId!==expected.jobId||saved.engine.name!==expected.engine||
          JSON.stringify(saved.model)!==JSON.stringify(expected.model)||
          JSON.stringify(saved.spectrum.eigenvalues)!==JSON.stringify(point.eigenvalues))
          throw new Error("Spectrum study point has invalid saved-run lineage");
      }
    }else{
      for(const point of value.points){
        if(!omegaStudyPointMatchesPlan(value.plan,point))throw new Error("Ω study point disagrees with plan");
        const saved=await this.runs.verified(point.runId).catch(()=>{
          throw new Error("Ω study point has invalid saved-run lineage");
        });
        const expected=omegaStudyJob(value.plan,point.index);
        if(saved.job.operation!=="diagonalize"||saved.result.operation!=="diagonalize"||saved.data!==null||
          saved.job.schema!==expected.schema||saved.job.jobId!==expected.jobId||saved.job.engine!==expected.engine||
          saved.job.model.type!=="two_level"||saved.job.model.parameters.delta!==expected.model.parameters.delta||
          saved.job.model.parameters.omega!==expected.model.parameters.omega||
          saved.result.jobId!==expected.jobId||saved.result.runId!==point.runId||
          saved.result.engine.name!==expected.engine||saved.result.model.type!=="two_level"||
          saved.result.model.parameters.delta!==expected.model.parameters.delta||
          saved.result.model.parameters.omega!==expected.model.parameters.omega||
          JSON.stringify(saved.result.spectrum.eigenvalues)!==JSON.stringify(point.eigenvalues))
          throw new Error("Ω study point has invalid saved-run lineage");
      }
    }
    return value;
  }
  async get(studyId:string):Promise<Result>{
    const record:unknown=JSON.parse(await readFile(this.path(studyId),"utf8"));
    if(!record||typeof record!=="object"||Array.isArray(record))throw new Error("Invalid spectrum study manifest");
    const manifest=record as Record<string,unknown>;
    if(manifest.schema!=="quantum-spectrum-study-manifest/v1"||
      typeof manifest.payload!=="string"||typeof manifest.sha256!=="string"||
      !/^[a-f0-9]{64}$/.test(manifest.sha256)||digest(manifest.payload)!==manifest.sha256)
      throw new Error("Spectrum study manifest failed integrity check");
    const value=await this.verify(JSON.parse(manifest.payload));
    if(value.studyId!==studyId)throw new Error("Spectrum study ID mismatch");
    return value;
  }
  async save(value:unknown):Promise<Result>{
    const result=await this.verify(value);
    await mkdir(this.root,{recursive:true});
    let previous:Result|null=null;
    try{previous=await this.get(result.studyId)}
    catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
    if(previous){
      if(previous.status==="completed"||JSON.stringify(previous.plan)!==JSON.stringify(result.plan)||
        result.points.length<previous.points.length||
        JSON.stringify(result.points.slice(0,previous.points.length))!==JSON.stringify(previous.points))
        throw new Error("Spectrum study checkpoint cannot replace verified history");
    }
    const payload=JSON.stringify(result);
    const manifest={schema:"quantum-spectrum-study-manifest/v1",sha256:digest(payload),payload};
    const temporary=join(this.root,`${result.studyId}.${randomUUID()}.tmp`);
    await writeFile(temporary,JSON.stringify(manifest)+"\n",{flag:"wx"});
    await rename(temporary,this.path(result.studyId));
    return result;
  }
  async list():Promise<Summary[]>{
    await mkdir(this.root,{recursive:true});
    const entries=await readdir(this.root);
    const summaries:Summary[]=[];
    for(const entry of entries){
      if(!entry.endsWith(".json")||!validId.test(entry.slice(0,-5)))continue;
      try{
        const result=await this.get(entry.slice(0,-5));
        if(result.schema==="quantum-spectrum-study-result/v1")
          summaries.push({studyId:result.studyId,engine:result.plan.engine,
            fixedOmega:result.plan.fixed.omega,deltaStart:result.plan.axis.start,
            deltaStop:result.plan.axis.stop,output:result.plan.output,status:result.status,
            completedPoints:result.points.length,totalPoints:result.plan.axis.points,computedAt:result.computedAt});
        else summaries.push({studyId:result.studyId,engine:result.plan.engine,
          fixedDelta:result.plan.fixed.delta,omegaStart:result.plan.axis.start,
          omegaStop:result.plan.axis.stop,output:result.plan.output,status:result.status,
          completedPoints:result.points.length,totalPoints:result.plan.axis.points,computedAt:result.computedAt});
      }catch{/* An incomplete or tampered study is not advertised as saved. */}
    }
    return summaries.sort((a,b)=>b.computedAt.localeCompare(a.computedAt));
  }
}
