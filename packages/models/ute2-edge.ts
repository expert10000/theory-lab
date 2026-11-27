import type {Ute2EdgeJob,Ute2EdgeResult,Ute2EdgeSource,Ute2EdgeState,Ute2EdgeWidth} from "../contracts/ute2-edge";
import type {Ute2TopologyResult} from "../contracts/ute2-topology";
import {exactUte2ToyMinimum} from "./ute2-topology";

const close=(a:number,b:number)=>Number.isFinite(a)&&Math.abs(a-b)<=2e-7*(1+Math.abs(b));
export function ute2EdgeJob(source:Ute2EdgeSource,bulk:Ute2TopologyResult,width:12|16|20,jobId:string):Ute2EdgeJob {
  if(bulk.invariantStatus!=="defined"||bulk.chern===null)throw new Error("Qualified bulk source required");
  return {schema:"quantum-ute2-edge-job/v1",jobId,source,model:bulk.model,
    bulkChern:bulk.chern as -1|0|1,width};
}

function applyStrip(state:Ute2EdgeState,width:number,z:number,delta:number):Ute2EdgeState {
  const re=Array(2*width).fill(0) as number[],im=Array(2*width).fill(0) as number[];
  for(let cell=0;cell<width;cell++)for(let orb=0;orb<2;orb++){
    const i=2*cell+orb,sign=orb===0?1:-1;
    re[i]+=sign*z*state.re[i];im[i]+=sign*z*state.im[i];
    if(cell+1<width){
      const same=2*(cell+1)+orb,other=2*(cell+1)+1-orb;
      re[i]+=-sign*state.re[same]+delta*state.im[other]/2;
      im[i]+=-sign*state.im[same]-delta*state.re[other]/2;
    }
    if(cell>0){
      const same=2*(cell-1)+orb,other=2*(cell-1)+1-orb;
      re[i]+=-sign*state.re[same]-delta*state.im[other]/2;
      im[i]+=-sign*state.im[same]+delta*state.re[other]/2;
    }
  }
  return {re,im};
}
const inner=(left:Ute2EdgeState,right:Ute2EdgeState)=>{
  let re=0,im=0;
  for(let i=0;i<left.re.length;i++){
    re+=left.re[i]*right.re[i]+left.im[i]*right.im[i];
    im+=left.re[i]*right.im[i]-left.im[i]*right.re[i];
  }
  return Math.hypot(re,im);
};

function consistentWidth(row:Ute2EdgeWidth,width:number,z:number,delta:number):boolean {
  if(row.width!==width||row.energies.length!==2*width||row.pairDensity.length!==width||row.pairStates.length!==2||
    row.pairStates.some(state=>state.re.length!==2*width||state.im.length!==2*width))return false;
  if(row.energies.some((value,i)=>i>0&&value<row.energies[i-1]-1e-8))return false;
  for(let i=0;i<width;i++)if(!close(row.energies[i],-row.energies[2*width-1-i]))return false;
  const traceSquare=2*width*z*z+(width-1)*(4+delta*delta);
  if(!close(row.energies.reduce((sum,e)=>sum+e*e,0),traceSquare))return false;
  let maxResidual=0,maxNormError=0;
  const densities=Array(width).fill(0) as number[];
  for(let stateIndex=0;stateIndex<2;stateIndex++){
    const state=row.pairStates[stateIndex],energy=row.energies[width-1+stateIndex];
    const action=applyStrip(state,width,z,delta);
    let normSquare=0,residualSquare=0;
    for(let i=0;i<2*width;i++){
      normSquare+=state.re[i]**2+state.im[i]**2;
      residualSquare+=(action.re[i]-energy*state.re[i])**2+(action.im[i]-energy*state.im[i])**2;
      densities[Math.floor(i/2)]+=(state.re[i]**2+state.im[i]**2)/2;
    }
    maxResidual=Math.max(maxResidual,Math.sqrt(residualSquare));
    maxNormError=Math.max(maxNormError,Math.abs(Math.sqrt(normSquare)-1));
  }
  if(maxResidual>1e-7||maxNormError>1e-7||
    !close(row.maxResidual,maxResidual)||!close(row.maxNormError,maxNormError)||
    inner(row.pairStates[0],row.pairStates[1])>1e-7)return false;
  if(row.pairDensity.some((value,i)=>!close(value,densities[i]))||
    !close(row.pairDensity.reduce((sum,value)=>sum+value,0),1))return false;
  const boundaryWeight=densities[0]+densities[1]+densities[width-2]+densities[width-1];
  if(!close(row.boundaryWeight,boundaryWeight))return false;
  const negative=row.pairStates[0];
  const transformed:Ute2EdgeState={re:[],im:[]};
  for(let cell=0;cell<width;cell++)for(let orb=0;orb<2;orb++){
    const i=2*cell+1-orb;
    transformed.re.push(negative.re[i]);transformed.im.push(-negative.im[i]);
  }
  const overlap=inner(row.pairStates[1],transformed);
  return close(row.particleHoleOverlap,overlap)&&overlap>.99;
}

export function consistentUte2EdgeResult(job:Ute2EdgeJob,result:Ute2EdgeResult):boolean {
  if(result.jobId!==job.jobId||result.status!=="completed"||
    JSON.stringify(result.source)!==JSON.stringify(job.source)||
    JSON.stringify(result.model)!==JSON.stringify(job.model)||result.bulkChern!==job.bulkChern||
    result.boundary!=="open x; periodic y; t=a=1"||
    result.units.momentum!=="rad/a"||result.units.energy!=="t=1"||
    result.units.density!=="probability per x cell"||
    Number.isNaN(Date.parse(result.provenance.computedAt)))return false;
  const {mu,delta}=job.model.parameters;
  const minimum=exactUte2ToyMinimum(mu,delta),ky=mu<0?0:-Math.PI;
  if(minimum<=1e-10||!close(result.bulkMinimumEnergy,minimum)||result.ky!==ky||
    result.widths.length!==2)return false;
  const z=-2*Math.cos(ky)-mu;
  const [coarse,fine]=result.widths;
  if(!consistentWidth(coarse,job.width,z,delta)||!consistentWidth(fine,2*job.width,z,delta))return false;
  const candidate=(row:Ute2EdgeWidth)=>Math.abs(row.energies[row.width])<minimum&&
    row.boundaryWeight>.5&&row.maxResidual<1e-8&&row.particleHoleOverlap>.99;
  const localized=job.bulkChern!==0&&candidate(coarse)&&candidate(fine)&&
    Math.abs(fine.energies[fine.width])<Math.abs(coarse.energies[coarse.width]);
  return result.edgeStatus===(localized?"localized_in_gap":"not_resolved");
}
