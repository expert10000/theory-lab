import {createHash,randomUUID} from "node:crypto";
import {link,mkdir,readFile,readdir,unlink,writeFile} from "node:fs/promises";
import {join} from "node:path";
import type {TopologyResult} from "../../../packages/contracts";
import {assertRiceMeleConvergenceStudy,type RiceMeleConvergenceStudy} from "../../../packages/contracts/rice-mele-convergence";
import {deriveRiceMeleConvergenceStudy} from "../../../packages/models/rice-mele-convergence";
import {consistentTopologyResult} from "../../../packages/models/topology";
import {RunStore} from "./runs";

const hash=(value:string|Uint8Array)=>createHash("sha256").update(value).digest("hex");
const id=/^[A-Za-z0-9_-]{1,80}$/;
export class RiceMeleConvergenceStudyStore {
  constructor(private root:string,private runs:RunStore){}
  private path(studyId:string){if(!id.test(studyId))throw new Error("Invalid Rice–Mele study ID");return join(this.root,`${studyId}.json`);}
  private async verified(study:RiceMeleConvergenceStudy):Promise<TopologyResult[]>{
    assertRiceMeleConvergenceStudy(study);
    const results:TopologyResult[]=[];
    for(const source of study.sources){
      const saved=await this.runs.verified(source.runId);
      if(saved.job.operation!=="topology"||saved.result.operation!=="topology"||
        saved.job.model.type!=="rice_mele_pump"||saved.result.model.type!=="rice_mele_pump"||
        !consistentTopologyResult(saved.job,saved.result)||saved.data!==null||
        hash(JSON.stringify(saved.result,null,2)+"\n")!==source.resultSha256)
        throw new Error("Rice–Mele source failed saved-run verification");
      results.push(saved.result);
    }
    const derived=await deriveRiceMeleConvergenceStudy(study.plan,results,study.computedAt);
    if(JSON.stringify(derived)!==JSON.stringify(study))throw new Error("Rice–Mele study evidence failed source verification");
    return results;
  }
  async save(value:unknown):Promise<RiceMeleConvergenceStudy>{
    assertRiceMeleConvergenceStudy(value);await this.verified(value);await mkdir(this.root,{recursive:true});
    const payload=JSON.stringify(value),destination=this.path(value.studyId),temporary=join(this.root,`${value.studyId}.${randomUUID()}.tmp`);
    await writeFile(temporary,JSON.stringify({schema:"quantum-rice-mele-convergence-manifest/v1",payload,sha256:hash(payload)})+"\n",{flag:"wx"});
    try{await link(temporary,destination);return value;}
    catch(error){if((error as NodeJS.ErrnoException).code==="EEXIST")throw new Error("Rice–Mele study already exists and is immutable");throw error;}
    finally{await unlink(temporary);}
  }
  async get(studyId:string):Promise<RiceMeleConvergenceStudy>{
    const manifest=JSON.parse(await readFile(this.path(studyId),"utf8"));
    if(manifest.schema!=="quantum-rice-mele-convergence-manifest/v1"||typeof manifest.payload!=="string"||
      typeof manifest.sha256!=="string"||hash(manifest.payload)!==manifest.sha256)throw new Error("Rice–Mele study integrity failed");
    const study:unknown=JSON.parse(manifest.payload);assertRiceMeleConvergenceStudy(study);
    if(study.studyId!==studyId)throw new Error("Rice–Mele study identity mismatch");
    await this.verified(study);return study;
  }
  async list():Promise<{studyId:string;computedAt:string;count:number}[]>{
    await mkdir(this.root,{recursive:true});const rows=[];
    for(const name of await readdir(this.root))if(name.endsWith(".json")&&id.test(name.slice(0,-5))){
      try{const s=await this.get(name.slice(0,-5));rows.push({studyId:s.studyId,computedAt:s.computedAt,count:s.sources.length});}
      catch{/* Missing or changed sources are unavailable. */}
    }
    return rows.sort((a,b)=>b.computedAt.localeCompare(a.computedAt));
  }
}
