import type { DampedOscillatorJob, DampedOscillatorResult, EngineName } from "../contracts";
import { initialOscillatorCoefficients } from "./oscillator-dynamics";

export type DampedOscillatorDraft = {
  omega:string;cutoff:string;loss:string;thermalOccupation:string;
  initial:"fock"|"coherent";index:string;alphaRe:string;alphaIm:string;
  start:string;stop:string;samples:string;engine:EngineName|"compare";
};
export const DAMPED_OSCILLATOR_DEFAULTS:DampedOscillatorDraft = {
  omega:"1",cutoff:"8",loss:"0.25",thermalOccupation:"0",initial:"fock",index:"3",
  alphaRe:"0",alphaIm:"0",start:"0",stop:"12",samples:"101",engine:"qutip",
};
export const DAMPED_READOUTS = ["time","mean_number","purity","trace","boundary_probability","coherence"] as const;
export function dampedColumns(cutoff:number):string[] {
  return [...DAMPED_READOUTS,...Array.from({length:cutoff},(_,i)=>
    Array.from({length:cutoff},(_,j)=>[`rho_${i}_${j}_re`,`rho_${i}_${j}_im`]).flat()).flat()];
}
export function dampedOscillatorJob(jobId:string,d:DampedOscillatorDraft,engine:EngineName):DampedOscillatorJob {
  const numeric=[d.omega,d.cutoff,d.loss,d.thermalOccupation,d.index,d.alphaRe,d.alphaIm,d.start,d.stop,d.samples];
  if(numeric.some(v=>!v.trim()||!Number.isFinite(Number(v))))throw new Error("Damped oscillator needs finite numeric inputs");
  const p={omega:Number(d.omega),cutoff:Number(d.cutoff),loss:Number(d.loss),thermalOccupation:Number(d.thermalOccupation)};
  const s={type:"master" as const,tStart:Number(d.start),tStop:Number(d.stop),samples:Number(d.samples)};
  const i=d.initial==="fock"?{type:"fock" as const,index:Number(d.index)}:
    {type:"coherent" as const,alphaRe:Number(d.alphaRe),alphaIm:Number(d.alphaIm)};
  const dt=s.tStop-s.tStart;
  if(p.omega<.1||p.omega>5||!Number.isInteger(p.cutoff)||p.cutoff<8||p.cutoff>16||
    p.loss<0||p.loss>2||p.thermalOccupation<0||p.thermalOccupation>2||
    !Number.isInteger(s.samples)||s.samples<3||s.samples>201||s.tStart< -100||s.tStop>100||
    dt<=0||dt>20||p.omega*dt>60||p.loss*dt>12||
    (i.type==="fock"?(!Number.isInteger(i.index)||i.index<0||i.index>10||i.index>=p.cutoff-1):
      Math.abs(i.alphaRe)>2||Math.abs(i.alphaIm)>2||i.alphaRe**2+i.alphaIm**2>4))
    throw new Error("Bounded damped oscillator: N 8–16, ω .1–5, κ 0–2, bath occupation 0–2, duration ≤20, ≤201 samples; initial state below cutoff");
  return {schema:"quantum-job/v1",jobId,operation:"oscillator_damped",engine,
    model:{type:"damped_harmonic_oscillator",parameters:p},initialState:i,solver:s};
}
export function consistentDampedOscillatorResult(j:DampedOscillatorJob,r:DampedOscillatorResult) {
  const n=j.model.parameters.cutoff;
  return r.operation==="oscillator_damped"&&r.jobId===j.jobId&&r.engine.name===j.engine&&
    JSON.stringify(r.model)===JSON.stringify(j.model)&&JSON.stringify(r.initialState)===JSON.stringify(j.initialState)&&
    JSON.stringify(r.solver)===JSON.stringify(j.solver)&&r.data.rows===j.solver.samples&&
    JSON.stringify(r.data.columns)===JSON.stringify(dampedColumns(n))&&
    r.data.bytes===j.solver.samples*(6+2*n*n)*8&&r.data.path===`${j.jobId}.f64`&&
    Math.abs(r.analysis.projectionProbability-initialOscillatorCoefficients(n,j.initialState).probability)<1e-10;
}
export function checkDampedOscillatorData(r:DampedOscillatorResult,bytes:Uint8Array) {
  const j:DampedOscillatorJob={schema:"quantum-job/v1",jobId:r.jobId,operation:"oscillator_damped",
    engine:r.engine.name,model:r.model,initialState:r.initialState,solver:r.solver};
  if(!consistentDampedOscillatorResult(j,r)||bytes.byteLength!==r.data.bytes)
    throw new Error("Damped oscillator metadata does not match data");
  const n=r.model.parameters.cutoff,stride=6+2*n*n,view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const value=(row:number,col:number)=>view.getFloat64((row*stride+col)*8,true);
  let maxTrace=0,minDiag=1,maxBoundary=0,maxReference=0;
  let initialNumber=0;
  for(let k=0;k<n;k++)initialNumber+=k*value(0,6+2*(k*n+k));
  const p=r.model.parameters;
  for(let row=0;row<r.data.rows;row++) {
    const time=r.solver.tStart+(r.solver.tStop-r.solver.tStart)*row/(r.data.rows-1);
    if(Math.abs(value(row,0)-time)>1e-9)throw new Error("Damped oscillator time grid differs");
    let trace=0,number=0,purity=0,coherence=0;
    for(let a=0;a<n;a++)for(let b=0;b<n;b++) {
      const re=value(row,6+2*(a*n+b)),im=value(row,7+2*(a*n+b));
      if(!Number.isFinite(re)||!Number.isFinite(im))throw new Error("Nonfinite density matrix");
      const otherRe=value(row,6+2*(b*n+a)),otherIm=value(row,7+2*(b*n+a));
      if(Math.abs(re-otherRe)>2e-7||Math.abs(im+otherIm)>2e-7)
        throw new Error("Density matrix is not Hermitian");
      purity+=re*re+im*im;
      if(a===b){trace+=re;number+=a*re;if(re< -2e-7)throw new Error("Negative occupation");}
      else coherence+=Math.hypot(re,im);
    }
    const boundary=value(row,6+2*(n*n-1));
    const checks=[number,purity,trace,boundary,coherence];
    for(let col=1;col<=5;col++)if(Math.abs(value(row,col)-checks[col-1])>2e-6)
      throw new Error("Damped oscillator readout differs from density matrix");
    if(Math.abs(trace-1)>2e-6||purity< -2e-6||purity>1+2e-6)
      throw new Error("Invalid density-matrix trace or purity");
    // A Hermitian positive semidefinite matrix plus a fixed numerical jitter must
    // admit Cholesky. This checks more than diagonal occupations or 2×2 minors.
    const lr:number[][]=Array.from({length:n},()=>Array(n).fill(0));
    const li:number[][]=Array.from({length:n},()=>Array(n).fill(0));
    for(let a=0;a<n;a++)for(let b=0;b<=a;b++) {
      let re=value(row,6+2*(a*n+b))+(a===b?3e-7:0),im=value(row,7+2*(a*n+b));
      for(let k=0;k<b;k++) {
        re-=lr[a][k]*lr[b][k]+li[a][k]*li[b][k];
        im-=li[a][k]*lr[b][k]-lr[a][k]*li[b][k];
      }
      if(a===b){if(re<=0||Math.abs(im)>2e-7)throw new Error("Density matrix is not positive");lr[a][b]=Math.sqrt(re);}
      else {lr[a][b]=re/lr[b][b];li[a][b]=im/lr[b][b];}
    }
    const reference=p.thermalOccupation+(initialNumber-p.thermalOccupation)*Math.exp(-p.loss*(time-r.solver.tStart));
    maxTrace=Math.max(maxTrace,Math.abs(trace-1));
    minDiag=Math.min(minDiag,...Array.from({length:n},(_,k)=>value(row,6+2*(k*n+k))));
    maxBoundary=Math.max(maxBoundary,boundary);
    maxReference=Math.max(maxReference,Math.abs(number-reference));
  }
  if(Math.abs(maxTrace-r.analysis.maxTraceError)>2e-6||
    Math.abs(maxBoundary-r.analysis.maxBoundaryOccupation)>2e-6||
    Math.abs(maxReference-r.analysis.maxNumberReferenceError)>2e-6||
    r.analysis.minimumEigenvalue>minDiag+2e-6||r.analysis.minimumEigenvalue< -2e-7)
    throw new Error("Damped oscillator diagnostics do not match data");
  return new Float64Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
}
