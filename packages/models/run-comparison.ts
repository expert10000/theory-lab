import type {QuantumResult,VerifiedSavedRun} from "../contracts";
import { alignScientificSeries, matchTwoLevelEigenstates } from "./scientific-alignment";

export interface ComparedObservable {
  name:string;unit:string;coordinate:string;positions:number[];
  a:number[];b:number[];maxAbsDelta:number;rmsDelta:number;
  alignment?: "exact" | "linear"; flags?: string[];
}
export interface RunComparison {
  a:string;b:string;operation:string;model:string;
  status:"aligned"|"metadata-only";reason:string;
  observables:ComparedObservable[];withheld:string[];
  eigenstates?: { assignment: readonly [number,number]; fidelities: readonly [number,number]; flags:string[] };
}

const same=(a:number,b:number)=>Math.abs(a-b)<=1e-10*Math.max(1,Math.abs(a),Math.abs(b));
const aligned=(a:readonly number[],b:readonly number[])=>a.length===b.length&&a.every((v,i)=>same(v,b[i]));
const indices=(length:number)=>Array.from({length},(_,i)=>i);
function metric(name:string,unit:string,coordinate:string,positions:number[],a:number[],b:number[]):ComparedObservable|null{
  if(a.length!==b.length||a.length!==positions.length||!a.length||
    ![...positions,...a,...b].every(Number.isFinite))return null;
  const deltas=a.map((v,i)=>b[i]-v);
  return {name,unit,coordinate,positions,a,b,
    maxAbsDelta:deltas.reduce((max,v)=>Math.max(max,Math.abs(v)),0),
    rmsDelta:Math.sqrt(deltas.reduce((sum,v)=>sum+v*v,0)/deltas.length)};
}
function bytesAsRows(run:VerifiedSavedRun):{columns:string[];rows:number;values:Float64Array}|null{
  const result=run.result;
  if(!("data" in result)||!run.data||!("columns" in result.data)||!("rows" in result.data))return null;
  const {columns,rows,bytes}=result.data;
  if(run.data.byteLength!==bytes||bytes!==rows*columns.length*8)return null;
  const view=new DataView(run.data.buffer,run.data.byteOffset,run.data.byteLength),values=new Float64Array(bytes/8);
  for(let i=0;i<values.length;i++){
    values[i]=view.getFloat64(i*8,true);
    if(!Number.isFinite(values[i]))return null;
  }
  return {columns:[...columns],rows,values};
}
function column(rows:ReturnType<typeof bytesAsRows>,name:string):number[]|null{
  if(!rows)return null;
  const offset=rows.columns.indexOf(name);
  return offset<0?null:Array.from({length:rows.rows},(_,i)=>rows.values[i*rows.columns.length+offset]);
}
function sweepValues(run:VerifiedSavedRun):number[]|null{
  const result=run.result;
  if(result.operation!=="sweep"||!run.data||run.data.byteLength!==result.data.bytes)return null;
  const values=new Float64Array(result.data.bytes/8),view=new DataView(run.data.buffer,run.data.byteOffset,run.data.byteLength);
  if(values.length!==result.data.shape.x*result.data.shape.y)return null;
  for(let i=0;i<values.length;i++)values[i]=view.getFloat64(i*8,true);
  return [...values];
}
function orbitalDensities(run:VerifiedSavedRun):number[]|null{
  const result=run.result;
  if(result.operation!=="orbital"||!run.data||run.data.byteLength!==result.data.bytes)return null;
  const view=new DataView(run.data.buffer,run.data.byteOffset,run.data.byteLength),values:number[]=[];
  if(result.data.rows*16!==run.data.byteLength)return null;
  for(let i=0;i<result.data.rows;i++){
    const re=view.getFloat64(i*16,true),im=view.getFloat64(i*16+8,true);
    values.push(re*re+im*im);
  }
  return values;
}
function identicalValues(a:unknown,b:unknown){return JSON.stringify(a)===JSON.stringify(b);}

/** Compare only declared observables. Missing or unaligned data never receives a fabricated delta. */
export function compareVerifiedRuns(a:VerifiedSavedRun,b:VerifiedSavedRun,
  options: { interpolation?: "none" | "linear" } = {}):RunComparison{
  const left=a.result,right=b.result,observables:ComparedObservable[]=[],withheld:string[]=[];
  let eigenstates: RunComparison["eigenstates"];
  const out=(reason:string):RunComparison=>({a:left.runId,b:right.runId,operation:left.operation,model:left.model.type,
    status:observables.length?"aligned":"metadata-only",reason,observables,withheld,...(eigenstates?{eigenstates}:{})});
  const add=(name:string,unit:string,coordinate:string,positions:number[],av:number[]|null,bv:number[]|null)=>{
    const item=av&&bv?metric(name,unit,coordinate,positions,av,bv):null;
    if(item)observables.push(item);else withheld.push(`${name}: missing or unaligned saved values`);
  };
  const addResampled=(name:string,unit:string,coordinate:string,positionsA:number[],valuesA:number[]|null,
    positionsB:number[],valuesB:number[]|null,coordinateUnit:string)=>{
    const alignment=valuesA&&valuesB?alignScientificSeries(
      {positions:positionsA,values:valuesA,coordinateUnit,valueUnit:unit},
      {positions:positionsB,values:valuesB,coordinateUnit,valueUnit:unit},
      options.interpolation==="linear"?"linear":"exact"):null;
    const item=alignment?metric(name,unit,coordinate,alignment.positions,alignment.a,alignment.b):null;
    if(item)observables.push({...item,alignment:alignment!.policy,flags:alignment!.flags});
    else withheld.push(`${name}: saved coordinates differ or scalar interpolation is unavailable`);
  };
  if(left.runId===right.runId)return out("Choose two distinct saved runs.");
  if(left.operation!==right.operation||left.model.type!==right.model.type)
    return out("Different operation or model: metadata only; no physical delta is defined.");
  switch(left.operation){
    case "diagonalize":{
      if(right.operation!=="diagonalize")break;
      if(left.spectrum.units!==right.spectrum.units)return out("Energy units differ.");
      add("E− / E+",left.spectrum.units,"level",[0,1],left.spectrum.eigenvalues,right.spectrum.eigenvalues);
      if (left.stateAnalysis?.status==="resolved" && right.stateAnalysis?.status==="resolved")
        eigenstates=matchTwoLevelEigenstates(left.stateAnalysis,right.stateAnalysis)??undefined;
      if (!eigenstates) withheld.push("Eigenstate matching: missing, degenerate or ambiguous states; no gauge-dependent amplitude delta");
      break;
    }
    case "circuit":{
      if(right.operation!=="circuit")break;
      if(left.spectrum.units!==right.spectrum.units)return out("Energy units differ.");
      add("Transmon levels","GHz","level",indices(left.spectrum.energies.length),left.spectrum.energies,right.spectrum.energies);
      add("E01 / E12 / anharmonicity","GHz","quantity",[0,1,2],
        [left.spectrum.e01,left.spectrum.e12,left.spectrum.anharmonicity],
        [right.spectrum.e01,right.spectrum.e12,right.spectrum.anharmonicity]);
      break;
    }
    case "many_body":{
      if(right.operation!=="many_body")break;
      if(left.model.parameters.sites!==right.model.parameters.sites||left.model.parameters.boundary!==right.model.parameters.boundary)
        return out("Chain size or boundary differs; level and site indexes are not aligned.");
      add("Low energies","normalized","level",indices(left.spectrum.lowEnergies.length),left.spectrum.lowEnergies,right.spectrum.lowEnergies);
      add("Site magnetization","dimensionless","site",indices(left.groundState.siteMagnetization.length),left.groundState.siteMagnetization,right.groundState.siteMagnetization);
      break;
    }
    case "topology":{
      if(right.operation!=="topology")break;
      if(left.analysis.kind!==right.analysis.kind)return out("Topology analyses use different models.");
      if(left.analysis.kind==="ssh"&&right.analysis.kind==="ssh"){
        if(options.interpolation!=="linear"&&!aligned(left.analysis.kValues,right.analysis.kValues))
          return out("SSH k-sample grids differ.");
        addResampled("Lower band","normalized","k",left.analysis.kValues,left.analysis.lowerBand,
          right.analysis.kValues,right.analysis.lowerBand,"rad");
        addResampled("Upper band","normalized","k",left.analysis.kValues,left.analysis.upperBand,
          right.analysis.kValues,right.analysis.upperBand,"rad");
        if(left.model.type==="ssh"&&right.model.type==="ssh"&&left.model.parameters.cells===right.model.parameters.cells)
          add("Edge density","probability","site",indices(left.analysis.edgeDensity.length),left.analysis.edgeDensity,right.analysis.edgeDensity);
        else withheld.push("Edge density: finite-chain sizes differ");
      }else if(left.analysis.kind==="qwz"&&right.analysis.kind==="qwz"){
        if(left.model.type!=="qwz"||right.model.type!=="qwz"||left.model.parameters.grid!==right.model.parameters.grid)
          return out("QWZ curvature meshes differ.");
        if(left.analysis.gapClosed||right.analysis.gapClosed)withheld.push("Berry curvature: undefined at gap closure");
        else add("Berry curvature","dimensionless","mesh cell",indices(left.analysis.berryCurvature.length),left.analysis.berryCurvature,right.analysis.berryCurvature);
        if(left.analysis.bandKValues&&right.analysis.bandKValues&&aligned(left.analysis.bandKValues,right.analysis.bandKValues)){
          add("Lower band","normalized","k sample",indices(left.analysis.lowerBand?.length??0),left.analysis.lowerBand??null,right.analysis.lowerBand??null);
          add("Upper band","normalized","k sample",indices(left.analysis.upperBand?.length??0),left.analysis.upperBand??null,right.analysis.upperBand??null);
        }else withheld.push("Band samples: unavailable or k paths differ");
      }
      break;
    }
    case "orbital":{
      if(right.operation!=="orbital")break;
      if(left.model.parameters.basis!==right.model.parameters.basis)return out("Orbital basis conventions differ.");
      add("Energy","Hartree","quantity",[0],[left.analysis.energyHartree],[right.analysis.energyHartree]);
      addResampled("Radial probability","a₀⁻¹","radius / a₀",left.analysis.radialRadii,left.analysis.radialProbability,
        right.analysis.radialRadii,right.analysis.radialProbability,"dimensionless");
      if(left.model.parameters.grid===right.model.parameters.grid&&left.model.parameters.radius===right.model.parameters.radius)
        add("Grid density","a₀⁻³","voxel index",indices(left.data.rows),orbitalDensities(a),orbitalDensities(b));
      else withheld.push("Grid density: box or grid differs");
      break;
    }
    case "oscillator":{
      if(right.operation!=="oscillator")break;
      if(left.spectrum.units!==right.spectrum.units)return out("Energy units differ.");
      add("Harmonic levels","normalized","level",indices(left.spectrum.energies.length),left.spectrum.energies,right.spectrum.energies);
      addResampled("Spatial density","q⁻¹","q",left.state.q,left.state.density,right.state.q,right.state.density,"dimensionless");
      break;
    }
    case "oscillator_anharmonic":{
      if(right.operation!=="oscillator_anharmonic")break;
      add("Quartic levels","normalized","level",indices(left.spectrum.energies.length),left.spectrum.energies,right.spectrum.energies);
      withheld.push("Fock coefficients: eigenvector sign/phase is not a physical delta");
      break;
    }
    case "sweep":{
      if(right.operation!=="sweep")break;
      if(!identicalValues(left.sweep,right.sweep)||!identicalValues(left.data.shape,right.data.shape))
        return out("Sweep axes, time window or initial index differ; cells are not aligned.");
      add("Final P₁","probability","row-major cell",indices(left.data.shape.x*left.data.shape.y),sweepValues(a),sweepValues(b));
      break;
    }
    default:{
      if(!("data" in left)&&!("data" in right))return out("No declared comparable observable for this result type.");
      const ar=bytesAsRows(a),br=bytesAsRows(b),timesA=column(ar,"time"),timesB=column(br,"time");
      if(!ar||!br||!timesA||!timesB)
        return out("Saved time coordinates differ or a verified binary row is unavailable.");
      if(options.interpolation!=="linear"&&!aligned(timesA,timesB))
        return out("Saved time coordinates differ or a verified binary row is unavailable.");
      const fields:Record<string,string[]>= {
        evolve:["p0","p1","sigma_x","sigma_y","sigma_z"],
        cavity:["p_excited","mean_photon","boundary_probability","norm","parity"],
        lindblad:["p_excited","mean_photon","purity","coherence","boundary_probability","trace"],
        oscillator_evolve:["q_mean","p_mean","q_variance","p_variance","mean_number","boundary_probability","norm"],
        oscillator_drive:["q_mean","p_mean","q_variance","p_variance","mean_number","boundary_probability","norm"],
        oscillator_pulse:["q_mean","p_mean","q_variance","p_variance","mean_number","boundary_probability","norm"],
        oscillator_damped:["mean_number","purity","trace","boundary_probability","coherence"],
        oscillator_parametric:["q_mean","p_mean","q_variance","p_variance","mean_number","boundary_probability","norm","parity"],
      };
      const selected=fields[left.operation]??[];
      if(!selected.length)return out("No declared comparable observable for this operation.");
      for(const name of selected){
        const unit=name.startsWith("p_")||name==="purity"||name==="norm"||name==="trace"||name==="parity"||name==="boundary_probability"?"dimensionless":
          name==="mean_number"||name==="mean_photon"?"quanta":"normalized";
        addResampled(name,unit,"time",timesA,column(ar,name),timesB,column(br,name),"model-time");
      }
      if(left.operation==="oscillator_damped")withheld.push("Density-matrix elements: not compared as scalar observables");
      if(left.operation==="evolve"||left.operation.startsWith("oscillator_"))withheld.push("Complex amplitudes: global phase is not compared pointwise");
      break;
    }
  }
  return out(observables.length?observables.some(item=>item.alignment==="linear")?
    "Opt-in linear alignment on overlapping saved coordinates; interpolation uncertainty is unquantified.":
    "Aligned declared observables; Δ = B − A at the same saved coordinate.":
    "No declared observables align; metadata only.");
}
