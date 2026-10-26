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
      {id:"scope",text:`Square-lattice periodic Harper spectrum · flux ${p.p}/${p.q} · ${p.q} magnetic bands · ${a.chernGaps?"conditional occupied-gap Chern diagnostics":"legacy spectrum only"}${a.strip?" · finite strip in a separate scene":""}`,position:[0,0,span*1.2]},
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
  if(a.chernGaps?.length){
    scene.topology={quantities:[],invariants:[],limitations:[
      "Chern numbers belong to the producer's gapped occupied subspaces; a touching or unresolved gap is undefined.",
      "FHS plaquette flux is an exact supplied scalar on a separate half-open periodic mesh. Its z=0 position is a display plane, not an energy sample.",
      "Finite-strip observations, when supplied, are in a separate scene. No Fermi filling or Hall response is supplied. Math3D does not calculate Berry flux or Chern numbers."]};
    for(const gap of a.chernGaps){
      const id=`occupied-${gap.occupiedBands}`;
      scene.topology.invariants.push({id:`${id}-chern`,label:`Occupied ${gap.occupiedBands} Chern`,
        value:gap.chern,status:gap.status==="defined"?"verified":gap.status==="gap-closed"?"undefined":"unresolved",
        method:`Producer FHS determinant links; coarse/fine ${g-1}/${gap.mesh} periodic meshes; fine direct gap ${gap.fineGap.toPrecision(5)} ${a.units.energy}; minimum link ${gap.minimumLink?.toPrecision(5)??"undefined"}`});
      if(gap.status!=="defined")continue;
      const n=gap.mesh,stepX=2*Math.PI/(p.q*n),stepY=2*Math.PI/n;
      const positions=await builder.data(`${id}-flux-positions`,gap.plaquetteFlux.flatMap((_,index)=>{
        const x=Math.floor(index/n),y=index%n;
        return [-Math.PI/p.q+(x+.5)*stepX,-Math.PI+(y+.5)*stepY,0];
      }),3,"kx, ky, z=0 display plane");
      const scalar=await builder.data(`${id}-plaquette-flux`,gap.plaquetteFlux,1,"rad per plaquette");
      const triangles:number[]=[];
      for(let x=0;x<n-1;x++)for(let y=0;y<n-1;y++){
        const i=x*n+y;triangles.push(i,i+n,i+1,i+1,i+n,i+n+1);
      }
      builder.object(`${id}-flux`,`Occupied ${gap.occupiedBands} FHS plaquette flux`,"mesh",positions,"#79d9c1",
        {indices:await builder.data(`${id}-flux-triangles`,triangles,3,"vertex index"),scalars:scalar});
      scene.topology.quantities.push({id:`${id}-berry-flux`,label:`Occupied ${gap.occupiedBands} FHS plaquette flux`,
        kind:"berry-curvature",object:`${id}-flux`,dataset:scalar,
        convention:"Signed FHS plaquette phase in radians; half-open magnetic zone, x-major/y-fastest; no area division"});
    }
  }
  return builder.finish();
}

/** The finite strip is a separate observation from periodic bulk Chern data. */
export async function hofstadterStripSceneFromResult(result: QuantumResult, resultSha256: string,
  digest: (bytes: Uint8Array) => Promise<string>) {
  if (result.operation !== "topology" || result.model.type !== "hofstadter" ||
      result.analysis.kind !== "hofstadter" || !result.analysis.strip ||
      !consistentTopologyResult({schema:"quantum-job/v1",jobId:result.jobId,operation:"topology",
        engine:"native",model:result.model},result))
    throw new Error("Hofstadter strip scene requires a consistent verified run");
  const p=result.model.parameters,strip=result.analysis.strip;
  const source=result.model.source?.sourceRepository?.match(/^(https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)\/tree\/([a-f0-9]{40})$/);
  const energyMax=Math.max(1,...strip.energies.flatMap(row=>row.map(Math.abs)));
  const scene:QuantumScene={schema:"quantum-scene/v1",id:`${result.runId}-hofstadter-strip`,
    title:`Open Harper strip · flux ${p.p}/${p.q}`,
    provenance:{kind:"numerical-result",runId:result.runId,jobId:result.jobId,model:result.model.type,
      engine:result.engine.name,engineVersion:result.engine.version,computedAt:result.provenance.computedAt,
      resultSha256,adapter:"qvis/1",parameters:{...p},
      ...(source?{source:{repository:source[1],revision:source[2],entryId:"hofstadter"}}:{})},
    coordinates:{handedness:"right",axes:["ky","sorted state display lane","energy"],
      units:[result.analysis.units.momentum,"state index + display offset",result.analysis.units.energy]},
    camera:{position:[5,-strip.cells,energyMax*3],target:[0,(strip.cells-1)/2,0],up:[0,0,1]},
    datasets:[],objects:[],annotations:[
      {id:"scope",text:`Finite Harper strip: ${strip.cells} sites open in x, Bloch-periodic in y. Left/right colors encode first/last ${strip.edgeSites} site weights; lane offsets ±0.15 are display only. No filling, Hall response, or edge-channel classification.`,position:[0,0,energyMax*1.4]},
      {id:"sampling",text:`${strip.kyValues.length} exact ky samples; state index is energy-sorted at each momentum, not a tracked branch. Maximum eigenpair residual ${strip.maxResidual.toPrecision(4)}.`,position:[0,strip.cells-1,-energyMax*1.4]}]};
  const builder=new SceneBuilder(scene,digest);
  for(const [side,offset,color,weights] of [
    ["left",-.15,"#79d9c1",strip.leftWeights],
    ["right",.15,"#f2b36f",strip.rightWeights],
  ] as const){
    const positions=await builder.data(`strip-${side}-positions`,strip.stateIndices.flatMap(state=>
      strip.kyValues.flatMap((ky,k)=>[ky,state+offset,strip.energies[state][k]])),3,
      "ky, sorted state display lane, energy");
    const scalars=await builder.data(`strip-${side}-weight`,strip.stateIndices.flatMap(state=>weights[state]),1,
      "probability weight");
    builder.object(`strip-${side}`,`${side} boundary weight` ,"point-cloud",positions,color,{scalars});
  }
  return builder.finish();
}
