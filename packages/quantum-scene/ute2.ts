import type { LandauResult } from "../contracts/landau";
import type { BdGSectorResult } from "../contracts/bdg-sector";
import type { LatticePairingResult } from "../contracts/lattice-pairing";
import type { Ute2TopologyResult } from "../contracts/ute2-topology";
import type { Ute2EdgeResult } from "../contracts/ute2-edge";
import { SceneBuilder, type SceneDigest } from "./builder";
import type { QuantumScene, ScenePayload } from "./index";

export type Ute2SceneKind = "landau" | "bdg" | "lattice" | "topology" | "edge";
export interface Ute2SceneBridge { exportUte2Scene(kind:Ute2SceneKind,runId:string):Promise<string|null> }
export type Ute2SceneInput =
  | {kind:"landau"; result:LandauResult; resultSha256:string}
  | {kind:"bdg"; result:BdGSectorResult; resultSha256:string}
  | {kind:"lattice"; result:LatticePairingResult; resultSha256:string}
  | {kind:"topology"; result:Ute2TopologyResult; resultSha256:string}
  | {kind:"edge"; result:Ute2EdgeResult; resultSha256:string};

/** Only saved, host-verified results enter this adapter. Every displayed sample is copied from that result. */
export async function ute2SceneFromResult(input:Ute2SceneInput,digest:SceneDigest):Promise<ScenePayload> {
  const {kind,result,resultSha256}=input;
  const parameters:Record<string,number|string>={...result.model.parameters};
  if(kind==="topology") {
    const r=input.result;
    Object.assign(parameters,{bulkMinimumEnergy:r.bulkMinimumEnergy,bulkGap:r.bulkGap,
      sampledMinimumEnergy:r.sampledMinimumEnergy,coarseMesh:r.coarseMesh,fineMesh:r.fineMesh,
      invariantStatus:r.invariantStatus,orientation:r.orientation,gapClosed:String(r.gapClosed)});
    for(const key of ["coarseLinkChern","fineLinkChern","coarseMinimumLink","fineMinimumLink",
      "curvatureIntegralCoarse","curvatureIntegralFine","analyticExpectedChern"] as const)
      if(r[key]!==null)parameters[key]=r[key]!;
  }
  if(kind==="edge") {
    parameters.bulkRunId=result.source.runId;
    parameters.bulkResultSha256=result.source.resultSha256;
    parameters.bulkChern=result.bulkChern;
    parameters.ky=result.ky;
    parameters.edgeStatus=result.edgeStatus;
  }
  const scene:QuantumScene={
    schema:"quantum-scene/v1",id:`ute2-${kind}-${resultSha256.slice(0,24)}`,
    title:kind==="landau"?"Two-order Landau stationary points":kind==="bdg"?"Reduced BdG saved samples":
      kind==="lattice"?"Square-lattice pairing saved samples":kind==="topology"?
        "Conditional class-D toy bulk receipt":"Class-D finite-strip saved density",
    provenance:{kind:"numerical-result",runId:result.runId,jobId:result.jobId,model:result.model.type,
      engine:"quantum-python",engineVersion:result.provenance.workerVersion,
      computedAt:result.provenance.computedAt,resultSha256,adapter:"qvis/1",parameters},
    coordinates:{handedness:"right",axes:["x","y","z"],units:["dimensionless","dimensionless","dimensionless"]},
    camera:{position:[5,-6,5],target:[0,0,0],up:[0,0,1]},
    datasets:[],objects:[],annotations:[],
  };
  const builder=new SceneBuilder(scene,digest);
  const points=async(id:string,label:string,coordinates:number[],unit:string,color:string,scalars?:{values:number[];unit:string;phase?:boolean})=>{
    if(coordinates.length===0)return;
    const positions=await builder.data(`${id}-positions`,coordinates,3,unit);
    const scalarId=scalars?await builder.data(`${id}-scalars`,scalars.values,1,scalars.unit):undefined;
    builder.object(id,label,"point-cloud",positions,color,{...(scalarId?{scalars:scalarId}:{}),
      ...(scalars?.phase?{colorMap:"phase" as const}:{})});
  };
  if(input.kind==="landau") {
    const r=input.result;
    scene.coordinates={handedness:"right",axes:["order amplitude r1","order amplitude r2","free energy F"],
      units:["dimensionless","dimensionless","dimensionless"]};
    const xyz=(rows:typeof r.candidates)=>rows.flatMap(c=>[Math.sqrt(c.x),Math.sqrt(c.y),c.freeEnergy]);
    await points("stationary","All saved stationary points",xyz(r.candidates),"r1, r2, F","#79d9c1");
    await points("stable","Locally stable stationary points",xyz(r.candidates.filter(c=>c.locallyStable)),"r1, r2, F","#f2b36f");
    await points("global","Tied global minima",xyz(r.candidates.filter(c=>r.globalMinima.includes(c.phase))),"r1, r2, F","#ffffff");
    scene.annotations.push({id:"scope",text:"Uniform dimensionless two-order Landau example; stationary and stability results are saved worker values. No UTe2 material fit or measured phase boundary.",position:[0,0,0]});
    scene.annotations.push({id:"quartic",text:`b1*b2-g^2 = ${r.quarticDeterminant}; marginal = ${r.marginalQuartic}. Relative phase, gradients and fluctuations are omitted.`,position:[0,0,-1]});
  } else if(input.kind==="bdg") {
    const r=input.result;
    scene.coordinates={handedness:"right",axes:["xi","energy","display z"],
      units:[r.units.xi,r.units.energy,"dimensionless"]};
    scene.camera={position:[0,-3,7],target:[0,0,0],up:[0,1,0]};
    for(const [id,key,color] of [["negative","eMinus","#8ca7ff"],["positive","ePlus","#79d9c1"]] as const) {
      const positions=await builder.data(`${id}-positions`,r.samples.flatMap(s=>[s.xi,s[key],0]),3,"xi, energy, display z");
      builder.object(id,`${id} BdG branch`,"polyline",positions,color);
    }
    const weighted=r.samples.filter(s=>s.electronWeight!==null);
    await points("electron-weight","Defined positive-branch electron weights",weighted.flatMap(s=>[s.xi,s.ePlus,0]),
      "xi, energy, display z","#f2b36f",{values:weighted.map(s=>s.electronWeight!),unit:"probability"});
    await points("hole-weight","Defined positive-branch hole weights",weighted.flatMap(s=>[s.xi,s.ePlus,0]),
      "xi, energy, display z","#bca0ff",{values:weighted.map(s=>s.holeWeight!),unit:"probability"});
    await points("nodes","Sampled zero-energy nodes",r.samples.filter(s=>s.node).flatMap(s=>[s.xi,0,0]),
      "xi, energy, display z","#ffffff");
    scene.annotations.push({id:"scope",text:"Reduced constant-gap 2x2 Nambu sector. xi is not momentum; sampled nodes and weights do not define a bulk topological phase or UTe2 pairing symmetry.",position:[0,0,0]});
    scene.annotations.push({id:"phase",text:`Pairing phase = ${r.model.parameters.delta===0?"undefined":`${r.model.parameters.phaseRad} rad`}; undefined weights at a zero-energy degeneracy are omitted.`,position:[0,0,1]});
  } else if(input.kind==="lattice") {
    const r=input.result;
    scene.coordinates={handedness:"right",axes:["kx","ky","energy or display plane"],
      units:[r.units.momentum,r.units.momentum,r.units.energy]};
    scene.camera={position:[8,-8,7],target:[0,0,0],up:[0,0,1]};
    await points("positive-energy","Saved positive BdG energy",r.samples.flatMap(s=>[s.kx,s.ky,s.ePlus]),
      "kx, ky, energy","#79d9c1",{values:r.samples.map(s=>s.ePlus),unit:r.units.energy});
    await points("negative-energy","Saved negative BdG energy",r.samples.flatMap(s=>[s.kx,s.ky,s.eMinus]),
      "kx, ky, energy","#8ca7ff");
    await points("gap-magnitude","Saved pairing magnitude on display plane",r.samples.flatMap(s=>[s.kx,s.ky,0]),
      "kx, ky, display plane","#f2b36f",{values:r.samples.map(s=>s.gapMagnitude),unit:r.units.energy});
    const gridPlane=await builder.data("grid-plane-positions",r.samples.flatMap(s=>[s.kx,s.ky,0]),3,
      "kx, ky, display plane");
    const gridScalar=async(id:string,label:string,values:number[],unit:string,color:string)=>{
      const scalars=await builder.data(`${id}-scalars`,values,1,unit);
      builder.object(id,label,"point-cloud",gridPlane,color,{scalars});
    };
    await gridScalar("dispersion-xi","Saved even dispersion xi",r.samples.map(s=>s.xi),r.units.energy,"#8ca7ff");
    await gridScalar("pairing-real","Saved real pairing component",r.samples.map(s=>s.deltaRe),r.units.energy,"#f2b36f");
    await gridScalar("pairing-imaginary","Saved imaginary pairing component",r.samples.map(s=>s.deltaIm),r.units.energy,"#bca0ff");
    await gridScalar("phase-defined-mask","Phase defined mask: 1 valid, 0 undefined",r.samples.map(s=>s.phaseRad===null?0:1),
      "binary mask","#ffffff");
    await gridScalar("node-mask","Sampled zero-energy node mask",r.samples.map(s=>s.node?1:0),"binary mask","#ff8f8f");
    await gridScalar("coherence-defined-mask","Coherence weight mask: 1 valid, 0 undefined",
      r.samples.map(s=>s.electronWeight===null?0:1),"binary mask","#ffffff");
    await gridScalar("electron-weight","Positive-branch electron weight; zero where masked",
      r.samples.map(s=>s.electronWeight??0),"probability","#f2b36f");
    await gridScalar("hole-weight","Positive-branch hole weight; zero where masked",
      r.samples.map(s=>s.holeWeight??0),"probability","#bca0ff");
    const phase=r.samples.filter(s=>s.phaseRad!==null);
    await points("pairing-phase","Defined pairing phase on display plane",phase.flatMap(s=>[s.kx,s.ky,0]),
      "kx, ky, display plane","#ffffff",{values:phase.map(s=>s.phaseRad!),unit:"rad",phase:true});
    await points("nodes","Sampled zero-energy nodes",r.samples.filter(s=>s.node).flatMap(s=>[s.kx,s.ky,0]),
      "kx, ky, display plane","#ff8f8f");
    scene.annotations.push({id:"scope",text:"Exact saved kx-major, ky-minor half-open grid samples. Points have no interpolation or periodic seam. A missing sampled node does not establish a continuous bulk gap.",position:[0,0,0]});
    scene.annotations.push({id:"mask",text:"Binary masks mark undefined phase/weights and sampled zero energy. Masked weight values are stored as zero and must not be interpreted. Spinless lattice toy, not a UTe2 material model.",position:[0,0,-1]});
  } else if(input.kind==="topology") {
    const r=input.result;
    scene.coordinates={handedness:"right",axes:["mu/t","pairing amplitude delta/t","continuous bulk gap"],
      units:["t=1","t=1","t=1"]};
    await points("bulk-receipt","Exact saved bulk qualification point",
      [r.model.parameters.mu,r.model.parameters.delta,r.bulkGap],"mu/t, delta/t, bulk gap","#79d9c1",
      {values:[r.bulkGap],unit:"t=1"});
    scene.topology={quantities:[],invariants:[{id:"occupied-chern",label:"Conditional occupied-band toy Chern",
      value:r.chern,status:r.invariantStatus==="defined"?"verified":r.invariantStatus==="gap_closed"?"undefined":"unresolved",
      method:"continuous bulk gap; coarse/fine link meshes; independent curvature and geometric degree"}],
      limitations:["One parameter-space receipt point, not a momentum grid or Berry-curvature surface.",
        "Toy spinless class-D Hamiltonian, not a UTe2 material phase or Majorana observation."]};
    scene.annotations.push({id:"gap",text:`Exact continuous-BZ gap ${r.bulkGap}; sampled E+ minimum ${r.sampledMinimumEnergy}. ${r.invariantStatus}.`,
      position:[r.model.parameters.mu,r.model.parameters.delta,r.bulkGap]});
    scene.annotations.push({id:"convergence",text:`Link meshes ${r.coarseMesh}/${r.fineMesh}; Chern ${r.coarseLinkChern??"withheld"}/${r.fineLinkChern??"withheld"}; curvature ${r.curvatureIntegralCoarse??"withheld"}/${r.curvatureIntegralFine??"withheld"}.`,
      position:[r.model.parameters.mu,r.model.parameters.delta,r.bulkGap+1]});
  } else {
    const r=input.result;
    scene.coordinates={handedness:"right",axes:["open-x cell index","display width row","central-pair density"],
      units:["cell index","categorical width","probability per x cell"]};
    scene.camera={position:[r.widths[1].width/2,-r.widths[1].width,3],target:[r.widths[1].width/2,0,0],up:[0,0,1]};
    for(const w of r.widths) {
      const positions=await builder.data(`density-${w.width}-positions`,w.pairDensity.flatMap((d,i)=>[i,w.width,d]),3,
        "cell index, categorical width, probability per x cell");
      builder.object(`density-${w.width}`,`Exact central-pair density · ${w.width} cells`,"polyline",positions,
        w.width===r.widths[0].width?"#79d9c1":"#f2b36f");
    }
    scene.annotations.push({id:"scope",text:`Open-x, periodic-y finite strip at ky=${r.ky} rad/a. Status ${r.edgeStatus}; toy bulk Chern ${r.bulkChern}. No exact zero mode, infinite-width or UTe2 Majorana claim.`,position:[0,0,0]});
    scene.annotations.push({id:"source",text:`Qualified bulk ${r.source.runId} · SHA-256 ${r.source.resultSha256}`,position:[0,0,1]});
  }
  return builder.finish();
}
