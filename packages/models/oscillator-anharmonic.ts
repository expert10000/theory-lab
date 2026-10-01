import type {AnharmonicOscillatorJob,AnharmonicOscillatorResult,EngineName} from "../contracts";

export type AnharmonicDraft={omega:string;lambda:string;cutoff:string;levels:string;engine:EngineName|"compare"};
export const ANHARMONIC_DEFAULTS:AnharmonicDraft={omega:"1",lambda:".05",cutoff:"20",levels:"5",engine:"qutip"};

export function anharmonicJob(jobId:string,draft:AnharmonicDraft,engine:EngineName):AnharmonicOscillatorJob{
  const raw=[draft.omega,draft.lambda,draft.cutoff,draft.levels];
  if(raw.some(value=>!value.trim()||!Number.isFinite(Number(value))))throw new Error("Anharmonic oscillator needs finite numeric inputs");
  const p={mass:1 as const,omega:Number(draft.omega),lambda:Number(draft.lambda),cutoff:Number(draft.cutoff),levels:Number(draft.levels)};
  if(p.omega<.5||p.omega>3||p.lambda<0||p.lambda>.2||!Number.isInteger(p.cutoff)||p.cutoff<8||p.cutoff>32||
    !Number.isInteger(p.levels)||p.levels<3||p.levels>6||p.levels>p.cutoff-2)
    throw new Error("Bounded quartic scope: m=1, ω .5–3, λ 0–.2, cutoff 8–32, 3–6 levels below cutoff−1");
  return {schema:"quantum-job/v1",jobId,operation:"oscillator_anharmonic",engine,
    model:{type:"anharmonic_oscillator",parameters:p}};
}

function multiply(a:number[][],b:number[][]){const n=a.length;return Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>{
  let sum=0;for(let k=0;k<n;k++)sum+=a[i][k]*b[k][j];return sum;
}));}
export function anharmonicMatrices(p:AnharmonicOscillatorJob["model"]["parameters"]){
  const n=p.cutoff, x=Array.from({length:n},()=>Array<number>(n).fill(0));
  for(let k=0;k<n-1;k++)x[k][k+1]=x[k+1][k]=Math.sqrt((k+1)/(2*p.omega));
  const x2=multiply(x,x),x4=multiply(x2,x2);
  const h=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>p.lambda*x4[i][j]+(i===j?p.omega*(i+.5):0)));
  return {h,x2,x4};
}
function dot(a:number[],b:number[]){return a.reduce((sum,value,i)=>sum+value*b[i],0);}
function quadratic(vector:number[],matrix:number[][]){return dot(vector,matrix.map(row=>dot(row,vector)));}
export function consistentAnharmonicResult(job:AnharmonicOscillatorJob,result:AnharmonicOscillatorResult){
  const p=job.model.parameters,n=p.cutoff,levels=p.levels;
  if(result.operation!=="oscillator_anharmonic"||result.jobId!==job.jobId||result.engine.name!==job.engine||
    JSON.stringify(result.model)!==JSON.stringify(job.model)||result.spectrum.energies.length!==levels||
    result.states.coefficients.length!==levels||Math.abs(result.analysis.harmonicGround-p.omega/2)>1e-10)return false;
  const {h,x2,x4}=anharmonicMatrices(p),vectors=result.states.coefficients,energies=result.spectrum.energies;
  for(let k=0;k<levels;k++){
    const v=vectors[k],energy=energies[k];
    if(v.length!==n||!v.every(Number.isFinite)||!Number.isFinite(energy)||
      (k>0&&energy<=energies[k-1])||Math.abs(dot(v,v)-1)>1e-7)return false;
    let residual=0;for(let i=0;i<n;i++)residual+=(dot(h[i],v)-energy*v[i])**2;
    if(Math.sqrt(residual)>1e-7)return false;
    for(let j=0;j<k;j++)if(Math.abs(dot(v,vectors[j]))>1e-7)return false;
  }
  const ground=vectors[0],parity=ground.reduce((sum,value,i)=>sum+(i%2?-1:1)*value*value,0);
  return Math.abs(result.analysis.groundX2-quadratic(ground,x2))<1e-7&&
    Math.abs(result.analysis.groundX4-quadratic(ground,x4))<1e-7&&
    Math.abs(result.analysis.groundParity-parity)<1e-7&&
    Math.abs(parity-1)<1e-6&&energies[0]>=p.omega/2-1e-8;
}
