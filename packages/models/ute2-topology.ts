import type {Ute2TopologyJob,Ute2TopologyParameters,Ute2TopologyResult} from "../contracts/ute2-topology";

const close=(a:number,b:number)=>Number.isFinite(a)&&Math.abs(a-b)<=2e-7*(1+Math.abs(b));
export const ute2TopologyJob=(parameters:Ute2TopologyParameters,jobId:string):Ute2TopologyJob=>
  ({schema:"quantum-ute2-topology-job/v1",jobId,model:{type:"square_lattice_class_d",parameters}});

/** Exact continuous-BZ minimum for Δ∈[0,2], not a sampled-mesh estimate. */
export function exactUte2ToyMinimum(mu:number,delta:number):number {
  let minimum=Infinity;
  for(const fixed of [-1,1]){
    const values=[-1,1];
    if(delta<2)values.push(Math.max(-1,Math.min(1,-2*(2*fixed+mu)/(4-delta*delta))));
    for(const other of values){
      const square=delta*delta*(1-other*other)+(2*(fixed+other)+mu)**2;
      minimum=Math.min(minimum,square);
    }
  }
  return Math.sqrt(Math.max(0,minimum));
}

const vector=(kx:number,ky:number,mu:number,delta:number):[number,number,number]=>
  [delta*Math.sin(kx),-delta*Math.sin(ky),-2*(Math.cos(kx)+Math.cos(ky))-mu];
const norm=(d:readonly number[])=>Math.hypot(d[0],d[1],d[2]);
const dot=(a:readonly number[],b:readonly number[])=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:readonly number[],b:readonly number[]):[number,number,number]=>
  [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function sampledUte2ToyMinimum(mu:number,delta:number,size:number):number {
  let minimum=Infinity;
  for(let x=0;x<size;x++)for(let y=0;y<size;y++)
    minimum=Math.min(minimum,norm(vector(-Math.PI+2*Math.PI*x/size,-Math.PI+2*Math.PI*y/size,mu,delta)));
  return minimum;
}

/** Direct midpoint Berry-curvature quadrature, independent of worker FHS links. */
export function ute2ToyCurvatureIntegral(mu:number,delta:number,size:number):number {
  let sum=0;
  for(let x=0;x<size;x++)for(let y=0;y<size;y++){
    const kx=-Math.PI+2*Math.PI*(x+.5)/size,ky=-Math.PI+2*Math.PI*(y+.5)/size;
    const d=vector(kx,ky,mu,delta);
    const dx:[number,number,number]=[delta*Math.cos(kx),0,2*Math.sin(kx)];
    const dy:[number,number,number]=[0,-delta*Math.cos(ky),2*Math.sin(ky)];
    sum+=-.5*dot(d,cross(dx,dy))/norm(d)**3;
  }
  return sum*(2*Math.PI/size)**2/(2*Math.PI);
}

/** Independent geometric degree of the d-hat map; lower-band sign is negative. */
export function ute2ToySolidAngleChern(mu:number,delta:number,size:number):number {
  const unit=(x:number,y:number)=>{
    const d=vector(-Math.PI+2*Math.PI*(x%size)/size,-Math.PI+2*Math.PI*(y%size)/size,mu,delta);
    const length=norm(d);
    return d.map(value=>value/length);
  };
  const triangle=(a:number[],b:number[],c:number[])=>
    2*Math.atan2(dot(a,cross(b,c)),1+dot(a,b)+dot(b,c)+dot(c,a));
  let sum=0;
  for(let x=0;x<size;x++)for(let y=0;y<size;y++){
    const a=unit(x,y),b=unit(x+1,y),c=unit(x+1,y+1),d=unit(x,y+1);
    sum+=triangle(a,b,c)+triangle(a,c,d);
  }
  return -sum/(4*Math.PI);
}

export function consistentUte2TopologyResult(job:Ute2TopologyJob,result:Ute2TopologyResult):boolean {
  if(result.jobId!==job.jobId||result.status!=="completed"||
    JSON.stringify(result.model)!==JSON.stringify(job.model)||
    result.basis!=="spinless two-component Nambu lattice toy"||
    result.orientation!=="occupied band; kx then ky; x-major half-open torus"||
    result.units.momentum!=="rad/a"||result.units.energy!=="t=1"||
    Number.isNaN(Date.parse(result.provenance.computedAt)))return false;
  const {mu,delta,mesh}=job.model.parameters;
  const exact=exactUte2ToyMinimum(mu,delta);
  const closed=exact<=1e-10;
  if(!close(result.bulkMinimumEnergy,exact)||!close(result.bulkGap,2*exact)||
    !close(result.sampledMinimumEnergy,sampledUte2ToyMinimum(mu,delta,2*mesh))||
    result.gapClosed!==closed||result.coarseMesh!==mesh||result.fineMesh!==2*mesh)return false;
  if(closed)return result.invariantStatus==="gap_closed"&&result.chern===null&&
    result.analyticExpectedChern===null&&result.coarseLinkChern===null&&result.fineLinkChern===null&&
    result.coarseMinimumLink===null&&result.fineMinimumLink===null&&
    result.curvatureIntegralCoarse===null&&result.curvatureIntegralFine===null;
  const expected=delta>0&&mu>-4&&mu<0?-1:delta>0&&mu>0&&mu<4?1:0;
  const coarseIntegral=ute2ToyCurvatureIntegral(mu,delta,4*mesh);
  const fineIntegral=ute2ToyCurvatureIntegral(mu,delta,8*mesh);
  if(result.analyticExpectedChern!==expected||result.curvatureIntegralCoarse===null||
    result.curvatureIntegralFine===null||!close(result.curvatureIntegralCoarse,coarseIntegral)||
    !close(result.curvatureIntegralFine,fineIntegral))return false;
  const resolved=result.coarseLinkChern!==null&&result.coarseLinkChern===result.fineLinkChern&&
    result.fineLinkChern===expected&&result.coarseMinimumLink!==null&&result.fineMinimumLink!==null&&
    result.coarseMinimumLink>.1&&result.fineMinimumLink>.1&&
    Math.abs(fineIntegral-expected)<.03&&Math.abs(fineIntegral-coarseIntegral)<.03;
  if(result.invariantStatus!==(resolved?"defined":"mesh_unresolved")||result.chern!==(resolved?expected:null))return false;
  if(!resolved)return true;
  const geometricCoarse=ute2ToySolidAngleChern(mu,delta,mesh);
  const geometricFine=ute2ToySolidAngleChern(mu,delta,2*mesh);
  return close(geometricCoarse,expected)&&close(geometricFine,expected);
}
