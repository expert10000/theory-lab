import {createHash,randomUUID} from "node:crypto";
import {mkdir,readFile,readdir,rename,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {assertHofstadterFluxStudy,type HofstadterFluxStudy} from "../../../packages/contracts/hofstadter-flux-study";
import {hofstadterFluxJob} from "../../../packages/models/hofstadter-flux-study";
import {consistentTopologyResult} from "../../../packages/models/topology";
import {SceneBuilder} from "../../../packages/quantum-scene/builder";
import type {QuantumScene} from "../../../packages/quantum-scene";
import {RunStore} from "./runs";

const hash=(value:string|Uint8Array)=>createHash("sha256").update(value).digest("hex");
const id=/^[A-Za-z0-9_-]{1,80}$/;

/** Immutable points, atomic checkpoints, and source-linked butterfly scenes. */
export class HofstadterFluxStudyStore {
  constructor(private root:string,private runs:RunStore){}
  private path(studyId:string){if(!id.test(studyId))throw new Error("Invalid flux study ID");return join(this.root,`${studyId}.json`);}
  private async verify(value:unknown):Promise<HofstadterFluxStudy>{
    assertHofstadterFluxStudy(value);
    for(const point of value.points){
      const saved=await this.runs.verified(point.runId);
      const expected=hofstadterFluxJob(value.plan,point.index),r=saved.result;
      if(saved.job.operation!=="topology"||r.operation!=="topology"||saved.data!==null||
        JSON.stringify(saved.job)!==JSON.stringify(expected)||r.model.type!=="hofstadter"||r.analysis.kind!=="hofstadter"||
        !consistentTopologyResult(expected,r)||r.runId!==point.runId||
        hash(JSON.stringify(r,null,2)+"\n")!==point.resultSha256||
        JSON.stringify(r.analysis.bandEnergies)!==JSON.stringify(point.energies)||
        JSON.stringify(r.analysis.coarseBounds)!==JSON.stringify(point.coarseBounds)||
        JSON.stringify(r.analysis.fineBounds)!==JSON.stringify(point.fineBounds)||
        JSON.stringify(r.analysis.extremaDrift)!==JSON.stringify(point.extremaDrift)||
        r.analysis.converged!==point.converged||
        JSON.stringify((r.analysis.chernGaps??[]).map(g=>({occupiedBands:g.occupiedBands,fineGap:g.fineGap,status:g.status})))!==JSON.stringify(point.gaps)||
        JSON.stringify(r.analysis.filling?{
          occupiedBands:r.analysis.filling.occupiedBands,coarseGlobalGap:r.analysis.filling.coarseGlobalGap,
          fineGlobalGap:r.analysis.filling.fineGlobalGap,gapStatus:r.analysis.filling.gapStatus,
          conductance:r.analysis.filling.conductance??null,status:r.analysis.filling.status??"mesh-unresolved"}:null)!==JSON.stringify(point.filling))
        throw new Error("Flux point failed immutable-run verification");
    }
    return value;
  }
  async get(studyId:string):Promise<HofstadterFluxStudy>{
    const m=JSON.parse(await readFile(this.path(studyId),"utf8"));
    if(m.schema!=="quantum-hofstadter-flux-manifest/v1"||typeof m.payload!=="string"||
      typeof m.sha256!=="string"||hash(m.payload)!==m.sha256)throw new Error("Flux checkpoint integrity failed");
    const value=await this.verify(JSON.parse(m.payload));
    if(value.studyId!==studyId)throw new Error("Flux study identity mismatch");return value;
  }
  async save(value:unknown):Promise<HofstadterFluxStudy>{
    const result=await this.verify(value);await mkdir(this.root,{recursive:true});
    let previous:HofstadterFluxStudy|null=null;
    try{previous=await this.get(result.studyId)}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
    if(previous&&(previous.status==="completed"||JSON.stringify(previous.plan)!==JSON.stringify(result.plan)||
      result.points.length<=previous.points.length||
      JSON.stringify(result.points.slice(0,previous.points.length))!==JSON.stringify(previous.points)))
      throw new Error("Flux checkpoint cannot replace verified history");
    const payload=JSON.stringify(result),temporary=join(this.root,`${result.studyId}.${randomUUID()}.tmp`);
    await writeFile(temporary,JSON.stringify({schema:"quantum-hofstadter-flux-manifest/v1",payload,sha256:hash(payload)})+"\n",{flag:"wx"});
    await rename(temporary,this.path(result.studyId));return result;
  }
  async list():Promise<{studyId:string;computedAt:string;count:number;status:string}[]>{
    await mkdir(this.root,{recursive:true});const rows=[];
    for(const name of await readdir(this.root))if(name.endsWith(".json")&&id.test(name.slice(0,-5))){
      try{const s=await this.get(name.slice(0,-5));rows.push({studyId:s.studyId,computedAt:s.computedAt,count:s.points.length,status:s.status});}catch{/* Hide tampered checkpoints. */}
    }
    return rows.sort((a,b)=>b.computedAt.localeCompare(a.computedAt));
  }
  async scene(studyId:string){
    const result=await this.get(studyId);
    if(result.status!=="completed")throw new Error("Complete the verified flux sweep before exporting a scene");
    const payload=JSON.stringify(result);
    const scene:QuantumScene={schema:"quantum-scene/v1",id:`${studyId}-butterfly`,title:"Hofstadter flux sweep · supplied periodic spectrum",
      provenance:{kind:"numerical-result",runId:studyId,jobId:studyId,model:"hofstadter_flux_sweep",engine:"native",
        engineVersion:"verified individual runs",computedAt:result.computedAt,resultSha256:hash(payload),adapter:"qvis/1",
        parameters:{hopping:result.plan.hopping,grid:result.plan.grid,maxDenominator:result.plan.maxDenominator,
          occupiedBands:result.plan.occupiedBands??"none"}},
      coordinates:{handedness:"right",axes:["flux p/q","energy","display depth"],
        units:["flux quanta per plaquette","hopping energy","display only"]},
      camera:{position:[1.5,-1.5,16],target:[.5,0,0],up:[0,1,0]},datasets:[],objects:[],annotations:[]};
    const builder=new SceneBuilder(scene,async bytes=>hash(bytes));
    for(const point of result.points){
      const energies=point.energies.flat();const flux=point.p/point.q;
      const positions=await builder.data(`flux-${point.index}-positions`,energies.flatMap(energy=>[flux,energy,0]),3,"flux, energy, display depth");
      const scalar=await builder.data(`flux-${point.index}-energy`,energies,1,"hopping energy");
      builder.object(`flux-${point.index}`,`Flux ${point.p}/${point.q} · ${point.q} bands`,"point-cloud",positions,
        point.filling?.status==="defined"?"#79d9c1":"#f2b36f",{scalars:scalar,style:{color:point.filling?.status==="defined"?"#79d9c1":"#f2b36f",opacity:.9,size:.06}});
      scene.annotations.push({id:`source-${point.index}`,position:[flux,-4*result.plan.hopping-.3,0],
        text:`${point.p}/${point.q} · run ${point.runId} · SHA-256 ${point.resultSha256} · S:${point.converged?"Y":"N"} · G:${point.gaps.map(g=>`${g.occupiedBands}${g.status==="defined"?"D":g.status==="gap-closed"?"C":"U"}`).join(",")||"none"} · H:${point.filling?.conductance??"undefined"} e²/h`});
    }
    return builder.finish();
  }
}
