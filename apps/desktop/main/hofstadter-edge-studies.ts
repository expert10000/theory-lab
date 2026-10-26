import {createHash,randomUUID} from "node:crypto";
import {link,mkdir,readFile,readdir,unlink,writeFile} from "node:fs/promises";
import {join} from "node:path";
import type {HofstadterAnalysis,TopologyResult} from "../../../packages/contracts";
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
    for(let i=0;i<expected.length;i++){
      const saved=await this.runs.verified(study.sources[i].runId);
      if(saved.job.operation!=="topology"||saved.result.operation!=="topology"||
        JSON.stringify(saved.job)!==JSON.stringify(expected[i])||
        hash(JSON.stringify(saved.result,null,2)+"\n")!==study.sources[i].resultSha256)
        throw new Error("Bulk/strip source failed run verification");
      results.push(saved.result);
    }
    const derived=await deriveHofstadterEdgeStudy(study.plan,results);
    for(const key of ["sources","bulk","widths","comparison","tracking","convergence"] as const)
      if(JSON.stringify(study[key])!==JSON.stringify(derived[key]))throw new Error("Bulk-edge evidence failed source verification");
    return results;
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
    if(study.tracking)for(const width of study.tracking.widths){
      const strip=(results[width.cells===18?1:2].analysis as HofstadterAnalysis).strip!;
      const positions=[] as number[],overlaps=[] as number[];
      for(const [index,crossing] of width.crossings.entries()){
        const a=crossing.interval,b=a+1,lane=4+(width.cells===18?0:.8)+(crossing.side==="right"?.3:0);
        const key=`tracked-${width.cells}-${crossing.side}-${index}`;
        const location=await builder.data(`${key}-position`,[
          strip.kyValues[a],lane,strip.energies[crossing.stateIndex][a],
          strip.kyValues[b],lane,strip.energies[crossing.targetStateIndex][b]],3,
          "rad, display lane, hopping energy");
        builder.object(key,`${width.cells} sites · ${crossing.side} overlap-validated crossing`,
          "polyline",location,crossing.side==="left"?"#44dec0":"#f9a65a");
        const energy=strip.energies[crossing.stateIndex][a]+(strip.energies[crossing.targetStateIndex][b]-
          strip.energies[crossing.stateIndex][a])*(crossing.ky-strip.kyValues[a])/(strip.kyValues[b]-strip.kyValues[a]);
        positions.push(crossing.ky,lane,energy);overlaps.push(crossing.overlap);
        scene.annotations.push({id:`track-${width.cells}-${index}`,position:[crossing.ky,lane,energy],
          text:`${width.cells} sites · ${crossing.side} · ${crossing.stateIndex}→${crossing.targetStateIndex} · interval ${a} · kᵧ ${crossing.ky} · overlap ${crossing.overlap} · margin ${crossing.margin} · run ${study.sources[width.cells===18?1:2].runId} · SHA-256 ${study.sources[width.cells===18?1:2].resultSha256}`});
      }
      if(positions.length){
        const location=await builder.data(`tracked-${width.cells}-position`,positions,3,"rad, display lane, hopping energy");
        const scalar=await builder.data(`tracked-${width.cells}-overlap`,overlaps,1,"squared eigenvector overlap");
        builder.object(`tracked-${width.cells}`,`${width.cells} sites · validated crossings`,"point-cloud",location,
          "#f5e68a",{scalars:scalar,style:{color:"#f5e68a",opacity:1,size:.12}});
      }
    }
    if(study.convergence){
      const evidence=study.convergence;
      scene.annotations.push({id:"convergence",position:[0,6.4,0],
        text:`${evidence.method} · ${evidence.status} · grids 17/31 · seam checked · drift ${evidence.maximumKyDrift??"undefined"} rad`});
      for(let i=0;i<2;i++){
        const width=evidence.widths[i],termination=evidence.terminations[i];
        scene.annotations.push({id:`termination-${width.cells}`,position:[0,6.4,0],
          text:`${width.cells} sites · origin ${termination.origin} · left phase ${termination.leftPhase} · right phase ${termination.rightPhase} (mod ${study.plan.q})`});
        for(const [grid,stripIndex,crossings] of [[17,i+3,width.coarseCrossings],
          [31,i+1,width.fineCrossings]] as const){
          const strip=(results[stripIndex].analysis as HofstadterAnalysis).strip!;
          const positions=[] as number[],overlaps=[] as number[];
          for(const [index,crossing] of crossings.entries()){
            const lane=6.8+i*.8+(grid===31?.35:0);
            positions.push(crossing.ky,lane,study.bulk.fermiEnergy??0);overlaps.push(crossing.overlap);
            scene.annotations.push({id:`grid-${grid}-${width.cells}-${index}`,
              position:[crossing.ky,lane,study.bulk.fermiEnergy??0],
              text:`${grid} k samples · ${width.cells} sites · ${crossing.side} · interval ${crossing.interval} · kᵧ ${crossing.ky} · overlap ${crossing.overlap} · source ${study.sources[stripIndex].role}`});
          }
          if(positions.length){
            const key=`grid-${grid}-${width.cells}`;
            const location=await builder.data(`${key}-position`,positions,3,"rad, display lane, hopping energy");
            const scalar=await builder.data(`${key}-overlap`,overlaps,1,"squared eigenvector overlap");
            builder.object(key,`${width.cells} sites · ${grid}-point tracked crossings`,"point-cloud",location,
              grid===17?"#e9a3f5":"#f5e68a",{scalars:scalar,
                style:{color:grid===17?"#e9a3f5":"#f5e68a",opacity:1,size:.14}});
          }
          scene.annotations.push({id:`seam-${grid}-${width.cells}`,position:[0,6.4,0],
            text:`${grid} k samples · ${width.cells} sites · periodic seam · minimum overlap ${(grid===17?width.coarseSeam:width.fineSeam)?.minimumOverlap??"unavailable"} · ambiguous states ${(grid===17?width.coarseSeam:width.fineSeam)?.ambiguousStates??"unavailable"} · ${strip.kyValues[0]} to ${strip.kyValues.at(-1)}`});
        }
      }
    }
    scene.annotations.push({id:"comparison",position:[0,5.7,0],text:`${study.comparison.status}: ${study.comparison.reason}`});
    if(study.tracking)scene.annotations.push({id:"tracking",position:[0,5.7,0],
      text:`${study.tracking.method} · ${study.tracking.status}: ${study.tracking.reason} · ambiguous candidates ${study.tracking.widths.map(w=>`${w.cells}:${w.ambiguousCandidates}`).join(", ")}`});
    for(const source of study.sources)scene.annotations.push({id:source.role,position:[0,5.7,0],
      text:`${source.role} · run ${source.runId} · SHA-256 ${source.resultSha256}`});
    return builder.finish();
  }
}
