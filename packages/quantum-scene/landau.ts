import type { QuantumResult } from "../contracts";
import { consistentTopologyResult } from "../models/topology";
import { SceneBuilder } from "./builder";
import type { QuantumScene } from "./index";

/** Source-linked display samples; the consumer never computes a Landau level. */
export async function landauSceneFromResult(result: QuantumResult, resultSha256: string,
  digest: (bytes: Uint8Array) => Promise<string>) {
  if (result.operation !== "topology" || result.model.type !== "landau_continuum" ||
      result.analysis.kind !== "landau_continuum" ||
      !consistentTopologyResult({schema:"quantum-job/v1",jobId:result.jobId,operation:"topology",
        engine:"native",model:result.model},result))
    throw new Error("Landau scene requires a consistent verified run");
  const p=result.model.parameters,a=result.analysis;
  const pinned=result.model.source?.sourceRepository?.match(/^(https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)\/tree\/([a-f0-9]{40})$/);
  const high=Math.max(...a.energies.flat()),mid=(p.fieldStart+p.fieldStop)/2;
  const scene:QuantumScene={schema:"quantum-scene/v1",id:`${result.runId}-landau`,title:"Continuum Landau level fan",
    provenance:{kind:"numerical-result",runId:result.runId,jobId:result.jobId,model:result.model.type,
      engine:result.engine.name,engineVersion:result.engine.version,computedAt:result.provenance.computedAt,
      resultSha256,adapter:"qvis/1",parameters:{...p},
      ...(pinned?{source:{repository:pinned[1],revision:pinned[2],entryId:"landau_continuum"}}:{})},
    coordinates:{handedness:"right",axes:["signed B","level index n","energy E_n"],
      units:[a.units.field,"categorical index",a.units.energy]},
    camera:{position:[mid+(p.fieldStop-p.fieldStart)*1.8,-Math.max(4,p.levels*2),high*1.6],
      target:[mid,(p.levels-1)/2,high/2],up:[0,0,1]},
    datasets:[],objects:[],annotations:[
      {id:"scope",text:"2D uniform-field continuum · ħ=1. Energy is sign-invariant under q or B reversal. No filling, Hall conductivity, edge channel or plateau is calculated.",position:[mid,0,high*1.1]},
      {id:"convergence",text:`Finite-difference coarse/fine check: ${a.converged?"converged":"unresolved"}; maximum fine error ${Math.max(...a.fineMaxErrors).toPrecision(5)} ${a.units.energy}.`,position:[mid,0,0]}]};
  const builder=new SceneBuilder(scene,digest);
  for(const level of a.levelIndices){
    const points=a.fieldValues.flatMap((field,i)=>[field,level,a.energies[i][level]]);
    const positions=await builder.data(`level-${level}-positions`,points,3,"mixed: normalized field, categorical index, normalized energy");
    const energy=await builder.data(`level-${level}-energy`,a.energies.map(row=>row[level]),1,a.units.energy);
    builder.object(`level-${level}-line`,`Landau level n=${level}`,"polyline",positions,"#79d9c1");
    builder.object(`level-${level}-samples`,`Exact stored level n=${level} samples`,"point-cloud",positions,"#f2b36f",
      {scalars:energy,style:{color:"#f2b36f",opacity:1,size:.07}});
  }
  return builder.finish();
}
