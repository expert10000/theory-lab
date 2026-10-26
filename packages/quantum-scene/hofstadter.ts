import type { QuantumResult } from "../contracts";
import { consistentTopologyResult } from "../models/topology";
import { SceneBuilder } from "./builder";
import type { QuantumScene } from "./index";

/** Exact stored magnetic Bloch samples; Math3D only displays them. */
export async function hofstadterSceneFromResult(result: QuantumResult, resultSha256: string,
  digest: (bytes: Uint8Array) => Promise<string>) {
  if (result.operation !== "topology" || result.model.type !== "hofstadter" ||
      result.analysis.kind !== "hofstadter" ||
      !consistentTopologyResult({schema:"quantum-job/v1",jobId:result.jobId,operation:"topology",
        engine:"native",model:result.model},result))
    throw new Error("Hofstadter scene requires a consistent verified run");
  const p=result.model.parameters,a=result.analysis,g=p.grid;
  const source=result.model.source?.sourceRepository?.match(/^(https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)\/tree\/([a-f0-9]{40})$/);
  const span=4*p.hopping;
  const scene:QuantumScene={schema:"quantum-scene/v1",id:`${result.runId}-hofstadter`,
    title:`Harper bands · flux ${p.p}/${p.q}`,
    provenance:{kind:"numerical-result",runId:result.runId,jobId:result.jobId,model:result.model.type,
      engine:result.engine.name,engineVersion:result.engine.version,computedAt:result.provenance.computedAt,
      resultSha256,adapter:"qvis/1",parameters:{...p},
      ...(source?{source:{repository:source[1],revision:source[2],entryId:"hofstadter"}}:{})},
    coordinates:{handedness:"right",axes:["kx","ky","energy"],
      units:[a.units.momentum,a.units.momentum,a.units.energy]},
    camera:{position:[3*Math.PI/p.q,-7,span*2],target:[0,0,0],up:[0,0,1]},
    datasets:[],objects:[],annotations:[
      {id:"scope",text:`Square-lattice Harper spectrum · flux ${p.p}/${p.q} · ${p.q} magnetic bands · no Chern numbers or edge spectra`,position:[0,0,span*1.2]},
      {id:"sampling",text:`${g}×${g} saved k grid; coarse/fine extrema drift ${Math.max(...a.extremaDrift).toPrecision(4)} ${a.units.energy} (${a.converged?"within":"outside"} sampling target)`,position:[0,0,-span*1.2]}]};
  const builder=new SceneBuilder(scene,digest);
  const coordinates=await builder.data("magnetic-k",a.kxValues.flatMap(kx=>a.kyValues.flatMap(ky=>[kx,ky,0])),3,a.units.momentum);
  const triangles:number[]=[];
  for(let x=0;x<g-1;x++)for(let y=0;y<g-1;y++){
    const i=x*g+y;triangles.push(i,i+g,i+1,i+1,i+g,i+g+1);
  }
  const indices=await builder.data("grid-triangles",triangles,3,"vertex index");
  const energies:string[]=[],objects:string[]=[],labels:string[]=[];
  for(const band of a.bandIndices){
    const values=a.bandEnergies[band],id=`band-${band}`;
    const positions=await builder.data(`${id}-positions`,a.kxValues.flatMap((kx,x)=>a.kyValues.flatMap((ky,y)=>[kx,ky,values[x*g+y]])),3,"kx, ky, energy");
    const energy=await builder.data(`${id}-energy`,values,1,a.units.energy);
    builder.object(id,`Magnetic band ${band}`,"mesh",positions,band%2?"#f2b36f":"#79d9c1",{indices,scalars:energy});
    energies.push(energy);objects.push(id);labels.push(`band ${band}`);
  }
  const directGap=p.q===1?0:Math.min(...a.bandEnergies.slice(0,-1).flatMap((values,b)=>values.map((v,i)=>a.bandEnergies[b+1][i]-v)));
  // The existing band contract requires at least two bands. Zero flux has one
  // ordinary Bloch band, so retain its exact mesh without inventing a partner.
  if(p.q>1)scene.bands={kind:"surface",coordinates,energies,objects,labels,energyUnit:a.units.energy,bulkGap:directGap,grid:[g,g]};
  return builder.finish();
}
