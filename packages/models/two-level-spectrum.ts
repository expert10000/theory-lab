import type {SpectrumJob,SpectrumResult} from "../contracts";

/** Independent host check before a worker spectrum is shown or persisted. Legacy energy-only runs remain valid. */
export function consistentTwoLevelSpectrum(job:SpectrumJob,result:SpectrumResult,checkLegacyEnergies=false):boolean{
  // The original v1 branch had no state diagnostics; preserve its acceptance
  // and never infer a state from those archived energies.
  const analysis=result.stateAnalysis;
  if(!analysis&&!checkLegacyEnergies)return true;
  const {delta,omega}=job.model.parameters;
  const scale=Math.max(1,Math.abs(delta),Math.abs(omega));
  const norm=Math.hypot(delta,omega);
  const [low,high]=result.spectrum.eigenvalues;
  const near=(actual:number,expected:number,tolerance=1e-8)=>
    Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance;
  if(!near(low,-norm/2,1e-8*scale)||!near(high,norm/2,1e-8*scale)||low>high)return false;
  if(!analysis)return true;
  const gap=high-low;
  const threshold=1e-10*scale;
  if(!near(analysis.gap,gap,1e-8*scale)||!near(analysis.threshold,threshold,1e-14*scale))return false;
  if(analysis.status==="degenerate")return gap<=threshold;
  if(gap<=threshold)return false;
  for(const [index,state] of analysis.states.entries()){
    const [a,b]=state.amplitudes;
    const [p0,p1]=state.populations;
    const x=2*a*b,z=a*a-b*b;
    const residual=Math.hypot(delta*a/2+omega*b/2-result.spectrum.eigenvalues[index]*a,
      omega*a/2-delta*b/2-result.spectrum.eigenvalues[index]*b);
    if(!near(a*a+b*b,1)||!near(p0,a*a)||!near(p1,b*b)||
      !near(state.bloch.x,x)||!near(state.bloch.y,0)||!near(state.bloch.z,z)||
      !near(state.bloch.x,(index===0?-1:1)*omega/norm)||
      !near(state.bloch.z,(index===0?-1:1)*delta/norm)||
      !near(state.residualNorm,residual,1e-8*scale)||residual>1e-8*scale)return false;
  }
  const [left,right]=analysis.states;
  return near(left.amplitudes[0]*right.amplitudes[0]+left.amplitudes[1]*right.amplitudes[1],0);
}
