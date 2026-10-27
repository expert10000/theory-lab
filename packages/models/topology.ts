import type { TopologyJob, TopologyResult, WorkspaceSnapshot } from "../contracts";
import { ATLAS_REVISION, ATLAS_SOURCE, atlasEntry } from "../atlas";

export type TopologyDraft = NonNullable<WorkspaceSnapshot["topology"]>;
export const TOPOLOGY_DEFAULTS: TopologyDraft = {
  modelId: "ssh", t1: "0.6", t2: "1", delta: "0.2", cells: "16", kPoints: "101", mass: "-1", grid: "21",
  pumpBase:"1",pumpModulation:"0.4",pumpStagger:"0.6",pumpOffset:"0",pumpK:"32",pumpPhases:"32",
  A:"1",B:"1",C:"0",D:"0",R:"0",edgeCells:"12",edgeSamples:"15",continuumExtent:"1",
  gammaX:"0.5",lambdaX:"1",gammaY:"0.5",lambdaY:"1",
  mu:"0",hopping:"1",pairing:"0.8",
  velocity:"1",chirality:"1",radius:"1",subdivisions:"1",
  curvature:"1",loopCenter:"1",loopRadius:"0.25",loopSamples:"64",
  charge:"-1",fieldStart:"0.5",fieldStop:"2",fieldSamples:"7",levels:"5",
    p:"1",q:"4",occupiedBands:"1",
};
function numeric(raw: string, minimum: number, maximum: number, integer = false): number {
  if (!raw.trim()) throw new Error("All topology parameters are required");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value)))
    throw new Error(`Topology parameter must be ${integer ? "an integer" : "finite"} in [${minimum}, ${maximum}]`);
  return value;
}
export function topologyJob(jobId: string, draft: TopologyDraft): TopologyJob {
  const entry = atlasEntry(draft.modelId === "bhz_general" ? "bhz" : draft.modelId === "rice_mele_pump" ? "rice_mele" : draft.modelId)!;
  const source = { sourceRepository: `${ATLAS_SOURCE}/tree/${ATLAS_REVISION}`,
    sourceModule: `data/hamiltonian_atlas/${entry.sourceFile}`, volume: "VIII", exampleId: `Atlas ${draft.modelId}` };
  if (draft.modelId === "ssh") return { schema: "quantum-job/v1", jobId, operation: "topology", engine: "native",
    model: { type: "ssh", parameters: { t1: numeric(draft.t1, -10, 10), t2: numeric(draft.t2, -10, 10),
      cells: numeric(draft.cells, 4, 40, true), kPoints: numeric(draft.kPoints, 21, 201, true) }, source } };
  if (draft.modelId === "rice_mele") return { schema: "quantum-job/v1", jobId, operation: "topology", engine: "native",
    model: { type: "rice_mele", parameters: { t1: numeric(draft.t1, -3, 3), t2: numeric(draft.t2, -3, 3),
      delta: numeric(draft.delta??"0.2", -2, 2), cells: numeric(draft.cells, 4, 40, true),
      kPoints: numeric(draft.kPoints, 21, 201, true) }, source } };
  if (draft.modelId === "rice_mele_pump") {
    const baseHopping=numeric(draft.pumpBase??"1",.25,2);
    const modulation=numeric(draft.pumpModulation??"0.4",-1,1);
    if(baseHopping<=Math.abs(modulation))throw new Error("Both Rice–Mele cycle hoppings must stay positive");
    const kSamples=numeric(draft.pumpK??"32",16,80,true);
    const phaseSamples=numeric(draft.pumpPhases??"32",16,64,true);
    if(kSamples%2||phaseSamples%4)throw new Error("Pump mesh needs even momentum and fourfold phase samples");
    return {schema:"quantum-job/v1",jobId,operation:"topology",engine:"native",model:{type:"rice_mele_pump",
      source:{...source,exampleId:"Atlas rice_mele"},parameters:{baseHopping,modulation,
        staggerAmplitude:numeric(draft.pumpStagger??"0.6",-2,2),staggerOffset:numeric(draft.pumpOffset??"0",-2,2),
        kSamples,phaseSamples}}};
  }
  if (draft.modelId === "bhz") return { schema: "quantum-job/v1", jobId, operation: "topology", engine: "native",
    model: { type: "bhz", parameters: { mass: numeric(draft.mass, -2, 10), grid: numeric(draft.grid, 11, 21, true) }, source } };
  if (draft.modelId === "bhz_general") {
    const A=numeric(draft.A??"1",.25,2),R=numeric(draft.R??"0",-.5,.5);
    if(Math.abs(R)>A/2)throw new Error("BHZ spin mixing must satisfy |R| ≤ A/2");
    return {schema:"quantum-job/v1",jobId,operation:"topology",engine:"native",model:{type:"bhz_general",source,
      parameters:{A,B:numeric(draft.B??"1",.25,2),C:numeric(draft.C??"0",-2,2),D:numeric(draft.D??"0",-1,1),
        M:numeric(draft.mass,-4,16),R,grid:numeric(draft.grid,11,21,true),
        edgeCells:numeric(draft.edgeCells??"12",8,16,true),edgeSamples:numeric(draft.edgeSamples??"15",11,21,true),
        continuumExtent:numeric(draft.continuumExtent??"1",.5,2)}}};
  }
  if (draft.modelId === "bbh") return {schema:"quantum-job/v1",jobId,operation:"topology",engine:"native",
    model:{type:"bbh",source,parameters:{gammaX:numeric(draft.gammaX??"0.5",-2,2),
      lambdaX:numeric(draft.lambdaX??"1",.25,2),gammaY:numeric(draft.gammaY??"0.5",-2,2),
      lambdaY:numeric(draft.lambdaY??"1",.25,2),grid:numeric(draft.grid,11,21,true),
      cells:numeric(draft.cells,3,7,true)}}};
  if (draft.modelId === "kitaev_chain") return {schema:"quantum-job/v1",jobId,operation:"topology",engine:"native",
    model:{type:"kitaev_chain",source,parameters:{mu:numeric(draft.mu??"0",-4,4),
      hopping:numeric(draft.hopping??"1",.25,2),pairing:numeric(draft.pairing??"0.8",.1,2),
      cells:numeric(draft.cells,8,40,true),kPoints:numeric(draft.kPoints,21,201,true)}}};
  if (draft.modelId === "weyl_minimal") {
    const chirality=numeric(draft.chirality??"1",-1,1,true);
    if(chirality!==-1&&chirality!==1)throw new Error("Weyl chirality must be -1 or +1");
    return {schema:"quantum-job/v1",jobId,operation:"topology",engine:"native",
      model:{type:"weyl_minimal",source,parameters:{velocity:numeric(draft.velocity??"1",.25,2),
        chirality,radius:numeric(draft.radius??"1",.25,2),subdivisions:numeric(draft.subdivisions??"1",0,2,true) as 0|1|2}}};
  }
  if(draft.modelId==="nodal_line_two_band")return {schema:"quantum-job/v1",jobId,operation:"topology",engine:"native",
    model:{type:"nodal_line_two_band",source,parameters:{mass:numeric(draft.mass,-2,2),
      curvature:numeric(draft.curvature??"1",.25,2),velocity:numeric(draft.velocity??"1",.25,2),
      loopCenter:numeric(draft.loopCenter??"1",0,3),loopRadius:numeric(draft.loopRadius??"0.25",0,.75),
      samples:numeric(draft.loopSamples??"64",32,128,true)}}};
  if(draft.modelId==="landau_continuum"){
    const fieldStart=numeric(draft.fieldStart??"0.5",-2,2),fieldStop=numeric(draft.fieldStop??"2",-2,2);
    if(fieldStart*fieldStop<=0)throw new Error("Landau field endpoints must have the same nonzero sign");
    const charge=numeric(draft.charge??"-1",-1,1,true);
    if(charge!==-1&&charge!==1)throw new Error("Landau charge must be -1 or +1");
    return {schema:"quantum-job/v1",jobId,operation:"topology",engine:"native",
      model:{type:"landau_continuum",source,parameters:{mass:numeric(draft.mass,.5,2),charge,
        fieldStart,fieldStop,fieldSamples:numeric(draft.fieldSamples??"7",3,11,true),
        levels:numeric(draft.levels??"5",2,6,true),grid:numeric(draft.grid,48,80,true)}}};
  }
  if(draft.modelId==="hofstadter"){
    const p=numeric(draft.p??"1",-6,6,true),q=numeric(draft.q??"4",1,7,true),grid=numeric(draft.grid,7,15,true);
    const occupiedBands=q===1?undefined:numeric(draft.occupiedBands??"1",1,q-1,true);
    const stripCells=numeric(draft.edgeCells??"18",12,32,true),stripSamples=numeric(draft.edgeSamples??"17",11,31,true);
    const gcd=(a:number,b:number):number=>b===0?a:gcd(b,a%b);
    if(grid%2!==1||stripSamples%2!==1||q===1&&p!==0||q>1&&(p===0||Math.abs(p)>=q||gcd(Math.abs(p),q)!==1))
      throw new Error("Hofstadter requires reduced p/q (or zero flux 0/1) and an odd momentum grid");
    return {schema:"quantum-job/v1",jobId,operation:"topology",engine:"native",
      model:{type:"hofstadter",source,parameters:{p,q,hopping:numeric(draft.hopping??"1",.25,2),grid,stripCells,stripSamples,
        ...(occupiedBands===undefined?{}:{occupiedBands})}}};
  }
  return { schema: "quantum-job/v1", jobId, operation: "topology", engine: "native",
    model: { type: "qwz", parameters: { mass: numeric(draft.mass, -6, 6), grid: numeric(draft.grid, 11, 31, true) }, source } };
}

export function consistentTopologyResult(job: TopologyJob, result: TopologyResult): boolean {
  if (result.jobId !== job.jobId || JSON.stringify(result.model) !== JSON.stringify(job.model) ||
      result.analysis.kind !== job.model.type) return false;
  const a = result.analysis;
  if(job.model.type==="hofstadter"&&a.kind==="hofstadter"){
    const p=job.model.parameters,g=p.grid,q=p.q,near=(x:number,y:number)=>Math.abs(x-y)<1e-9;
    if(!near(a.flux,p.p/q)||a.kxValues.length!==g||a.kyValues.length!==g||
       a.bandIndices.length!==q||a.bandEnergies.length!==q||a.coarseBounds.length!==q||
       a.fineBounds.length!==q||a.extremaDrift.length!==q||
       a.units.flux!=="flux quanta per plaquette"||a.units.momentum!=="rad / lattice constant"||
       a.units.energy!=="hopping energy")return false;
    for(let i=0;i<g;i++){
      if(!near(a.kxValues[i],-Math.PI/q+2*Math.PI*i/(q*(g-1)))||
         !near(a.kyValues[i],-Math.PI+2*Math.PI*i/(g-1)))return false;
    }
    for(let band=0;band<q;band++){
      const values=a.bandEnergies[band],coarse=a.coarseBounds[band],fine=a.fineBounds[band];
      if(a.bandIndices[band]!==band||values.length!==g*g||values.some(v=>!Number.isFinite(v)||Math.abs(v)>8.000001)||
         coarse.length!==2||fine.length!==2||!near(coarse[0],Math.min(...values))||
         !near(coarse[1],Math.max(...values))||fine.some(v=>!Number.isFinite(v))||
         !near(a.extremaDrift[band],Math.max(Math.abs(coarse[0]-fine[0]),Math.abs(coarse[1]-fine[1]))))return false;
    }
    if(a.chernGaps!==undefined){
      if(a.chernGaps.length!==q-1)return false;
      for(let index=0;index<a.chernGaps.length;index++){
        const item=a.chernGaps[index],defined=item.status==="defined";
        if(item.occupiedBands!==index+1||item.mesh!==2*(g-1)||
           !Number.isFinite(item.coarseGap)||!Number.isFinite(item.fineGap)||
           item.coarseGap<0||item.fineGap<0||
           (item.coarseChern!==null&&!Number.isFinite(item.coarseChern))||
           (item.fineChern!==null&&!Number.isFinite(item.fineChern))||
           (item.minimumLink!==null&&(!Number.isFinite(item.minimumLink)||item.minimumLink<0||item.minimumLink>1.000001))||
           defined!==(item.chern!==null)||
           (defined&&(item.plaquetteFlux.length!==item.mesh**2||item.minimumLink===null||
             item.coarseChern===null||item.fineChern===null||
             Math.abs(item.coarseChern-item.chern!)>1e-6||Math.abs(item.fineChern-item.chern!)>1e-6||
             Math.abs(item.plaquetteFlux.reduce((sum,value)=>sum+value,0)/(2*Math.PI)-item.chern!)>1e-6))||
           (!defined&&item.plaquetteFlux.length!==0)||
           (item.status==="gap-closed"&&Math.min(item.coarseGap,item.fineGap)>1e-6*p.hopping))return false;
      }
    }
    if(p.occupiedBands!==undefined){
      const f=a.filling,r=p.occupiedBands;
      if(!f||f.occupiedBands!==r||r<1||r>=q||
         !near(f.coarseGlobalGap,a.coarseBounds[r][0]-a.coarseBounds[r-1][1])||
         !near(f.fineGlobalGap,a.fineBounds[r][0]-a.fineBounds[r-1][1]))return false;
      const status=Math.min(f.coarseGlobalGap,f.fineGlobalGap)<=1e-6*p.hopping?"gap-closed":
        Math.max(...a.extremaDrift)>.05*p.hopping?"mesh-unresolved":"open";
      if(f.gapStatus!==status||
         (status==="open"?!near(f.fermiEnergy!,
           (a.fineBounds[r][0]+a.fineBounds[r-1][1])/2):f.fermiEnergy!==null))return false;
      const item=a.chernGaps?.[r-1],chern=item?.status==="defined"?item.chern:null;
      const residual=chern===null||chern===undefined?null:((r+p.p*chern)%q+q)%q;
      const hallStatus=status==="gap-closed"?"gap-closed":
        status==="open"&&chern!==null&&chern!==undefined&&residual===0?"defined":"mesh-unresolved";
      if(f.conductanceUnit!=="e^2/h"||f.method!=="TKNN from FHS occupied Chern; kx-ky orientation"||
         f.diophantineResidual!==residual||f.status!==hallStatus||
         f.chern!==(hallStatus==="defined"?chern:null)||
         f.conductance!==(hallStatus==="defined"?chern:null))return false;
    }else if(a.filling!==undefined)return false;
    if(a.strip!==undefined){
      const strip=a.strip,c=p.stripCells,s=p.stripSamples;
      if(c===undefined||s===undefined||strip.cells!==c||strip.edgeSites!==2||
         strip.boundary!=="open-x / periodic-y"||strip.kyValues.length!==s||
         strip.stateIndices.length!==c||strip.energies.length!==c||
         strip.leftWeights.length!==c||strip.rightWeights.length!==c||
         strip.maxResidual<0||strip.maxResidual>1e-6||
         strip.maxNormError<0||strip.maxNormError>1e-6)return false;
      for(let k=0;k<s;k++)if(!near(strip.kyValues[k],-Math.PI+2*Math.PI*k/(s-1)))return false;
      for(let state=0;state<c;state++){
        if(strip.stateIndices[state]!==state||strip.energies[state].length!==s||
           strip.leftWeights[state].length!==s||strip.rightWeights[state].length!==s)return false;
        for(let k=0;k<s;k++){
          const energy=strip.energies[state][k],left=strip.leftWeights[state][k],right=strip.rightWeights[state][k];
          if(!Number.isFinite(energy)||Math.abs(energy)>8.000001||
             !Number.isFinite(left)||!Number.isFinite(right)||left<0||right<0||
             left+right>1.000001)return false;
        }
      }
    }else if(p.stripCells!==undefined||p.stripSamples!==undefined)return false;
    return a.converged===(Math.max(...a.extremaDrift)<=.05*p.hopping);
  }
  if(job.model.type==="landau_continuum"&&a.kind==="landau_continuum"){
    const p=job.model.parameters,n=p.fieldSamples,levels=p.levels;
    if(a.fieldValues.length!==n||a.energies.length!==n||a.cyclotronFrequencies.length!==n||
       a.coarseMaxErrors.length!==n||a.fineMaxErrors.length!==n||
       a.levelIndices.length!==levels||a.levelIndices.some((value,i)=>value!==i)||
       JSON.stringify(a.units)!==JSON.stringify({field:"normalized magnetic field",energy:"normalized energy",hbar:"1",mass:"normalized mass",charge:"elementary charge"}))return false;
    for(let i=0;i<n;i++){
      const field=p.fieldStart+(p.fieldStop-p.fieldStart)*i/(n-1),omega=Math.abs(p.charge*field)/p.mass;
      if(Math.abs(a.fieldValues[i]-field)>1e-10||Math.abs(a.cyclotronFrequencies[i]-omega)>1e-10||
         a.energies[i].length!==levels||a.energies[i].some((value,j)=>Math.abs(value-omega*(j+.5))>1e-10)||
         !Number.isFinite(a.coarseMaxErrors[i])||!Number.isFinite(a.fineMaxErrors[i])||
         a.coarseMaxErrors[i]<0||a.fineMaxErrors[i]<0)return false;
    }
    return a.converged===a.fineMaxErrors.every((fine,i)=>fine<a.coarseMaxErrors[i]&&fine<.05);
  }
  if(job.model.type==="nodal_line_two_band"&&a.kind==="nodal_line_two_band"){
    const p=job.model.parameters,n=p.samples,r=p.mass>0?Math.sqrt(p.mass/p.curvature):null;
    if(a.ringRadius!==null&&(!Number.isFinite(a.ringRadius)||r===null||Math.abs(a.ringRadius-r)>1e-9)||
      (a.ringRadius===null)!==(r===null)||a.ringPositions.length!==(r===null?0:64)||
      a.loopPositions.length!==n||a.lowerBand.length!==n||a.upperBand.length!==n)return false;
    for(let i=0;i<a.ringPositions.length;i++){
      const t=2*Math.PI*i/64,q=a.ringPositions[i];
      if(q.length!==3||Math.abs(q[0]-r!*Math.cos(t))>1e-9||
        Math.abs(q[1]-r!*Math.sin(t))>1e-9||Math.abs(q[2])>1e-9)return false;
    }
    const angles:number[]=[];let gap=Infinity,minLink=1;
    for(let i=0;i<n;i++){
      const t=2*Math.PI*i/n,q=a.loopPositions[i],x=p.loopCenter+p.loopRadius*Math.cos(t),z=p.loopRadius*Math.sin(t);
      if(q.length!==3||!q.every(Number.isFinite)||Math.abs(q[0]-x)>1e-9||Math.abs(q[1])>1e-9||Math.abs(q[2]-z)>1e-9)return false;
      const dx=p.mass-p.curvature*x*x,dz=p.velocity*z,e=Math.hypot(dx,dz);
      if(Math.abs(a.lowerBand[i]+e)>1e-8||Math.abs(a.upperBand[i]-e)>1e-8)return false;
      angles.push(Math.atan2(dz,dx));gap=Math.min(gap,2*e);
    }
    const nodeRadius=r??(p.mass===0?0:null),closed=nodeRadius!==null&&
      [-1,1].some(sign=>Math.abs(Math.abs(p.loopCenter+sign*p.loopRadius)-nodeRadius)<1e-9);
    if(closed)return a.status==="gap-closed"&&a.berryPhase===null&&a.winding===null&&
      a.minimumLink===null&&a.convergenceError===null&&a.loopGap===0;
    if(Math.abs(a.loopGap-gap)>1e-8||a.minimumLink===null||!Number.isFinite(a.minimumLink)||
      a.convergenceError===null||!Number.isFinite(a.convergenceError))return false;
    let turns=0;
    for(let i=0;i<n;i++){
      const step=Math.atan2(Math.sin(angles[(i+1)%n]-angles[i]),Math.cos(angles[(i+1)%n]-angles[i]));
      turns+=step;minLink=Math.min(minLink,Math.abs(Math.cos(step/2)));
    }
    const winding=Math.round(turns/(2*Math.PI)),expected=Math.PI*(Math.abs(winding)%2);
    if(Math.abs(a.minimumLink-minLink)>1e-8||a.convergenceError<0||a.convergenceError>Math.PI)return false;
    const resolved=minLink>.01&&a.convergenceError<.01;
    return resolved?a.status==="defined"&&a.winding===winding&&a.berryPhase!==null&&
      Math.abs(a.berryPhase-expected)<.01: a.status==="mesh-unresolved"&&a.winding===null&&a.berryPhase===null;
  }
  if(job.model.type==="weyl_minimal"&&a.kind==="weyl_minimal"){
    const p=job.model.parameters,n=10*4**p.subdivisions+2,f=20*4**p.subdivisions;
    if(a.positions.length!==n||a.triangles.length!==f||a.lowerBand.length!==n||a.upperBand.length!==n||
      a.berryCurvature.length!==n||a.faceFlux.length!==f||a.node.some(v=>Math.abs(v)>1e-12)||
      a.chirality!==p.chirality||Math.abs(a.sphereGap-2*p.velocity*p.radius)>1e-8)return false;
    for(let i=0;i<n;i++){
      const q=a.positions[i],b=a.berryCurvature[i],r=Math.hypot(...q);
      if(q.length!==3||b.length!==3||!q.every(Number.isFinite)||!b.every(Number.isFinite)||
        Math.abs(r-p.radius)>1e-8||Math.abs(a.lowerBand[i]+p.velocity*p.radius)>1e-8||
        Math.abs(a.upperBand[i]-p.velocity*p.radius)>1e-8||
        b.some((v,j)=>Math.abs(v+p.chirality*q[j]/(2*r**3))>1e-8))return false;
    }
    const dot=(x:number[],y:number[])=>x[0]*y[0]+x[1]*y[1]+x[2]*y[2];
    const cross=(x:number[],y:number[])=>[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
    let flux=0,minLink=1;
    for(let i=0;i<f;i++){
      const ids=a.triangles[i];
      if(ids.length!==3||ids.some(id=>!Number.isInteger(id)||id<0||id>=n)||new Set(ids).size!==3)return false;
      const [u,v,w]=ids.map(id=>a.positions[id].map(x=>x/p.radius));
      const uv=dot(u,v),vw=dot(v,w),wu=dot(w,u);
      const orient=dot(u,cross(v,w));
      if(orient<=0)return false;
      const solid=2*Math.atan2(orient,1+uv+vw+wu),expected=-p.chirality*solid/2;
      if(Math.abs(a.faceFlux[i]-expected)>1e-8)return false;
      flux+=a.faceFlux[i];minLink=Math.min(minLink,Math.sqrt((1+uv)/2),Math.sqrt((1+vw)/2),Math.sqrt((1+wu)/2));
    }
    const resolved=minLink>.01&&Math.abs(flux/(2*Math.PI)+p.chirality)<.01;
    return Math.abs(a.flux-flux)<1e-8&&Math.abs(a.minimumLink-minLink)<1e-8&&
      a.meshResolved===resolved&&a.lowerChern===(resolved?-p.chirality:null);
  }
  if(job.model.type==="kitaev_chain"&&a.kind==="kitaev_chain"){
    const p=job.model.parameters,n=p.kPoints,d=a.finite;
    if(a.kValues.length!==n||a.lowerBand.length!==n||a.upperBand.length!==n||
      d.cells!==p.cells||d.nearZeroEnergies.length!==2||d.nearZeroEnergies.some(v=>!Number.isFinite(v))||
      d.siteDensity.length!==p.cells||d.siteDensity.some(v=>!Number.isFinite(v)||v<0||v>1.000001)||
      Math.abs(d.siteDensity.reduce((s,v)=>s+v,0)-1)>1e-6||
      Math.abs(d.endWeight-d.siteDensity[0]-d.siteDensity[d.siteDensity.length-1])>1e-6||
      Math.abs(d.nearZeroEnergies[0]+d.nearZeroEnergies[1])>1e-7)return false;
    let sampled=Infinity;
    for(let i=0;i<n;i++){
      const k=-Math.PI+2*Math.PI*i/(n-1),e=Math.hypot(p.mu+2*p.hopping*Math.cos(k),2*p.pairing*Math.sin(k));
      sampled=Math.min(sampled,2*e);
      if(Math.abs(a.kValues[i]-k)>1e-10||Math.abs(a.lowerBand[i]+e)>1e-8||
        Math.abs(a.upperBand[i]-e)>1e-8)return false;
    }
    if(a.invariant){
      const w=a.invariant,signs=[Math.sign(-p.mu-2*p.hopping),Math.sign(-p.mu+2*p.hopping)];
      if(w.method!=="Pfaffian signs at k=0,pi; chiral q winding on sampled periodic mesh"||
        w.curveX.length!==n||w.curveY.length!==n||w.pfaffianSigns[0]!==signs[0]||
        w.pfaffianSigns[1]!==signs[1])return false;
      let turns=0,maxStep=0;
      for(let i=0;i<n;i++){
        const x=-p.mu-2*p.hopping*Math.cos(a.kValues[i]),y=-2*p.pairing*Math.sin(a.kValues[i]);
        if(Math.abs(w.curveX[i]-x)>1e-8||Math.abs(w.curveY[i]-y)>1e-8)return false;
        if(i>0){const step=Math.atan2(y*w.curveX[i-1]-x*w.curveY[i-1],x*w.curveX[i-1]+y*w.curveY[i-1]);
          turns+=step;maxStep=Math.max(maxStep,Math.abs(step));}
      }
      const closed=Math.abs(Math.abs(p.mu)-2*p.hopping)<1e-10;
      if(closed){if(w.status!=="bulk-gap-closed"||w.parity!==null||w.winding!==null||w.maxPhaseStep!==null)return false;}
      else {const parity=Number(signs[0]!==signs[1]),candidate=Math.round(turns/(2*Math.PI));
        const resolved=Math.abs(turns/(2*Math.PI)-candidate)<1e-8&&maxStep<Math.PI/2&&
          (candidate===0||candidate===1)&&candidate%2===parity;
        if(w.parity!==parity||w.winding!==(resolved?candidate:null)||
          w.status!==(resolved?"defined":"mesh-unresolved")||
          w.maxPhaseStep===null||Math.abs(w.maxPhaseStep-maxStep)>1e-8)return false;}
    }
    const curvature=p.hopping*p.hopping-p.pairing*p.pairing;
    const candidates=[-1,1];
    if(curvature>0)candidates.push(Math.max(-1,Math.min(1,-p.mu*p.hopping/(2*curvature))));
    const gap=2*Math.min(...candidates.map(x=>Math.hypot(p.mu+2*p.hopping*x,2*p.pairing*Math.sqrt(1-x*x))));
    return Math.abs(a.bulkGap-gap)<1e-8&&Math.abs(a.sampledGap-sampled)<1e-8&&
      a.gapClosed===(gap<1e-10);
  }
  if(job.model.type==="bbh"&&a.kind==="bbh"){
    const p=job.model.parameters,g=p.grid,c=p.cells,d=a.finite;
    if(a.bandKValues.length!==g||a.bandEnergies.length!==4||
      a.bandEnergies.some(row=>row.length!==g*g||row.some(v=>!Number.isFinite(v)))||
      d.cells!==c||d.midgapEnergies.length!==4||d.midgapEnergies.some(v=>!Number.isFinite(v))||
      d.midgapDensity.length!==c*c||d.midgapDensity.some(v=>!Number.isFinite(v)||v<0||v>1.000001)||
      Math.abs(d.midgapDensity.reduce((sum,v)=>sum+v,0)-1)>1e-6)return false;
    const corners=[0,c-1,c*(c-1),c*c-1];
    if(Math.abs(d.cornerWeight-corners.reduce((sum,i)=>sum+d.midgapDensity[i],0))>1e-6)return false;
    let gap=Infinity;
    for(let x=0;x<g;x++){
      const kx=-Math.PI+2*Math.PI*x/g;
      if(Math.abs(a.bandKValues[x]-kx)>1e-10)return false;
      for(let y=0;y<g;y++){
        const ky=-Math.PI+2*Math.PI*y/g;
        const e=Math.hypot(p.gammaX+p.lambdaX*Math.cos(kx),p.lambdaX*Math.sin(kx),
          p.gammaY+p.lambdaY*Math.cos(ky),p.lambdaY*Math.sin(ky));
        gap=Math.min(gap,2*e);
        if([0,1,2,3].some(j=>Math.abs(a.bandEnergies[j][x*g+y]-(j<2?-e:e))>1e-8))return false;
      }
    }
    if(a.wilson){
      const w=a.wilson;
      const exact=2*Math.hypot(Math.abs(p.gammaX)-p.lambdaX,Math.abs(p.gammaY)-p.lambdaY);
      const phaseGap=(rows:[number[],number[]])=>Math.min(...rows[0].map((value,i)=>{
        const delta=Math.abs(value-rows[1][i]);return Math.min(delta,1-delta);
      }));
      const validPhases=(rows:[number[],number[]])=>rows.length===2&&rows.every(row=>row.length===g&&
        row.every(v=>Number.isFinite(v)&&v>=-.500001&&v<=.500001));
      if(!validPhases(w.wannierX)||!validPhases(w.wannierY)||
        !Number.isFinite(w.minOccupiedLinkSingular)||w.minOccupiedLinkSingular<0||w.minOccupiedLinkSingular>1.000001||
        Math.abs(w.bulkGapExact-exact)>1e-8||
        Math.abs(w.wannierGapX-phaseGap(w.wannierX))>1e-8||
        Math.abs(w.wannierGapY-phaseGap(w.wannierY))>1e-8)return false;
      const pair=(values:[number|null,number|null])=>values.length===2&&values.every(v=>v===null||
        Number.isFinite(v)&&v>=0&&v<=1);
      if(!pair(w.nestedX)||!pair(w.nestedY))return false;
      const quantized=(values:[number|null,number|null]):0|0.5|null=>{
        if(values.some(v=>v===null))return null;
        if(values.every(v=>Math.min(v!,1-v!)<1e-3))return 0;
        if(values.every(v=>Math.abs(v!-.5)<1e-3))return .5;
        return null;
      };
      const px=quantized(w.nestedY),py=quantized(w.nestedX);
      const q=px!==null&&px===py?px:null;
      const loopsDefined=exact>1e-8&&Math.min(w.wannierGapX,w.wannierGapY,w.minOccupiedLinkSingular)>1e-6&&
        w.nestedX.every(v=>v!==null)&&w.nestedY.every(v=>v!==null);
      const status=q!==null?"defined":exact<=1e-8?"bulk-gap-closed":
        Math.min(w.wannierGapX,w.wannierGapY)<=1e-6?"wannier-gap-closed":"unresolved";
      if(w.defined!==loopsDefined||w.quadrupole!==q||w.status!==status||
        (status==="defined"&&Math.min(w.wannierGapX,w.wannierGapY,w.minOccupiedLinkSingular)<=1e-6)||
        (status!=="defined"&&w.nestedX.some(v=>v!==null)&&
          (status==="bulk-gap-closed"||status==="wannier-gap-closed")))return false;
    }
    return Number.isFinite(a.bulkGap)&&Math.abs(a.bulkGap-gap)<1e-8&&
      d.midgapEnergies.every((v,i)=>i===0||v>=d.midgapEnergies[i-1]-1e-8);
  }
  if (job.model.type === "ssh" && a.kind === "ssh") {
    const { t1, t2, cells, kPoints } = job.model.parameters;
    const gap = 2 * Math.abs(Math.abs(t1) - Math.abs(t2));
    return a.kValues.length === kPoints && a.lowerBand.length === kPoints && a.upperBand.length === kPoints &&
      a.edgeDensity.length === 2 * cells && Math.abs(a.bulkGap - gap) < 1e-8 &&
      a.winding === (gap < 1e-10 ? null : Number(Math.abs(t2) > Math.abs(t1))) &&
      Math.abs(a.edgeDensity.reduce((sum, value) => sum + value, 0) - 1) < 1e-7 &&
      Math.abs(a.edgeWeight - a.edgeDensity[0] - a.edgeDensity[a.edgeDensity.length - 1]) < 1e-7 &&
      a.kValues.every((k,i)=>Number.isFinite(k)&&Math.abs(k-(-Math.PI+2*Math.PI*i/(kPoints-1)))<1e-10 &&
        Number.isFinite(a.lowerBand[i])&&Number.isFinite(a.upperBand[i])&&Math.abs(a.upperBand[i]-Math.hypot(t1+t2*Math.cos(k),t2*Math.sin(k)))<1e-10&&Math.abs(a.lowerBand[i]+a.upperBand[i])<1e-10);
  }
  if (job.model.type === "rice_mele" && a.kind === "rice_mele") {
    const { t1, t2, delta, cells, kPoints } = job.model.parameters;
    const gap = 2*Math.hypot(delta, Math.abs(t1)-Math.abs(t2));
    if (a.kValues.length!==kPoints || a.lowerBand.length!==kPoints || a.upperBand.length!==kPoints ||
        a.finiteEnergies.length!==2*cells || a.middleEnergies.length!==2 || a.middleDensity.length!==2*cells ||
        Math.abs(a.bulkGap-gap)>1e-8 || a.gapClosed!==(gap<1e-10) ||
        a.units.momentum!=="rad / cell" || a.units.energy!=="hopping energy" ||
        a.units.density!=="probability per site" || a.maxResidual>1e-7 || a.maxNormError>1e-7 ||
        a.maxResidual<0 || a.maxNormError<0 ||
        Math.abs(a.middleDensity.reduce((sum,value)=>sum+value,0)-1)>1e-7 ||
        Math.abs(a.boundaryWeight-a.middleDensity[0]-a.middleDensity[2*cells-1])>1e-7 ||
        a.finiteEnergies.some((e,i)=>!Number.isFinite(e)||(i>0&&e<a.finiteEnergies[i-1]-1e-8)) ||
        Math.abs(a.finiteEnergies.reduce((sum,e)=>sum+e,0))>1e-7 ||
        Math.abs(a.middleEnergies[0]-a.finiteEnergies[cells-1])>1e-8 ||
        Math.abs(a.middleEnergies[1]-a.finiteEnergies[cells])>1e-8) return false;
    return a.kValues.every((k,i)=>{
      const expectedK=-Math.PI+2*Math.PI*i/(kPoints-1);
      const e=Math.hypot(delta,t1+t2*Math.cos(expectedK),t2*Math.sin(expectedK));
      return Number.isFinite(k)&&Math.abs(k-expectedK)<1e-10&&
        Math.abs(a.lowerBand[i]+e)<1e-8&&Math.abs(a.upperBand[i]-e)<1e-8;
    });
  }
  if(job.model.type==="rice_mele_pump"&&a.kind==="rice_mele_pump"){
    const p=job.model.parameters,n=p.kSamples,m=p.phaseSamples;
    if(a.kValues.length!==n||a.phaseValues.length!==m||a.lowerBand.length!==n*m||a.upperBand.length!==n*m||
      a.berryFlux.length!==n*m||a.polarization.length!==m+1||a.t1Values.length!==m||a.t2Values.length!==m||
      a.deltaValues.length!==m||!a.lowerBand.every(Number.isFinite)||!a.upperBand.every(Number.isFinite)||
      !a.berryFlux.every(Number.isFinite)||a.units.energy!=="hopping energy"||a.units.momentum!=="rad / cell"||
      a.units.phase!=="rad"||a.units.polarization!=="electron charge / cell")return false;
    if(a.status==="defined"?a.chern===null||a.polarizationWinding!==a.chern:a.chern!==null||a.polarizationWinding!==null)return false;
    if(a.status==="gap-closed"&&a.exactGap>1e-8)return false;
    for(let j=0;j<m;j++){
      const theta=2*Math.PI*j/m;
      if(Math.abs(a.phaseValues[j]-theta)>1e-10||Math.abs(a.t1Values[j]-(p.baseHopping+p.modulation*Math.cos(theta)))>1e-8||
        Math.abs(a.t2Values[j]-(p.baseHopping-p.modulation*Math.cos(theta)))>1e-8||
        Math.abs(a.deltaValues[j]-(p.staggerOffset+p.staggerAmplitude*Math.sin(theta)))>1e-8)return false;
      for(let x=0;x<n;x++){
        const k=-Math.PI+2*Math.PI*x/n,ix=j*n+x;
        const energy=Math.hypot(a.deltaValues[j],a.t1Values[j]+a.t2Values[j]*Math.cos(k),a.t2Values[j]*Math.sin(k));
        if(j===0&&Math.abs(a.kValues[x]-k)>1e-10||Math.abs(a.lowerBand[ix]+energy)>1e-7||Math.abs(a.upperBand[ix]-energy)>1e-7)return false;
      }
    }
    const {modulation:mod,staggerAmplitude:amp,staggerOffset:offset}=p;
    const candidates=[-1,1],curvature=amp*amp-4*mod*mod;
    if(curvature>0)candidates.push(Math.max(-1,Math.min(1,-offset*amp/curvature)));
    const exactGap=2*Math.min(...candidates.map(x=>Math.hypot(2*mod*Math.sqrt(Math.max(0,1-x*x)),offset+amp*x)));
    const fluxChern=a.berryFlux.reduce((sum,value)=>sum+value,0)/(2*Math.PI);
    return Math.abs(a.exactGap-exactGap)<1e-8&&
      Math.abs(a.coarseGap-Math.min(...a.upperBand.map((v,i)=>v-a.lowerBand[i])))<1e-8&&
      (a.coarseChern===null||Math.abs(a.coarseChern-fluxChern)<1e-6)&&
      (a.status!=="defined"||(Math.abs(a.polarization[m]-a.polarization[0]-a.polarizationWinding!)<1e-6&&
        Math.abs(a.coarseChern!-a.chern!)<1e-6&&Math.abs(a.fineChern!-a.chern!)<1e-6&&
        Math.abs(a.coarseWinding!-a.polarizationWinding!)<1e-6&&Math.abs(a.fineWinding!-a.polarizationWinding!)<1e-6));
  }
  if (job.model.type === "qwz" && a.kind === "qwz") {
    const { mass, grid } = job.model.parameters;
    const gap = 2 * Math.min(Math.abs(mass + 2), Math.abs(mass), Math.abs(mass - 2));
    if (Math.abs(a.bulkGap - gap) > 1e-8 || a.gapClosed !== (gap < 1e-10)) return false;
    if ([a.bandKValues,a.lowerBand,a.upperBand].some(v=>v!==undefined)) {
      if (!a.bandKValues || !a.lowerBand || !a.upperBand || a.bandKValues.length!==grid || a.lowerBand.length!==grid*grid || a.upperBand.length!==grid*grid) return false;
      for(let x=0;x<grid;x++) {
        const k=-Math.PI+2*Math.PI*x/grid;
        if(!Number.isFinite(a.bandKValues[x]) || Math.abs(a.bandKValues[x]-k)>1e-10) return false;
        for(let y=0;y<grid;y++) {
          const ky=-Math.PI+2*Math.PI*y/grid, e=Math.hypot(Math.sin(k),Math.sin(ky),mass+Math.cos(k)+Math.cos(ky)), i=x*grid+y;
          if(!Number.isFinite(a.lowerBand[i]) || !Number.isFinite(a.upperBand[i]) || Math.abs(a.lowerBand[i]+e)>1e-10 || Math.abs(a.upperBand[i]-e)>1e-10) return false;
        }
      }
    }
    if (a.gapClosed) return a.chern === null && a.latticeChern === null && a.analyticChern === null &&
      !a.meshResolved && a.chernIntegral === null && a.berryCurvature.length === 0;
    const expected = mass > -2 && mass < 0 ? -1 : mass > 0 && mass < 2 ? 1 : 0;
    if (a.analyticChern !== expected || a.latticeChern === null ||
        a.meshResolved !== (a.latticeChern === expected) ||
        a.chern !== (a.meshResolved ? a.latticeChern : null) ||
        a.chernIntegral === null || a.berryCurvature.length !== grid * grid) return false;
    const integral = a.berryCurvature.reduce((sum, value) => sum + value, 0) * (2 * Math.PI / grid) ** 2 / (2 * Math.PI);
    return Math.abs(integral - a.chernIntegral) < 1e-7 && a.sampledGap >= gap - 1e-7;
  }
  if (job.model.type === "bhz" && a.kind === "bhz") {
    const {mass,grid}=job.model.parameters;
    const closed=[0,4,8].some(point=>Math.abs(mass-point)<1e-10);
    if(a.gapClosed!==closed||a.bandKValues.length!==grid||a.bandEnergies.length!==4||
       a.bandEnergies.some(values=>values.length!==grid*grid)||!Number.isFinite(a.sampledGap)||a.sampledGap<0)return false;
    let minimum=Infinity;
    for(let x=0;x<grid;x++){
      const kx=-Math.PI+2*Math.PI*x/grid;
      if(!Number.isFinite(a.bandKValues[x])||Math.abs(a.bandKValues[x]-kx)>1e-10)return false;
      for(let y=0;y<grid;y++){
        const ky=-Math.PI+2*Math.PI*y/grid,dx=Math.sin(kx),dy=-Math.sin(ky);
        const dz=mass-2*(2-Math.cos(kx)-Math.cos(ky)),e=Math.hypot(dx,dy,dz),i=x*grid+y;
        minimum=Math.min(minimum,2*e);
        if([0,1,2,3].some(j=>!Number.isFinite(a.bandEnergies[j][i])||
          Math.abs(a.bandEnergies[j][i]-(j<2?-e:e))>1e-9))return false;
      }
    }
    if(Math.abs(a.sampledGap-minimum)>1e-8||Math.abs(a.bulkGap-(closed?0:minimum))>1e-8)return false;
    if(closed)return a.blockChern===null&&a.partnerChern===null&&a.expectedBlockChern===null&&a.z2===null&&!a.meshResolved;
    const expected=mass>0&&mass<4?1:mass>4&&mass<8?-1:0;
    return a.expectedBlockChern===expected&&a.blockChern!==null&&a.partnerChern!==null&&
      [-1,0,1].includes(a.blockChern)&&[-1,0,1].includes(a.partnerChern)&&
      a.meshResolved===(a.blockChern===expected&&a.partnerChern===-a.blockChern)&&
      a.z2===(a.meshResolved?Math.abs(a.blockChern)%2:null);
  }
  if(job.model.type==="bhz_general"&&a.kind==="bhz_general"){
    const p=job.model.parameters,g=p.grid,n=4*p.edgeCells,m=p.edgeSamples;
    if(Math.abs(p.R)>p.A/2||a.latticeKValues.length!==g||a.continuumKValues.length!==g||
      a.latticeBandEnergies.length!==4||a.continuumBandEnergies.length!==4||
      [...a.latticeBandEnergies,...a.continuumBandEnergies].some(row=>row.length!==g*g||row.some(v=>!Number.isFinite(v)))||
      a.edge.kValues.length!==m||a.edge.energies.length!==m||a.edge.weights.length!==m||
      a.edge.energies.some(row=>row.length!==n||row.some(v=>!Number.isFinite(v)))||
      a.edge.weights.some(row=>row.length!==n||row.some(v=>!Number.isFinite(v)||v<0||v>1.000001))||
      a.bulkStates.length!==4||a.edge.states.length!==4)return false;
    const trim=[p.M,p.M-4*p.B,p.M-4*p.B,p.M-8*p.B],parity=trim.map(v=>v>1e-9?1:v< -1e-9?-1:0),closed=parity.includes(0);
    if(a.gapClosed!==closed||a.paritySigns.length!==4||a.paritySigns.some((v,i)=>v!==parity[i])||
      (closed&&(a.bulkGap!==0||a.z2!==null||a.meshResolved))||
      (!closed&&a.z2!==(a.meshResolved?Number(parity.reduce<number>((v,w)=>v*w,1)<0):null))||
      (p.R!==0&&(a.blockChern!==null||a.partnerChern!==null))||
      (p.R===0&&a.blockChern!==null&&a.partnerChern!==-a.blockChern))return false;
    const stateOk=(state:{energy:number;spin:number[];amplitudes:[number,number][]},length:number)=>
      Number.isFinite(state.energy)&&state.spin.length===3&&state.spin.every(v=>Number.isFinite(v)&&Math.abs(v)<=1.000001)&&
      state.amplitudes.length===length&&state.amplitudes.every(pair=>pair.length===2&&pair.every(Number.isFinite))&&
      Math.abs(state.amplitudes.reduce((sum,[re,im])=>sum+re*re+im*im,0)-1)<1e-6;
    if(a.bulkStates.some(state=>!stateOk(state,4))||a.edge.states.some(state=>
      !stateOk(state,n)||state.density.length!==p.edgeCells||state.density.some(v=>!Number.isFinite(v)||v<0)||
      Math.abs(state.density.reduce((sum,v)=>sum+v,0)-1)>1e-6||
      Math.abs(state.edgeWeight-state.density.slice(0,2).reduce((sum,v)=>sum+v,0)-
        state.density.slice(-2).reduce((sum,v)=>sum+v,0))>1e-6))return false;
    if(a.edge.selectedKIndex!==Math.floor(m/2)+1||
      a.edge.states.some((state,i)=>Math.abs(state.energy-a.edge.energies[a.edge.selectedKIndex][2*p.edgeCells-2+i])>1e-7))return false;
    let sampled=Infinity;
    for(let i=0;i<g;i++)for(let j=0;j<g;j++){
      const check=(domain:"lattice"|"continuum")=>{
        const k=domain==="lattice"?a.latticeKValues:a.continuumKValues;
        const x=domain==="lattice"?Math.sin(k[i]):k[i],y=domain==="lattice"?Math.sin(k[j]):k[j];
        const q2=domain==="lattice"?2*(2-Math.cos(k[i])-Math.cos(k[j])):k[i]*k[i]+k[j]*k[j];
        const epsilon=p.C-p.D*q2,energy=Math.hypot(p.M-p.B*q2,Math.hypot(p.A,p.R)*Math.hypot(x,y));
        const bands=domain==="lattice"?a.latticeBandEnergies:a.continuumBandEnergies;
        const expected=[epsilon-energy,epsilon-energy,epsilon+energy,epsilon+energy];
        if(domain==="lattice")sampled=Math.min(sampled,2*energy);
        return expected.every((value,band)=>Math.abs(bands[band][i*g+j]-value)<1e-8);
      };
      if(!check("lattice")||!check("continuum"))return false;
    }
    if(Math.abs(a.sampledGap-sampled)>1e-8||!Number.isFinite(a.bulkGap)||a.bulkGap<0||
      (!closed&&a.bulkGap>a.sampledGap+1e-7))return false;
    return a.latticeKValues.every((value,i)=>Math.abs(value-(-Math.PI+2*Math.PI*i/g))<1e-10)&&
      a.continuumKValues.every((value,i)=>Math.abs(value-(-p.continuumExtent+2*p.continuumExtent*i/(g-1)))<1e-10)&&
      a.edge.kValues.every((value,i)=>Math.abs(value-(-Math.PI+2*Math.PI*i/(m-1)))<1e-10);
  }
  return false;
}

// Browser-safe structural guard. Unlike the AJV contract compiler this uses no
// runtime code generation, so the web client's strict CSP can remain intact.
export function isTopologyResponse(value: unknown, job: TopologyJob): value is TopologyResult {
  const record = (item: unknown): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item);
  const finite = (item: unknown): item is number => typeof item === "number" && Number.isFinite(item);
  const numericArray = (item: unknown, size: number) => Array.isArray(item) && item.length === size && item.every(finite);
  if (!record(value) || value.schema !== "quantum-result/v1" || value.status !== "completed" ||
      value.operation !== "topology" || value.jobId !== job.jobId ||
      typeof value.runId !== "string" || !/^run-[A-Za-z0-9_-]{1,96}$/.test(value.runId) ||
      !record(value.model) || JSON.stringify(value.model) !== JSON.stringify(job.model) ||
      !record(value.engine) || value.engine.name !== "native" || typeof value.engine.version !== "string" ||
      !record(value.provenance) || typeof value.provenance.pythonVersion !== "string" ||
      typeof value.provenance.workerVersion !== "string" || typeof value.provenance.computedAt !== "string" ||
      !finite(value.provenance.durationMs) || value.provenance.durationMs < 0 || !record(value.analysis)) return false;
  const a = value.analysis;
  if (job.model.type === "ssh") {
    const { cells, kPoints } = job.model.parameters;
    if (a.kind !== "ssh" || !finite(a.bulkGap) || a.bulkGap < 0 ||
        !(a.winding === null || a.winding === 0 || a.winding === 1) ||
        !numericArray(a.kValues, kPoints) || !numericArray(a.lowerBand, kPoints) ||
        !numericArray(a.upperBand, kPoints) || !numericArray(a.edgeEnergies, 2) ||
        !numericArray(a.edgeDensity, 2 * cells) || !finite(a.edgeWeight) || a.edgeWeight < 0 || a.edgeWeight > 1) return false;
  } else if(job.model.type==="rice_mele_pump"){
    const {kSamples:n,phaseSamples:m}=job.model.parameters;
    if(a.kind!=="rice_mele_pump"||!["defined","gap-closed","mesh-unresolved"].includes(String(a.status))||
      !numericArray(a.kValues,n)||!numericArray(a.phaseValues,m)||!numericArray(a.t1Values,m)||
      !numericArray(a.t2Values,m)||!numericArray(a.deltaValues,m)||!numericArray(a.lowerBand,n*m)||
      !numericArray(a.upperBand,n*m)||!numericArray(a.berryFlux,n*m)||!numericArray(a.polarization,m+1)||
      !finite(a.exactGap)||!finite(a.coarseGap)||!finite(a.fineGap)||!finite(a.minimumLink)||
      !finite(a.fineMinimumLink)||!record(a.units)||typeof a.method!=="string"||
      !(a.chern===null||[-1,0,1].includes(Number(a.chern)))||
      !(a.polarizationWinding===null||[-1,0,1].includes(Number(a.polarizationWinding))))return false;
  } else if (job.model.type === "rice_mele") {
    const { cells, kPoints } = job.model.parameters;
    if (a.kind!=="rice_mele" || !finite(a.bulkGap) || a.bulkGap<0 || typeof a.gapClosed!=="boolean" ||
        !numericArray(a.kValues,kPoints) || !numericArray(a.lowerBand,kPoints) ||
        !numericArray(a.upperBand,kPoints) || !numericArray(a.finiteEnergies,2*cells) ||
        !numericArray(a.middleEnergies,2) || !numericArray(a.middleDensity,2*cells) ||
        !finite(a.boundaryWeight) || a.boundaryWeight<0 || a.boundaryWeight>1 ||
        !finite(a.maxResidual) || !finite(a.maxNormError) || !record(a.units)) return false;
  } else if (job.model.type === "qwz") {
    const { grid } = job.model.parameters;
    const phase = (item: unknown) => item === null || item === -1 || item === 0 || item === 1;
    if ([a.bandKValues,a.lowerBand,a.upperBand].some(v=>v!==undefined) && (!numericArray(a.bandKValues,grid)||!numericArray(a.lowerBand,grid*grid)||!numericArray(a.upperBand,grid*grid))) return false;
    if (a.kind !== "qwz" || !finite(a.bulkGap) || a.bulkGap < 0 ||
        !finite(a.sampledGap) || a.sampledGap < 0 || typeof a.gapClosed !== "boolean" ||
        typeof a.meshResolved !== "boolean" || !phase(a.chern) || !phase(a.latticeChern) ||
        !phase(a.analyticChern) || !(a.chernIntegral === null || finite(a.chernIntegral)) ||
        !numericArray(a.berryCurvature, a.gapClosed ? 0 : grid * grid)) return false;
  } else if(job.model.type==="bhz") {
    const {grid}=job.model.parameters;
    const phase=(item:unknown)=>item===null||item===-1||item===0||item===1;
    if(a.kind!=="bhz"||!finite(a.bulkGap)||a.bulkGap<0||!finite(a.sampledGap)||a.sampledGap<0||
       typeof a.gapClosed!=="boolean"||typeof a.meshResolved!=="boolean"||
       !phase(a.blockChern)||!phase(a.partnerChern)||!phase(a.expectedBlockChern)||
       !(a.z2===null||a.z2===0||a.z2===1)||!numericArray(a.bandKValues,grid)||
       !Array.isArray(a.bandEnergies)||a.bandEnergies.length!==4||
       !a.bandEnergies.every((item:unknown)=>numericArray(item,grid*grid)))return false;
  } else if(job.model.type==="hofstadter"){
    const {q,grid}=job.model.parameters;
    const pairs=(item:unknown)=>Array.isArray(item)&&item.length===q&&item.every(row=>numericArray(row,2));
    if(a.kind!=="hofstadter"||!finite(a.flux)||!numericArray(a.kxValues,grid)||
       !numericArray(a.kyValues,grid)||!numericArray(a.bandIndices,q)||
       !Array.isArray(a.bandEnergies)||a.bandEnergies.length!==q||
       !a.bandEnergies.every(row=>numericArray(row,grid*grid))||!pairs(a.coarseBounds)||
       !pairs(a.fineBounds)||!numericArray(a.extremaDrift,q)||
       typeof a.converged!=="boolean"||!record(a.units))return false;
    if(a.chernGaps!==undefined&&(!Array.isArray(a.chernGaps)||a.chernGaps.length!==q-1||
      !a.chernGaps.every((item:unknown)=>record(item)&&Number.isInteger(item.occupiedBands)&&
        finite(item.coarseGap)&&finite(item.fineGap)&&
        (item.coarseChern===null||finite(item.coarseChern))&&
        (item.fineChern===null||finite(item.fineChern))&&
        (item.chern===null||Number.isInteger(item.chern))&&
        (item.minimumLink===null||finite(item.minimumLink))&&
        ["defined","gap-closed","mesh-unresolved"].includes(String(item.status))&&
        Number.isInteger(item.mesh)&&numericArray(item.plaquetteFlux,
          item.status==="defined"?Number(item.mesh)**2:0))))return false;
    if(a.strip!==undefined){
      const strip=a.strip,c=job.model.parameters.stripCells,s=job.model.parameters.stripSamples;
      if(!record(strip)||c===undefined||s===undefined||strip.cells!==c||
         strip.edgeSites!==2||strip.boundary!=="open-x / periodic-y"||
         !numericArray(strip.kyValues,s)||!numericArray(strip.stateIndices,c)||
         !Array.isArray(strip.energies)||!Array.isArray(strip.leftWeights)||
         !Array.isArray(strip.rightWeights)||strip.energies.length!==c||
         strip.leftWeights.length!==c||strip.rightWeights.length!==c||
         !strip.energies.every(row=>numericArray(row,s))||
         !strip.leftWeights.every(row=>numericArray(row,s))||
         !strip.rightWeights.every(row=>numericArray(row,s))||
         !finite(strip.maxResidual)||!finite(strip.maxNormError))return false;
      if(strip.continuation!==undefined){
        const track=strip.continuation;
        if(!record(track))return false;
        if(track.seam!==undefined){
          const seam=track.seam;
          if(!record(seam)||seam.method!=="periodic-eigenvector-overlap/v1"||
            !finite(seam.minimumOverlap)||Number(seam.minimumOverlap)<0||Number(seam.minimumOverlap)>1.000001||
            !finite(seam.minimumMargin)||Number(seam.minimumMargin)<-1||Number(seam.minimumMargin)>1.000001||
            !finite(seam.maximumEnergyDrift)||Number(seam.maximumEnergyDrift)<0||Number(seam.maximumEnergyDrift)>1e-6||
            !Number.isInteger(seam.ambiguousStates)||Number(seam.ambiguousStates)<0||
            Number(seam.ambiguousStates)>c)return false;
        }
        if(!record(track)||track.method!=="maximum-eigenvector-overlap/hungarian-v1"||
          track.minimumOverlap!==.5||track.minimumMargin!==.02||
          !Number.isInteger(track.ambiguousCandidates)||Number(track.ambiguousCandidates)<0||
          !Array.isArray(track.crossings)||track.crossings.length>2*c*(s-1)||
          !track.crossings.every((entry:unknown)=>record(entry)&&
            ["left","right"].includes(String(entry.side))&&
            Number.isInteger(entry.stateIndex)&&Number(entry.stateIndex)>=0&&Number(entry.stateIndex)<c&&
            Number.isInteger(entry.targetStateIndex)&&Number(entry.targetStateIndex)>=0&&Number(entry.targetStateIndex)<c&&
            Number.isInteger(entry.interval)&&Number(entry.interval)>=0&&Number(entry.interval)<s-1&&
            finite(entry.ky)&&[-1,1].includes(Number(entry.direction))&&
            finite(entry.minimumWeight)&&Number(entry.minimumWeight)>=.35&&Number(entry.minimumWeight)<=1&&
            finite(entry.overlap)&&Number(entry.overlap)>=.5&&Number(entry.overlap)<=1&&
            finite(entry.margin)&&Number(entry.margin)>=.02&&Number(entry.margin)<=1))return false;
      }
    }
  } else if(job.model.type==="landau_continuum"){
    const p=job.model.parameters,n=p.fieldSamples,l=p.levels;
    if(a.kind!=="landau_continuum"||!numericArray(a.fieldValues,n)||!numericArray(a.levelIndices,l)||
      !Array.isArray(a.energies)||a.energies.length!==n||!a.energies.every(row=>numericArray(row,l))||
      !numericArray(a.cyclotronFrequencies,n)||!numericArray(a.coarseMaxErrors,n)||
      !numericArray(a.fineMaxErrors,n)||typeof a.converged!=="boolean"||!record(a.units))return false;
  } else if(job.model.type==="nodal_line_two_band"){
    const n=job.model.parameters.samples;
    const vectors=(item:unknown,size:number)=>Array.isArray(item)&&item.length===size&&item.every(row=>numericArray(row,3));
    if(a.kind!=="nodal_line_two_band"||!(a.ringRadius===null||finite(a.ringRadius))||
      !vectors(a.ringPositions,a.ringRadius===null?0:64)||!vectors(a.loopPositions,n)||
      !numericArray(a.lowerBand,n)||!numericArray(a.upperBand,n)||!finite(a.loopGap)||
      !(a.berryPhase===null||finite(a.berryPhase))||!(a.winding===null||Number.isInteger(a.winding))||
      !(a.minimumLink===null||finite(a.minimumLink))||!(a.convergenceError===null||finite(a.convergenceError))||
      !(typeof a.status==="string"&&["defined","gap-closed","mesh-unresolved"].includes(a.status)))return false;
  } else if(job.model.type==="weyl_minimal"){
    const n=10*4**job.model.parameters.subdivisions+2,f=20*4**job.model.parameters.subdivisions;
    const vectors=(item:unknown,size:number)=>Array.isArray(item)&&item.length===size&&item.every(row=>numericArray(row,3));
    const faces=(item:unknown)=>Array.isArray(item)&&item.length===f&&item.every(row=>Array.isArray(row)&&row.length===3&&row.every((v:unknown)=>Number.isInteger(v)));
    if(a.kind!=="weyl_minimal"||!numericArray(a.node,3)||!finite(a.flux)||!finite(a.minimumLink)||
      !finite(a.sphereGap)||typeof a.meshResolved!=="boolean"||a.chirality!==job.model.parameters.chirality||
      !(a.lowerChern===null||a.lowerChern===-1||a.lowerChern===1)||!vectors(a.positions,n)||
      !vectors(a.berryCurvature,n)||!faces(a.triangles)||!numericArray(a.lowerBand,n)||
      !numericArray(a.upperBand,n)||!numericArray(a.faceFlux,f))return false;
  } else if(job.model.type==="kitaev_chain"){
    const {cells,kPoints}=job.model.parameters;
    if(a.kind!=="kitaev_chain"||!finite(a.bulkGap)||!finite(a.sampledGap)||
      typeof a.gapClosed!=="boolean"||!numericArray(a.kValues,kPoints)||
      !numericArray(a.lowerBand,kPoints)||!numericArray(a.upperBand,kPoints)||
      !record(a.finite)||a.finite.cells!==cells||!numericArray(a.finite.nearZeroEnergies,2)||
      !numericArray(a.finite.siteDensity,cells)||!finite(a.finite.endWeight))return false;
    if(a.invariant!==undefined){const w=a.invariant;
      if(!record(w)||w.method!=="Pfaffian signs at k=0,pi; chiral q winding on sampled periodic mesh"||
        !numericArray(w.pfaffianSigns,2)||!(w.parity===null||w.parity===0||w.parity===1)||
        !(w.winding===null||w.winding===0||w.winding===1)||
        !(typeof w.status==="string"&&["defined","bulk-gap-closed","mesh-unresolved"].includes(w.status))||
        !(w.maxPhaseStep===null||finite(w.maxPhaseStep))||
        !numericArray(w.curveX,kPoints)||!numericArray(w.curveY,kPoints))return false;}
  } else if(job.model.type==="bbh"){
    const {grid,cells}=job.model.parameters;
    if(a.kind!=="bbh"||!finite(a.bulkGap)||!numericArray(a.bandKValues,grid)||
      !Array.isArray(a.bandEnergies)||a.bandEnergies.length!==4||
      !a.bandEnergies.every(row=>numericArray(row,grid*grid))||!record(a.finite)||
      a.finite.cells!==cells||!numericArray(a.finite.midgapEnergies,4)||
      !numericArray(a.finite.midgapDensity,cells*cells)||!finite(a.finite.cornerWeight))return false;
  } else {
    const p=job.model.parameters,g=p.grid,n=4*p.edgeCells,m=p.edgeSamples;
    if(a.kind!=="bhz_general"||!finite(a.bulkGap)||a.bulkGap<0||!finite(a.sampledGap)||a.sampledGap<0||
       typeof a.gapClosed!=="boolean"||typeof a.meshResolved!=="boolean"||
       !(a.z2===null||a.z2===0||a.z2===1)||!numericArray(a.paritySigns,4)||
       !(a.blockChern===null||finite(a.blockChern))||!(a.partnerChern===null||finite(a.partnerChern))||
       !numericArray(a.latticeKValues,g)||!numericArray(a.continuumKValues,g)||
       !Array.isArray(a.latticeBandEnergies)||!Array.isArray(a.continuumBandEnergies)||
       ![...a.latticeBandEnergies,...a.continuumBandEnergies].every(row=>numericArray(row,g*g))||
       !numericArray(a.bulkStateK,2)||!Array.isArray(a.bulkStates)||a.bulkStates.length!==4||
       !record(a.edge)||!numericArray(a.edge.kValues,m)||!Array.isArray(a.edge.energies)||
       !Array.isArray(a.edge.weights)||!a.edge.energies.every(row=>numericArray(row,n))||
       !a.edge.weights.every(row=>numericArray(row,n))||!Array.isArray(a.edge.states)||a.edge.states.length!==4)return false;
  }
  return consistentTopologyResult(job, value as unknown as TopologyResult);
}
