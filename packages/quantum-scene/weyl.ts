import type {QuantumResult} from "../contracts";
import {consistentTopologyResult} from "../models/topology";
import {SceneBuilder} from "./builder";
import type {QuantumScene} from "./index";

/** Display only producer-supplied samples of a local linearized cone. */
export async function weylSceneFromResult(result:QuantumResult,resultSha256:string,digest:(bytes:Uint8Array)=>Promise<string>){
  if(result.operation!=="topology"||result.model.type!=="weyl_minimal"||result.analysis.kind!=="weyl_minimal"||
    !consistentTopologyResult({schema:"quantum-job/v1",jobId:result.jobId,operation:"topology",engine:"native",model:result.model},result))
    throw new Error("Weyl scene requires a verified local-cone run");
  const a=result.analysis,p=result.model.parameters;
  const source=result.model.source,pinned=source?.sourceRepository?.match(/^(https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)\/tree\/([a-f0-9]{40})$/);
  const scene:QuantumScene={schema:"quantum-scene/v1",id:`${result.runId}-weyl`,title:"Weyl local cone · enclosing-sphere Berry flux",
    provenance:{kind:"numerical-result",runId:result.runId,jobId:result.jobId,model:result.model.type,
      engine:result.engine.name,engineVersion:result.engine.version,computedAt:result.provenance.computedAt,
      resultSha256,adapter:"qvis/1",parameters:{...p},
      ...(pinned?{source:{repository:pinned[1],revision:pinned[2],entryId:"weyl_minimal"}}:{})},
    coordinates:{handedness:"right",axes:["qx","qy","qz"],units:["inverse length","inverse length","inverse length"]},
    camera:{position:[3*p.radius,-3*p.radius,2.4*p.radius],target:[0,0,0],up:[0,0,1]},
    datasets:[],objects:[],annotations:[
      {id:"local-cone-scope",text:"Linearized local node at q=0. Enclosing sphere excludes the degeneracy. No periodic lattice, partner node, Fermi arc or surface state is supplied.",position:[0,0,1.25*p.radius]},
      {id:"flux-diagnostic",text:`Occupied-band flux ${a.flux.toPrecision(7)}; Chern ${a.lowerChern??"unresolved"}; local chirality ${a.chirality}.`,position:[0,0,-1.25*p.radius]}],
    topology:{quantities:[{id:"occupied-berry-field",label:"Radial occupied-band Berry curvature",kind:"berry-curvature",object:"weyl-samples",dataset:"radial-berry",convention:"Lower-band local linearized Weyl cone; radial component in inverse length squared"}],invariants:[
      {id:"local-chirality",label:"Local node chirality",value:a.chirality,status:"verified",method:"sign det velocity matrix of the declared local two-band Hamiltonian"},
      {id:"occupied-chern",label:"Occupied-band enclosing-sphere Chern",value:a.lowerChern,status:a.meshResolved?"verified":"unresolved",method:"gauge-invariant Wilson triangle flux; independent solid-angle check"}],
      limitations:["Local linearization only; no periodic Brillouin zone or lattice completion.","No surface bands or Fermi arcs are present."]}};
  const b=new SceneBuilder(scene,digest);
  const positions=await b.data("sphere-positions",a.positions.flat(),3,"inverse length");
  const curvature=await b.data("berry-curvature",a.berryCurvature.flat(),3,"inverse length squared");
  const radial=await b.data("radial-berry",a.berryCurvature.map((v,i)=>v.reduce((s,x,j)=>s+x*a.positions[i][j],0)/p.radius),1,"inverse length squared");
  const indices=await b.data("sphere-triangles",a.triangles.flat(),3,"vertex index");
  b.object("weyl-sphere","Verified enclosing sphere","mesh",positions,"#5a83ab",{indices,scalars:radial,style:{color:"#5a83ab",opacity:.3,size:1}});
  b.object("weyl-samples","Stored momentum and Berry samples","point-cloud",positions,"#79d9c1",{scalars:radial,style:{color:"#79d9c1",opacity:1,size:.09}});
  b.object("weyl-berry-vectors","Supplied occupied-band Berry curvature","vectors",positions,"#f2b36f",{values:curvature,style:{color:"#f2b36f",opacity:.8,size:1}});
  const node=await b.data("node-position",[0,0,0],3,"inverse length");
  b.object("weyl-node","Local crossing at q=0","point-cloud",node,"#ffffff",{style:{color:"#ffffff",opacity:1,size:.16}});
  return b.finish();
}
