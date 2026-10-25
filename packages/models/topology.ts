import type { TopologyJob, TopologyResult, WorkspaceSnapshot } from "../contracts";
import { ATLAS_REVISION, ATLAS_SOURCE, atlasEntry } from "../atlas";

export type TopologyDraft = NonNullable<WorkspaceSnapshot["topology"]>;
export const TOPOLOGY_DEFAULTS: TopologyDraft = {
  modelId: "ssh", t1: "0.6", t2: "1", cells: "16", kPoints: "101", mass: "-1", grid: "21",
  A:"1",B:"1",C:"0",D:"0",R:"0",edgeCells:"12",edgeSamples:"15",continuumExtent:"1",
  gammaX:"0.5",lambdaX:"1",gammaY:"0.5",lambdaY:"1",
  mu:"0",hopping:"1",pairing:"0.8",
};
function numeric(raw: string, minimum: number, maximum: number, integer = false): number {
  if (!raw.trim()) throw new Error("All topology parameters are required");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value)))
    throw new Error(`Topology parameter must be ${integer ? "an integer" : "finite"} in [${minimum}, ${maximum}]`);
  return value;
}
export function topologyJob(jobId: string, draft: TopologyDraft): TopologyJob {
  const entry = atlasEntry(draft.modelId === "bhz_general" ? "bhz" : draft.modelId)!;
  const source = { sourceRepository: `${ATLAS_SOURCE}/tree/${ATLAS_REVISION}`,
    sourceModule: `data/hamiltonian_atlas/${entry.sourceFile}`, volume: "VIII", exampleId: `Atlas ${draft.modelId}` };
  if (draft.modelId === "ssh") return { schema: "quantum-job/v1", jobId, operation: "topology", engine: "native",
    model: { type: "ssh", parameters: { t1: numeric(draft.t1, -10, 10), t2: numeric(draft.t2, -10, 10),
      cells: numeric(draft.cells, 4, 40, true), kPoints: numeric(draft.kPoints, 21, 201, true) }, source } };
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
  return { schema: "quantum-job/v1", jobId, operation: "topology", engine: "native",
    model: { type: "qwz", parameters: { mass: numeric(draft.mass, -6, 6), grid: numeric(draft.grid, 11, 31, true) }, source } };
}

export function consistentTopologyResult(job: TopologyJob, result: TopologyResult): boolean {
  if (result.jobId !== job.jobId || JSON.stringify(result.model) !== JSON.stringify(job.model) ||
      result.analysis.kind !== job.model.type) return false;
  const a = result.analysis;
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
  } else if(job.model.type==="kitaev_chain"){
    const {cells,kPoints}=job.model.parameters;
    if(a.kind!=="kitaev_chain"||!finite(a.bulkGap)||!finite(a.sampledGap)||
      typeof a.gapClosed!=="boolean"||!numericArray(a.kValues,kPoints)||
      !numericArray(a.lowerBand,kPoints)||!numericArray(a.upperBand,kPoints)||
      !record(a.finite)||a.finite.cells!==cells||!numericArray(a.finite.nearZeroEnergies,2)||
      !numericArray(a.finite.siteDensity,cells)||!finite(a.finite.endWeight))return false;
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
