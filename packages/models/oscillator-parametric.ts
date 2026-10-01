import type { EngineName, ParametricOscillatorJob, ParametricOscillatorResult } from "../contracts";

export type ParametricOscillatorDraft={omega:string;lambdaRe:string;lambdaIm:string;cutoff:string;start:string;stop:string;samples:string;engine:EngineName|"compare"};
export const PARAMETRIC_DEFAULTS:ParametricOscillatorDraft={omega:"1",lambdaRe:".1",lambdaIm:"0",cutoff:"16",start:"0",stop:"12",samples:"121",engine:"qutip"};
export const PARAMETRIC_READOUTS=["time","q_mean","p_mean","q_variance","p_variance","mean_number","boundary_probability","norm","parity"] as const;
export function parametricColumns(n:number){return [...PARAMETRIC_READOUTS,...Array.from({length:n},(_,k)=>[`c${k}_re`,`c${k}_im`]).flat()];}
export function parametricOscillatorJob(id:string,d:ParametricOscillatorDraft,engine:EngineName):ParametricOscillatorJob {
  const raw=[d.omega,d.lambdaRe,d.lambdaIm,d.cutoff,d.start,d.stop,d.samples];
  if(raw.some(x=>!x.trim()||!Number.isFinite(Number(x))))throw new Error("Parametric oscillator needs finite numeric inputs");
  const p={omega:Number(d.omega),lambdaRe:Number(d.lambdaRe),lambdaIm:Number(d.lambdaIm),cutoff:Number(d.cutoff)};
  const s={type:"schrodinger" as const,tStart:Number(d.start),tStop:Number(d.stop),samples:Number(d.samples)};
  const duration=s.tStop-s.tStart,coupling=Math.hypot(p.lambdaRe,p.lambdaIm);
  if(p.omega<.1||p.omega>5||!Number.isInteger(p.cutoff)||p.cutoff<8||p.cutoff>40||
    Math.abs(p.lambdaRe)>4.5||Math.abs(p.lambdaIm)>4.5||coupling>=.9*p.omega||
    !Number.isInteger(s.samples)||s.samples<3||s.samples>301||s.tStart< -100||s.tStart>100||s.tStop< -100||s.tStop>100||
    duration<=0||duration>20||p.omega*duration>50||coupling*duration>8)
    throw new Error("Stable parametric scope: N 8–40, ω .1–5, |λ|<.9ω, duration ≤20, ω·duration≤50, |λ|·duration≤8, ≤301 samples");
  return {schema:"quantum-job/v1",jobId:id,operation:"oscillator_parametric",engine,
    model:{type:"parametric_oscillator",parameters:p},initialState:{type:"vacuum"},solver:s};
}
type Parameters=ParametricOscillatorJob["model"]["parameters"];
export function parametricReference(p:Parameters,tau:number){
  const frequency=Math.sqrt(p.omega**2-p.lambdaRe**2-p.lambdaIm**2),s=Math.sin(frequency*tau),c=Math.cos(frequency*tau);
  const ur=c,ui=-p.omega*s/frequency,vr=p.lambdaIm*s/frequency,vi=-p.lambdaRe*s/frequency;
  return {frequency,number:(vr*vr+vi*vi),qVariance:((ur+vr)**2+(ui-vi)**2)/2,
    pVariance:((ur-vr)**2+(ui+vi)**2)/2};
}
export function consistentParametricResult(j:ParametricOscillatorJob,r:ParametricOscillatorResult){
  const n=j.model.parameters.cutoff;
  return r.operation==="oscillator_parametric"&&r.jobId===j.jobId&&r.engine.name===j.engine&&
    JSON.stringify(r.model)===JSON.stringify(j.model)&&JSON.stringify(r.initialState)===JSON.stringify(j.initialState)&&
    JSON.stringify(r.solver)===JSON.stringify(j.solver)&&r.data.rows===j.solver.samples&&
    JSON.stringify(r.data.columns)===JSON.stringify(parametricColumns(n))&&
    r.data.bytes===j.solver.samples*(9+2*n)*8&&r.data.path===`${j.jobId}.f64`&&
    Math.abs(r.analysis.bogoliubovFrequency-parametricReference(j.model.parameters,0).frequency)<1e-10&&
    Math.abs(r.analysis.energyOffset-j.model.parameters.omega/2)<1e-12;
}
function derivative(p:Parameters,psi:Float64Array){
  const n=p.cutoff,out=new Float64Array(2*n);
  for(let k=0;k<n;k++){
    let hr=p.omega*(k+.5)*psi[2*k],hi=p.omega*(k+.5)*psi[2*k+1];
    if(k>=2){const f=.5*Math.sqrt(k*(k-1)),ar=psi[2*(k-2)],ai=psi[2*(k-2)+1];
      hr+=f*(p.lambdaRe*ar-p.lambdaIm*ai);hi+=f*(p.lambdaRe*ai+p.lambdaIm*ar);}
    if(k+2<n){const f=.5*Math.sqrt((k+1)*(k+2)),ar=psi[2*(k+2)],ai=psi[2*(k+2)+1];
      hr+=f*(p.lambdaRe*ar+p.lambdaIm*ai);hi+=f*(p.lambdaRe*ai-p.lambdaIm*ar);}
    out[2*k]=hi;out[2*k+1]=-hr;
  }
  return out;
}
function rk4(p:Parameters,psi:Float64Array,h:number){
  const add=(a:Float64Array,b:Float64Array,f:number)=>Float64Array.from(a,(v,k)=>v+f*b[k]);
  const a=derivative(p,psi),b=derivative(p,add(psi,a,h/2)),c=derivative(p,add(psi,b,h/2)),d=derivative(p,add(psi,c,h));
  return Float64Array.from(psi,(v,k)=>v+h*(a[k]+2*b[k]+2*c[k]+d[k])/6);
}
export function checkParametricData(r:ParametricOscillatorResult,bytes:Uint8Array){
  const j:ParametricOscillatorJob={schema:"quantum-job/v1",jobId:r.jobId,operation:"oscillator_parametric",engine:r.engine.name,
    model:r.model,initialState:r.initialState,solver:r.solver};
  if(!consistentParametricResult(j,r)||bytes.byteLength!==r.data.bytes)throw new Error("Inconsistent parametric oscillator data");
  const p=r.model.parameters,n=p.cutoff,stride=9+2*n,view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const at=(row:number,col:number)=>view.getFloat64(8*(row*stride+col),true);
  let predicted=new Float64Array(2*n);predicted[0]=1;
  const maxima={maxNormDrift:0,maxBoundaryOccupation:0,maxParityDrift:0,maxNumberReferenceError:0,
    maxQVarianceReferenceError:0,maxPVarianceReferenceError:0};
  for(let row=0;row<r.data.rows;row++){
    const time=r.solver.tStart+(r.solver.tStop-r.solver.tStart)*row/(r.data.rows-1);
    if(Math.abs(at(row,0)-time)>1e-9)throw new Error("Parametric time grid differs");
    if(row){const interval=(r.solver.tStop-r.solver.tStart)/(r.data.rows-1),
      step=Math.min(.02,.6/(n*(p.omega+Math.hypot(p.lambdaRe,p.lambdaIm)))),count=Math.ceil(interval/step);
      for(let t=0;t<count;t++)predicted=rk4(p,predicted,interval/count);}
    let norm=0,number=0,parity=0,ar=0,ai=0,a2r=0,boundary=0;
    for(let k=0;k<n;k++){
      const cr=at(row,9+2*k),ci=at(row,10+2*k);
      if(!Number.isFinite(cr)||!Number.isFinite(ci)||Math.hypot(cr-predicted[2*k],ci-predicted[2*k+1])>5e-6)
        throw new Error("Parametric coefficients disagree with independent propagation");
      const probability=cr*cr+ci*ci;norm+=probability;number+=k*probability;parity+=(k%2?-1:1)*probability;
      if(k===n-1)boundary=probability;
      if(k+1<n){const nr=at(row,9+2*(k+1)),ni=at(row,10+2*(k+1)),f=Math.sqrt(k+1);
        ar+=f*(cr*nr+ci*ni);ai+=f*(cr*ni-ci*nr);}
      if(k+2<n){const nr=at(row,9+2*(k+2)),ni=at(row,10+2*(k+2)),f=Math.sqrt((k+1)*(k+2));
        a2r+=f*(cr*nr+ci*ni);}
    }
    const qm=Math.SQRT2*ar/norm,pm=Math.SQRT2*ai/norm,occupation=number/norm,
      top=boundary/norm,evenness=parity/norm;
    const quadrature=occupation+.5-.5*n*top;
    const qvar=quadrature+a2r/norm-qm*qm,pvar=quadrature-a2r/norm-pm*pm;
    const calculated=[qm,pm,qvar,pvar,occupation,top,norm,evenness];
    for(let col=1;col<=8;col++)if(Math.abs(at(row,col)-calculated[col-1])>2e-6)
      throw new Error("Parametric readout disagrees with coefficients");
    if(Math.abs(norm-1)>2e-6||Math.abs(evenness-1)>2e-6)throw new Error("Parametric norm or parity drift");
    const reference=parametricReference(p,time-r.solver.tStart);
    maxima.maxNormDrift=Math.max(maxima.maxNormDrift,Math.abs(norm-1));
    maxima.maxBoundaryOccupation=Math.max(maxima.maxBoundaryOccupation,top);
    maxima.maxParityDrift=Math.max(maxima.maxParityDrift,Math.abs(evenness-1));
    maxima.maxNumberReferenceError=Math.max(maxima.maxNumberReferenceError,Math.abs(occupation-reference.number));
    maxima.maxQVarianceReferenceError=Math.max(maxima.maxQVarianceReferenceError,Math.abs(qvar-reference.qVariance));
    maxima.maxPVarianceReferenceError=Math.max(maxima.maxPVarianceReferenceError,Math.abs(pvar-reference.pVariance));
  }
  for(const key of Object.keys(maxima) as (keyof typeof maxima)[])
    if(Math.abs(maxima[key]-r.analysis[key])>2e-6)throw new Error(`Parametric ${key} differs from verified coefficients`);
  return new Float64Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
}
