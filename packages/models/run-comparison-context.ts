import type {QuantumResult,VerifiedSavedRun} from "../contracts";
import type {RunComparison} from "./run-comparison";

export interface ComparisonDelta {label:string;unit:string;a:number;b:number;delta:number}
export interface ComparisonContext {
  compatibleModel:boolean;
  parameters:ComparisonDelta[];
  gap:ComparisonDelta|null;
  diagnostics:ComparisonDelta[];
  observables:{name:string;unit:string;maxAbsDelta:number;rmsDelta:number}[];
  runtime:ComparisonDelta|null;
  backend:{a:string;b:string};
  withheld:string[];
}

const delta=(label:string,unit:string,a:number,b:number):ComparisonDelta=>({label,unit,a,b,delta:b-a});
const finite=(value:unknown):value is number=>typeof value==="number"&&Number.isFinite(value);
const countKeys=new Set(["sites","cells","kPoints","grid","cutoff","ncut","levels","points","samples","state","n","l","m","Z"]);
function inputUnit(operation:string,key:string):string{
  if(countKeys.has(key))return "count";
  if(operation==="circuit")return key==="EJ"||key==="EC"?"GHz":"dimensionless";
  if(operation==="orbital")return key==="radius"?"a₀": "dimensionless";
  if(key==="phase")return "rad";
  return "normalized";
}
function modelParameters(run:VerifiedSavedRun):Record<string,unknown>{
  return run.result.model.parameters as unknown as Record<string,unknown>;
}
function storedGap(result:QuantumResult):{value:number;unit:string;label:string}|null{
  switch(result.operation){
    case "diagonalize":return {value:result.spectrum.eigenvalues[1]-result.spectrum.eigenvalues[0],unit:result.spectrum.units,label:"Level gap"};
    case "circuit":return {value:result.spectrum.e01,unit:result.spectrum.units,label:"E₀₁ transition"};
    case "many_body":return {value:result.spectrum.gap,unit:result.spectrum.units,label:"Many-body gap"};
    case "topology":return {value:result.analysis.bulkGap,unit:"normalized",label:"Bulk gap"};
    case "oscillator":case "oscillator_anharmonic":return result.spectrum.energies.length>=2?
      {value:result.spectrum.energies[1]-result.spectrum.energies[0],unit:result.spectrum.units,label:"Level gap"}:null;
    default:return null;
  }
}
const diagnosticFields:Partial<Record<QuantumResult["operation"],readonly {path:string;label:string;unit:string}[]>>={
  diagonalize:[{path:"stateAnalysis.states.0.residualNorm",label:"Lower-state residual norm",unit:"norm"},
    {path:"stateAnalysis.states.1.residualNorm",label:"Upper-state residual norm",unit:"norm"}],
  circuit:[{path:"spectrum.cutoffDriftE01",label:"E₀₁ cutoff drift",unit:"GHz"}],
  oscillator:[{path:"analysis.ladderError",label:"Ladder error",unit:"normalized"},
    {path:"analysis.cutoffDrift",label:"Cutoff drift",unit:"normalized"}],
  oscillator_evolve:[{path:"analysis.maxNormDrift",label:"Maximum norm drift",unit:"dimensionless"},
    {path:"analysis.maxEnergyDrift",label:"Maximum energy drift",unit:"normalized"}],
  oscillator_drive:[{path:"analysis.maxNormDrift",label:"Maximum norm drift",unit:"dimensionless"},
    {path:"analysis.maxWorkBalanceError",label:"Work-balance error",unit:"normalized"}],
  oscillator_pulse:[{path:"analysis.maxNormDrift",label:"Maximum norm drift",unit:"dimensionless"},
    {path:"analysis.maxWorkBalanceError",label:"Work-balance error",unit:"normalized"}],
  oscillator_damped:[{path:"analysis.maxTraceError",label:"Maximum trace error",unit:"dimensionless"},
    {path:"analysis.maxBoundaryOccupation",label:"Maximum boundary occupation",unit:"probability"}],
  oscillator_parametric:[{path:"analysis.maxNormDrift",label:"Maximum norm drift",unit:"dimensionless"},
    {path:"analysis.maxParityDrift",label:"Maximum parity drift",unit:"dimensionless"}],
};
function storedNumber(value:unknown,path:string):number|null{
  const found=path.split(".").reduce<unknown>((current,key)=>{
    if(!current||typeof current!=="object")return undefined;
    return (current as Record<string,unknown>)[key];
  },value);
  return finite(found)?found:null;
}

/** Renderer-only projection of two hash-verified runs; never recomputes physics. */
export function comparisonContext(a:VerifiedSavedRun,b:VerifiedSavedRun,comparison:RunComparison):ComparisonContext{
  const left=a.result,right=b.result;
  const samePair=comparison.a===left.runId&&comparison.b===right.runId;
  const compatibleModel=samePair&&left.runId!==right.runId&&left.operation===right.operation&&left.model.type===right.model.type;
  const aligned=compatibleModel&&comparison.status==="aligned";
  const withheld:string[]=[];
  const parameters:ComparisonDelta[]=[];
  if(compatibleModel){
    const av=modelParameters(a),bv=modelParameters(b);
    for(const key of Object.keys(av).sort())if(finite(av[key])&&finite(bv[key])&&av[key]!==bv[key])
      parameters.push(delta(key,inputUnit(left.operation,key),av[key],bv[key]));
  }else withheld.push("Parameter deltas require two distinct verified runs of the same operation and model.");
  let gap:ComparisonDelta|null=null;
  if(aligned){
    const ag=storedGap(left),bg=storedGap(right);
    if(ag&&bg&&ag.label===bg.label&&ag.unit===bg.unit&&finite(ag.value)&&finite(bg.value))
      gap=delta(ag.label,ag.unit,ag.value,bg.value);
    else withheld.push("No aligned stored gap or transition is available for this result type.");
  }else withheld.push("Physical gap and diagnostic deltas require aligned recorded observables.");
  const diagnostics:ComparisonDelta[]=[];
  if(aligned)for(const field of diagnosticFields[left.operation]??[]){
    const av=storedNumber(left,field.path),bv=storedNumber(right,field.path);
    if(av!==null&&bv!==null)diagnostics.push(delta(field.label,field.unit,av,bv));
    else withheld.push(`${field.label}: not recorded in both runs.`);
  }
  const ar=left.provenance.durationMs,br=right.provenance.durationMs;
  const runtime=compatibleModel&&finite(ar)&&finite(br)?delta("Worker runtime","ms",ar,br):null;
  return {compatibleModel,parameters,gap,diagnostics,
    observables:aligned?comparison.observables.map(item=>({name:item.name,unit:item.unit,maxAbsDelta:item.maxAbsDelta,rmsDelta:item.rmsDelta})):[],
    runtime,backend:{a:`${left.engine.name} ${left.engine.version}`,b:`${right.engine.name} ${right.engine.version}`},withheld};
}
