import type {VerifiedSavedRun} from "../contracts";

export interface CavitySectorLevel {index:number;energy:number;excitation:number|null;cutoffEdge:boolean}
export interface CavitySectorEvidence {
  runId:string;
  model:"jaynes_cummings"|"quantum_rabi";
  quantity:"excitation number"|"parity";
  initialValue:number;
  maximumDrift:number;
  levels:CavitySectorLevel[];
  unresolvedLevels:number;
  /** Every label is derived only after the saved job/result/artifact is hash-verified. */
  source:"verified saved run";
}

const tolerance=(value:number)=>1e-7*Math.max(1,Math.abs(value));
const close=(a:number,b:number)=>Math.abs(a-b)<=tolerance(Math.max(Math.abs(a),Math.abs(b)));

/** Finite JC blocks in the worker's atom ⊗ Fock order. The top singleton is a cutoff artifact. */
export function jaynesCummingsLevels(parameters:{qubitFrequency:number;cavityFrequency:number;coupling:number;cutoff:number}){
  const {qubitFrequency:wq,cavityFrequency:wc,coupling:g,cutoff}=parameters;
  const levels:{energy:number;excitation:number;cutoffEdge:boolean}[]=[{energy:0,excitation:0,cutoffEdge:false}];
  for(let excitation=1;excitation<cutoff;excitation++){
    const center=(excitation-.5)*wc+wq/2;
    const halfGap=Math.hypot(wq-wc,2*g*Math.sqrt(excitation))/2;
    levels.push({energy:center-halfGap,excitation,cutoffEdge:false},
      {energy:center+halfGap,excitation,cutoffEdge:false});
  }
  levels.push({energy:(cutoff-1)*wc+wq,excitation:cutoff,cutoffEdge:true});
  return levels.sort((a,b)=>a.energy-b.energy||a.excitation-b.excitation);
}

/** Pure projection; caller must supply getVerifiedRun() output, not an unverified renderer result. */
export function cavitySectorEvidence(run:VerifiedSavedRun):CavitySectorEvidence{
  const result=run.result,job=run.job;
  if(result.operation!=="cavity"||job.operation!=="cavity"||
    result.model.type!==job.model.type||result.jobId!==job.jobId||
    JSON.stringify(result.model.parameters)!==JSON.stringify(job.model.parameters)||
    JSON.stringify(result.initialState)!==JSON.stringify(job.initialState)||!run.data)
    throw new Error("Sector evidence requires one matching verified cavity job, result and artifact");
  const {model,initialState,data,dressedSpectrum}=result;
  if(run.data.byteLength!==data.rows*6*8||data.columns.length!==6||
    data.columns.join(",")!=="time,p_excited,mean_photon,boundary_probability,norm,parity")
    throw new Error("Sector evidence requires the six recorded cavity columns");
  const initialExcitation=initialState.photons+(initialState.qubit==="excited"?1:0);
  const initialParity=(initialState.qubit==="ground"?1:-1)*(initialState.photons%2?-1:1);
  const initialValue=model.type==="jaynes_cummings"?initialExcitation:initialParity;
  const view=new DataView(run.data.buffer,run.data.byteOffset,run.data.byteLength);
  let maximumDrift=0;
  for(let i=0;i<data.rows;i++){
    const offset=i*6;
    const values=Array.from({length:6},(_,j)=>view.getFloat64((offset+j)*8,true));
    if(!values.every(Number.isFinite))throw new Error("Non-finite saved cavity row");
    const [,pExcited,meanPhoton,,norm,parity]=values;
    const conserved=model.type==="jaynes_cummings"?meanPhoton+pExcited:parity;
    maximumDrift=Math.max(maximumDrift,Math.abs(conserved-initialValue*norm));
  }
  if(maximumDrift>1e-5*Math.max(1,Math.abs(initialValue)))
    throw new Error("Saved cavity rows do not support a conserved-sector label");
  const levels:CavitySectorLevel[]=[];
  if(model.type==="jaynes_cummings"){
    const analytic=jaynesCummingsLevels(model.parameters);
    if(analytic.length!==dressedSpectrum.length)throw new Error("Dressed spectrum has the wrong finite-basis size");
    for(let i=0;i<analytic.length;i++){
      if(!Number.isFinite(dressedSpectrum[i])||!close(analytic[i].energy,dressedSpectrum[i]))
        throw new Error("Saved dressed energies disagree with excitation-sector blocks");
      const sameEnergy=analytic.filter(item=>close(item.energy,analytic[i].energy));
      const excitation=new Set(sameEnergy.map(item=>item.excitation)).size===1?analytic[i].excitation:null;
      levels.push({index:i,energy:dressedSpectrum[i],excitation,
        cutoffEdge:excitation!==null&&analytic[i].cutoffEdge});
    }
  }
  return {runId:result.runId,model:model.type,quantity:model.type==="jaynes_cummings"?"excitation number":"parity",
    initialValue,maximumDrift,levels,unresolvedLevels:levels.filter(level=>level.excitation===null).length,
    source:"verified saved run"};
}
