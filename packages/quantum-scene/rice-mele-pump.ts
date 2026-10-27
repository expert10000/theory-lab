import type { QuantumResult } from "../contracts";
import { consistentTopologyResult } from "../models/topology";
import { SceneBuilder } from "./builder";
import type { QuantumScene } from "./index";

/** Render only source-backed cycle samples; the viewer does no pump calculation. */
export async function riceMelePumpSceneFromResult(result: QuantumResult, resultSha256: string,
  digest: (bytes: Uint8Array) => Promise<string>) {
  if(result.operation!=="topology"||result.model.type!=="rice_mele_pump"||result.analysis.kind!=="rice_mele_pump"||
    !consistentTopologyResult({schema:"quantum-job/v1",jobId:result.jobId,operation:"topology",engine:"native",model:result.model},result))
    throw new Error("Rice–Mele pump scene requires a consistent verified run");
  const p=result.model.parameters,a=result.analysis,n=a.kValues.length,m=a.phaseValues.length;
  const pinned=result.model.source?.sourceRepository?.match(/^(https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+)\/tree\/([a-f0-9]{40})$/);
  if(a.finiteChain){
    const c=a.finiteChain, count=c.timeValues.length;
    const scene:QuantumScene={schema:"quantum-scene/v1",id:`${result.runId}-open-chain-pump`,
      title:"Rice–Mele · finite open-chain motion",
      provenance:{kind:"numerical-result",runId:result.runId,jobId:result.jobId,model:result.model.type,
        engine:result.engine.name,engineVersion:result.engine.version,computedAt:result.provenance.computedAt,
        resultSha256,adapter:"qvis/1",parameters:{...p},
        ...(pinned?{source:{repository:pinned[1],revision:pinned[2],entryId:"rice_mele"}}:{})},
      coordinates:{handedness:"right",axes:["time","open-chain site or bond","recorded value"],
        units:[c.units.time,"site / bond index","quantity-specific; see each dataset"]},
      camera:{position:[c.duration*.65,-c.sites*.8,Math.max(3,c.cells*.5)],target:[c.duration/2,c.sites/2,0],up:[0,0,1]},
      objects:[],datasets:[],annotations:[
        {id:"chain-scope",text:`Half-filled open chain with ${c.cells} cells and ${c.occupiedOrbitals} occupied orbitals; finite-size status ${c.status}. Final central-bond charge ${c.centralBondCharge.at(-1)?.toPrecision(8)} ${c.units.charge}. Separate from the periodic ideal pump and not labelled quantized.`,position:[c.duration/2,c.sites/2,3]},
        {id:"chain-checks",text:`Norm drift ${c.maxNormDrift.toExponential(3)}; particle drift ${c.maxParticleDrift.toExponential(3)}; continuity residual ${c.maxContinuityResidual.toExponential(3)}; time/width charge drift ${c.timeStepChargeDrift.toExponential(3)} / ${c.widthChargeDrift.toExponential(3)}. Open ends have no wrap bond.`,position:[c.duration/2,c.sites/2,-3]}]};
    const b=new SceneBuilder(scene,digest);
    const sitePositions=await b.data("chain-site-positions",c.timeValues.flatMap(time=>Array.from({length:c.sites},(_,site)=>[time,site,0]).flat()),3,"time, site index, display plane");
    const density=await b.data("chain-site-density",c.siteDensity,1,c.units.density);
    b.object("chain-density","Exact time–site occupied density","point-cloud",sitePositions,"#79d9c1",{scalars:density,style:{color:"#79d9c1",opacity:.9,size:.045}});
    const bondPositions=await b.data("chain-bond-positions",c.timeValues.flatMap(time=>Array.from({length:c.sites-1},(_,bond)=>[time,bond+.5,0]).flat()),3,"time, right-bond index + 0.5, display plane");
    const current=await b.data("chain-bond-current",c.bondElectronCurrent,1,c.units.current);
    b.object("chain-current","Exact time–bond electron current","point-cloud",bondPositions,"#e5a567",{scalars:current,style:{color:"#e5a567",opacity:.8,size:.035}});
    const centerPositions=await b.data("chain-central-positions",c.timeValues.flatMap(time=>[time,c.centralBond+.5,0]),3,"time, central bond, display plane");
    const charge=await b.data("chain-central-charge",c.centralBondCharge,1,c.units.charge);
    b.object("chain-charge","Central-bond accumulated electron charge","point-cloud",centerPositions,"#ae96e5",{scalars:charge,style:{color:"#ae96e5",opacity:1,size:.07}});
    const edgePositions=await b.data("chain-edge-positions",c.timeValues.flatMap(time=>[time,0,0]),3,"time, left edge baseline, display plane");
    for(const [id,label,values,color] of [["chain-left-edge","Left-edge population",c.leftEdgePopulation,"#78c9be"],["chain-right-edge","Right-edge population",c.rightEdgePopulation,"#dd9e7c"]] as const){
      const scalar=await b.data(id,values,1,"particles in outer two sites");
      b.object(id,label,"point-cloud",edgePositions,color,{scalars:scalar,style:{color,opacity:1,size:.04}});
    }
    if(count!==m+1)throw new Error("Open-chain time trace length mismatch");
    return b.finish();
  }
  if(a.dynamics){
    const d=a.dynamics, count=d.timeValues.length;
    const scene:QuantumScene={schema:"quantum-scene/v1",id:`${result.runId}-finite-pump`,
      title:"Rice–Mele filled band · finite-speed transport",
      provenance:{kind:"numerical-result",runId:result.runId,jobId:result.jobId,model:result.model.type,
        engine:result.engine.name,engineVersion:result.engine.version,computedAt:result.provenance.computedAt,
        resultSha256,adapter:"qvis/1",parameters:{...p},
        ...(pinned?{source:{repository:pinned[1],revision:pinned[2],entryId:"rice_mele"}}:{})},
      coordinates:{handedness:"right",axes:["time","Bloch momentum k","recorded value"],
        units:[d.units.time,a.units.momentum,"quantity-specific; see each dataset"]},
      camera:{position:[d.duration*.65,-8,Math.max(4,Math.abs(d.transportedCharge)*4)],target:[d.duration/2,0,0],up:[0,0,1]},
      objects:[],datasets:[],annotations:[
        {id:"finite-scope",text:`Periodic filled-band cycle, duration ${d.duration}; charge ${d.transportedCharge.toPrecision(8)} ${d.units.charge} (${d.status}). Charge is not labelled quantized; open-chain motion is separate.`,position:[d.duration/2,0,3]},
        {id:"finite-convergence",text:`Maximum norm drift ${d.maxNormDrift.toExponential(3)}; time-step charge drift ${d.timeStepChargeDrift.toExponential(3)}; momentum-grid charge drift ${d.momentumChargeDrift.toExponential(3)}. Ideal adiabatic Chern ${d.adiabaticChern??"undefined"} is a separate reference.`,position:[d.duration/2,0,-3]}]};
    const b=new SceneBuilder(scene,digest);
    const baseline=await b.data("finite-time-positions",d.timeValues.flatMap(time=>[time,0,0]),3,`${d.units.time}; display baseline`);
    const series=[
      ["finite-current","Recorded filled-band current",d.current,d.units.current,"#50adbd"],
      ["finite-charge","Recorded transported charge",d.charge,d.units.charge,"#dc9e5c"],
      ["finite-excitation","Recorded excited-band population",d.excitedPopulation,"probability","#a68cd9"],
    ] as const;
    for(const [id,label,values,unit,color] of series){
      const scalars=await b.data(id,values,1,unit);
      b.object(id,label,"point-cloud",baseline,color,{scalars,style:{color,opacity:1,size:.08}});
    }
    const localPositions=await b.data("finite-local-positions",d.timeValues.flatMap(time=>d.kValues.flatMap(k=>[time,k,0])),3,`${d.units.time}, ${a.units.momentum}, display plane`);
    const localCurrent=await b.data("finite-current-by-k",d.currentByK,1,d.units.current);
    b.object("finite-local-current","Exact time–momentum current samples","point-cloud",localPositions,"#6abd9f",{scalars:localCurrent,style:{color:"#6abd9f",opacity:.75,size:.035}});
    // The scene is an exact display of saved arrays; no finite-speed invariant is inferred here.
    if(count!==d.current.length)throw new Error("Finite-speed time trace length mismatch");
    return b.finish();
  }
  const scene:QuantumScene={schema:"quantum-scene/v1",id:`${result.runId}-pump`,title:"Rice–Mele filled-band pump · saved cycle",
    provenance:{kind:"numerical-result",runId:result.runId,jobId:result.jobId,model:result.model.type,
      engine:result.engine.name,engineVersion:result.engine.version,computedAt:result.provenance.computedAt,
      resultSha256,adapter:"qvis/1",parameters:{...p},
      ...(pinned?{source:{repository:pinned[1],revision:pinned[2],entryId:"rice_mele"}}:{})},
    coordinates:{handedness:"right",axes:["cycle phase θ","Bloch momentum k","band energy"],
      units:[a.units.phase,a.units.momentum,a.units.energy]},
    camera:{position:[8,-10,8],target:[Math.PI,0,0],up:[0,0,1]},
    objects:[],datasets:[],annotations:[
      {id:"pump-scope",text:`Ideal adiabatic filled-band pump only · ${a.status} · Chern ${a.chern??"undefined"} · polarization winding ${a.polarizationWinding??"undefined"}. No finite-speed current or finite-chain edge motion.`,position:[Math.PI,0,5]},
      {id:"pump-gap",text:`Exact gap ${a.exactGap.toPrecision(6)}; coarse/fine ${a.coarseGap.toPrecision(6)} / ${a.fineGap.toPrecision(6)} ${a.units.energy}; periodic seams included.`,position:[Math.PI,0,-5]}]};
  const b=new SceneBuilder(scene,digest);
  const coords=await b.data("cycle-coordinates",a.phaseValues.flatMap(theta=>a.kValues.flatMap(k=>[theta,k,0])),3,"mixed: rad, rad / cell, display plane");
  const triangles:number[]=[];
  for(let j=0;j<m-1;j++)for(let x=0;x<n-1;x++){
    const v=j*n+x;triangles.push(v,v+n,v+1,v+1,v+n,v+n+1);
  }
  const indices=await b.data("band-triangles",triangles,3,"vertex index");
  for(const [index,values,color,label] of [[0,a.lowerBand,"#79d9c1","Occupied lower band"],[1,a.upperBand,"#f2b36f","Empty upper band"]] as const){
    const energy=await b.data(`band-energy-${index}`,values,1,a.units.energy);
    const positions=await b.data(`band-positions-${index}`,values.flatMap((e,i)=>[a.phaseValues[Math.floor(i/n)],a.kValues[i%n],e]),3,"mixed: phase, momentum, energy");
    b.object(`band-${index}`,label,"mesh",positions,color,{scalars:energy,indices});
  }
  // The frozen v1 band-grid metadata is capped at 31². Exact 32×32 samples
  // remain ordinary verified mesh/point objects rather than silently decimated.
  const flux=await b.data("plaquette-flux",a.berryFlux,1,"rad");
  b.object("berry-plaquettes","Exact stored FHS plaquette phases","point-cloud",coords,"#d99c73",{scalars:flux,style:{color:"#d99c73",opacity:.75,size:.04}});
  const phasePositions=await b.data("phase-positions",a.phaseValues.flatMap(theta=>[theta,0,0]),3,"phase rad / schematic baseline");
  const polarization=await b.data("polarization",a.polarization.slice(0,m),1,a.units.polarization);
  b.object("polarization-samples","Occupied Wilson polarization at each saved phase","point-cloud",phasePositions,"#ad9ae0",{scalars:polarization});
  scene.topology={quantities:[{id:"plaquette-phase",label:"FHS occupied plaquette phase",kind:"berry-phase",object:"berry-plaquettes",dataset:flux,
    convention:"phase-major / k-fastest; each sample is a periodic-torus plaquette phase, not a continuous curvature interpolation"}],
    invariants:[{id:"pump-chern",label:"Occupied-band Chern",value:a.chern,status:a.status==="defined"?"verified":a.status==="gap-closed"?"undefined":"unresolved",method:a.method},
      {id:"pump-winding",label:"Polarization winding",value:a.polarizationWinding,status:a.status==="defined"?"verified":a.status==="gap-closed"?"undefined":"unresolved",method:"Independent k-Wilson polarization unwrapped across the closed cycle"}],
    limitations:["Ideal adiabatic filled-band transport only.","No finite-speed current or finite-chain edge motion is stored.","The meshes and gap diagnostics come from the verified producer run."]};
  return b.finish();
}
