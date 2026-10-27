import {createHash,randomUUID} from "node:crypto";
import {link,mkdir,readFile,readdir,unlink,writeFile} from "node:fs/promises";
import {join} from "node:path";
import type {TopologyResult} from "../../../packages/contracts";
import {assertRiceMeleConvergenceStudy,type RiceMeleConvergenceStudy} from "../../../packages/contracts/rice-mele-convergence";
import {deriveRiceMeleConvergenceStudy} from "../../../packages/models/rice-mele-convergence";
import {consistentTopologyResult} from "../../../packages/models/topology";
import {SceneBuilder} from "../../../packages/quantum-scene/builder";
import type {QuantumScene} from "../../../packages/quantum-scene";
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
  async scene(studyId:string){
    const study=await this.get(studyId);
    const scene:QuantumScene={schema:"quantum-scene/v1",id:`${studyId.slice(0,60)}-convergence`,
      title:"Rice–Mele · separate periodic and finite-chain convergence series",
      provenance:{kind:"numerical-result",runId:studyId,jobId:studyId,
        model:"rice_mele_convergence_study",engine:"native",engineVersion:"verified saved runs",
        computedAt:study.computedAt,resultSha256:hash(JSON.stringify(study)),adapter:"qvis/1",
        parameters:{...study.cycle,sourceCount:study.sources.length}},
      coordinates:{handedness:"right",axes:["normalized independent variable","series lane","normalized display value"],
        units:["display only","display only","display only"]},
      camera:{position:[2,-4,3],target:[.5,.5,.5],up:[0,0,1]},datasets:[],objects:[],annotations:[]};
    const builder=new SceneBuilder(scene,async bytes=>hash(bytes));
    const byId=new Map(study.sources.map(source=>[source.runId,source]));
    for(const [series,ids,lane] of [["periodic",study.durationRuns,0],["chain",study.widthRuns,1]] as const){
      const points=ids.map(id=>byId.get(id)!);
      const independent=points.map(p=>series==="periodic"?p.duration:p.chainCells);
      const charges=points.map(p=>series==="periodic"?p.periodicCharge:p.chainCentralBondCharge);
      const x0=Math.min(...independent),x1=Math.max(...independent),z0=Math.min(...charges),z1=Math.max(...charges);
      const positions=points.flatMap((p,i)=>[
        (independent[i]-x0)/(x1-x0||1),lane,(charges[i]-z0)/(z1-z0||1)]);
      const location=await builder.data(`${series}-position`,positions,3,"normalized display position");
      const values=await builder.data(`${series}-recorded-charge`,charges,1,
        series==="periodic"?study.units.periodicCharge:study.units.chainCentralBondCharge);
      builder.object(`${series}-points`,series==="periodic"?"Periodic charge versus duration":"Open-chain central-bond charge versus width",
        "point-cloud",location,series==="periodic"?"#79d9c1":"#f2b36f",
        {scalars:values,style:{color:series==="periodic"?"#79d9c1":"#f2b36f",opacity:1,size:.12}});
      builder.object(`${series}-line`,`${series} recorded-point connection`,"polyline",location,
        series==="periodic"?"#79d9c1":"#f2b36f");
      points.forEach((p,i)=>{
        const position:[number,number,number]=[positions[3*i],lane,positions[3*i+2]];
        scene.annotations.push({id:`${series}-${i}`,position,
          text:series==="periodic"?
            `Periodic · duration ${p.duration} inverse hopping energy · charge ${p.periodicCharge} electron charge / cell · ${p.periodicStatus} · step drift ${p.bulkTimeStepDrift} · momentum drift ${p.bulkMomentumDrift} · norm drift ${p.bulkNormDrift}`:
            `Chain · width ${p.chainCells} cells · central-bond charge ${p.chainCentralBondCharge} electron charge · ${p.chainStatus} · continuity ${p.chainContinuityResidual} · width drift ${p.chainWidthDrift} · step drift ${p.chainTimeStepDrift}`});
        scene.annotations.push({id:`${series}-${i}-source`,position,
          text:`Run ${p.runId} · result SHA-256 ${p.resultSha256}`});
      });
    }
    scene.annotations.push({id:"scope",position:[0,1.5,0],
      text:"Two separately labeled recorded observables. Display positions are normalized for layout only; no equal-limit or extrapolation claim."});
    return builder.finish();
  }
}
