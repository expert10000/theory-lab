import {createHash,randomUUID} from "node:crypto";
import {link,mkdir,readFile,readdir,unlink,writeFile} from "node:fs/promises";
import {join} from "node:path";
import type {TopologyResult} from "../../../packages/contracts";
import {assertHofstadterEdgeStudy,type HofstadterEdgeStudy} from "../../../packages/contracts/hofstadter-edge-study";
import {deriveHofstadterEdgeStudy,hofstadterEdgeJobs} from "../../../packages/models/hofstadter-edge-study";
import {SceneBuilder} from "../../../packages/quantum-scene/builder";
import type {QuantumScene} from "../../../packages/quantum-scene";
import {RunStore} from "./runs";

const hash=(value:string|Uint8Array)=>createHash("sha256").update(value).digest("hex");
const id=/^[A-Za-z0-9_-]{1,80}$/;
export class HofstadterEdgeStudyStore{
  constructor(private root:string,private runs:RunStore){}
  private path(studyId:string){if(!id.test(studyId))throw new Error("Invalid edge study ID");return join(this.root,`${studyId}.json`);}
  private async verified(study:HofstadterEdgeStudy){
    assertHofstadterEdgeStudy(study);
    const expected=hofstadterEdgeJobs(study.plan),results=[] as TopologyResult[];
    for(let i=0;i<3;i++){
      const saved=await this.runs.verified(study.sources[i].runId);
      if(saved.job.operation!=="topology"||saved.result.operation!=="topology"||
        JSON.stringify(saved.job)!==JSON.stringify(expected[i])||
        hash(JSON.stringify(saved.result,null,2)+"\n")!==study.sources[i].resultSha256)
        throw new Error("Bulk/strip source failed run verification");
      results.push(saved.result);
    }
    const derived=await deriveHofstadterEdgeStudy(study.plan,results as [TopologyResult,TopologyResult,TopologyResult]);
    for(const key of ["sources","bulk","widths","comparison"] as const)
      if(JSON.stringify(study[key])!==JSON.stringify(derived[key]))throw new Error("Bulk-edge evidence failed source verification");
    return results as [TopologyResult,TopologyResult,TopologyResult];
  }
  async save(value:unknown):Promise<HofstadterEdgeStudy>{
    assertHofstadterEdgeStudy(value);await this.verified(value);await mkdir(this.root,{recursive:true});
    const payload=JSON.stringify(value),destination=this.path(value.studyId),temporary=join(this.root,`${value.studyId}.${randomUUID()}.tmp`);
    await writeFile(temporary,JSON.stringify({schema:"quantum-hofstadter-edge-manifest/v1",payload,sha256:hash(payload)})+"\n",{flag:"wx"});
    try{
      await link(temporary,destination);return value;
    }catch(error){
      if((error as NodeJS.ErrnoException).code==="EEXIST")throw new Error("Edge study already exists and is immutable");
      throw error;
    }finally{await unlink(temporary);}
  }
  async get(studyId:string):Promise<HofstadterEdgeStudy>{
    const manifest=JSON.parse(await readFile(this.path(studyId),"utf8"));
    if(manifest.schema!=="quantum-hofstadter-edge-manifest/v1"||typeof manifest.payload!=="string"||
      typeof manifest.sha256!=="string"||hash(manifest.payload)!==manifest.sha256)throw new Error("Edge study integrity failed");
    const study:unknown=JSON.parse(manifest.payload);assertHofstadterEdgeStudy(study);
    if(study.studyId!==studyId)throw new Error("Edge study identity mismatch");
    await this.verified(study);return study;
  }
  async list():Promise<{studyId:string;computedAt:string;status:string}[]>{
    await mkdir(this.root,{recursive:true});const rows=[];
    for(const name of await readdir(this.root))if(name.endsWith(".json")&&id.test(name.slice(0,-5))){
      try{const study=await this.get(name.slice(0,-5));rows.push({studyId:study.studyId,computedAt:study.computedAt,
        status:study.comparison.status});}catch{/* Changed or missing source is unavailable. */}
    }
    return rows.sort((a,b)=>b.computedAt.localeCompare(a.computedAt));
  }
  async scene(studyId:string){
    const study=await this.get(studyId),results=await this.verified(study),bulk=results[0].analysis;
    if(bulk.kind!=="hofstadter")throw new Error("Bulk source mismatch");
    const scene:QuantumScene={schema:"quantum-scene/v1",id:`${studyId}-edge`,
      title:"Hofstadter · supplied bulk and finite-strip comparison",
      provenance:{kind:"numerical-result",runId:studyId,jobId:studyId,model:"hofstadter_bulk_edge_study",
        engine:"native",engineVersion:"verified independent runs",computedAt:study.computedAt,
        resultSha256:hash(JSON.stringify(study)),adapter:"qvis/1",
        parameters:{p:study.plan.p,q:study.plan.q,hopping:study.plan.hopping,grid:study.plan.grid,
          occupiedBands:study.plan.occupiedBands,stripSamples:study.plan.stripSamples}},
      coordinates:{handedness:"right",axes:["bulk kx / strip ky","bulk ky / strip display lane","energy"],
        units:["rad / lattice constant","rad or display only","hopping energy"]},
      camera:{position:[7,-9,12],target:[0,1,0],up:[0,0,1]},datasets:[],objects:[],annotations:[]};
    const builder=new SceneBuilder(scene,async bytes=>hash(bytes));
    for(let band=0;band<study.plan.q;band++){
      const values=bulk.bandEnergies[band],positions=[] as number[];
      for(let x=0;x<bulk.kxValues.length;x++)for(let y=0;y<bulk.kyValues.length;y++)
        positions.push(bulk.kxValues[x],bulk.kyValues[y],values[x*bulk.kyValues.length+y]);
      const location=await builder.data(`bulk-${band}-position`,positions,3,"rad, rad, hopping energy");
      const scalar=await builder.data(`bulk-${band}-energy`,values,1,"hopping energy");
      builder.object(`bulk-${band}`,`Bulk band ${band}`,"point-cloud",location,"#80abd9",
        {scalars:scalar,style:{color:"#80abd9",opacity:.7,size:.045}});
    }
    for(let width=0;width<2;width++){
      const analysis=results[width+1].analysis;if(analysis.kind!=="hofstadter"||!analysis.strip)throw new Error("Strip source mismatch");
      const strip=analysis.strip;
      for(const side of ["left","right"] as const){
        const weights=side==="left"?strip.leftWeights:strip.rightWeights;
        const values=weights.flat(),positions=[] as number[],lane=4+width*.8+(side==="right"?.3:0);
        for(let state=0;state<strip.cells;state++)for(let k=0;k<strip.kyValues.length;k++)
          positions.push(strip.kyValues[k],lane,strip.energies[state][k]);
        const key=`strip-${strip.cells}-${side}`;
        const location=await builder.data(`${key}-position`,positions,3,"rad, display lane, hopping energy");
        const scalar=await builder.data(`${key}-weight`,values,1,"boundary probability");
        builder.object(key,`${strip.cells} sites · ${side} boundary weight`,"point-cloud",location,
          side==="left"?"#79d9c1":"#f2b36f",{scalars:scalar,
            style:{color:side==="left"?"#79d9c1":"#f2b36f",opacity:.8,size:.035}});
      }
    }
    scene.annotations.push({id:"comparison",position:[0,5.7,0],text:`${study.comparison.status}: ${study.comparison.reason}`});
    for(const source of study.sources)scene.annotations.push({id:source.role,position:[0,5.7,0],
      text:`${source.role} · run ${source.runId} · SHA-256 ${source.resultSha256}`});
    return builder.finish();
  }
}
