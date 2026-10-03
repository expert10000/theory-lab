import type {OscillatorFamilyResult} from "../../../packages/contracts";

export type OscillatorSelection=
  | {kind:"energy";runId:string;index:number}
  | {kind:"position";runId:string;index:number}
  | {kind:"time";runId:string;index:number};
export type OscillatorItem=
  | {kind:"energy";index:number;energy:number;coefficients:number[]|null;spatialStateAvailable:boolean}
  | {kind:"position";index:number;q:number;amplitude:number;density:number}
  | {kind:"time";index:number;values:Record<string,number>};
export interface OscillatorRunContext {
  result:OscillatorFamilyResult;
  selection:OscillatorSelection|null;
  item:OscillatorItem|null;
  stale:boolean;
}
export function selectedOscillatorItem(selection:OscillatorSelection|null,result:OscillatorFamilyResult|null,data:Float64Array|null):OscillatorItem|null{
  if(!selection||!result||selection.runId!==result.runId||!Number.isInteger(selection.index)||selection.index<0)return null;
  const index=selection.index;
  if(result.operation==="oscillator"&&selection.kind==="energy"&&index<result.spectrum.energies.length){
    const energy=result.spectrum.energies[index];
    return Number.isFinite(energy)?{kind:"energy",index,energy,coefficients:null,spatialStateAvailable:index===result.model.parameters.state}:null;
  }
  if(result.operation==="oscillator"&&selection.kind==="position"&&index<result.state.q.length&&
    result.state.q.length===result.state.amplitude.length&&result.state.q.length===result.state.density.length){
    const q=result.state.q[index],amplitude=result.state.amplitude[index],density=result.state.density[index];
    return [q,amplitude,density].every(Number.isFinite)?{kind:"position",index,q,amplitude,density}:null;
  }
  if(result.operation==="oscillator_anharmonic"&&selection.kind==="energy"&&index<result.spectrum.energies.length){
    const energy=result.spectrum.energies[index],coefficients=result.states.coefficients[index];
    return Number.isFinite(energy)&&Array.isArray(coefficients)&&coefficients.every(Number.isFinite)?
      {kind:"energy",index,energy,coefficients,spatialStateAvailable:false}:null;
  }
  if("data" in result&&selection.kind==="time"&&data){
    const stride=result.data.columns.length;
    if(index>=result.data.rows||stride<2||data.length!==result.data.rows*stride)return null;
    const values=Object.fromEntries(result.data.columns.map((column,col)=>[column,data[index*stride+col]]));
    return Object.values(values).every(Number.isFinite)?{kind:"time",index,values}:null;
  }
  return null;
}
export function decodeOscillatorData(bytes:Uint8Array,result:OscillatorFamilyResult):Float64Array|null{
  if(!("data" in result))return null;
  const stride=result.data.columns.length;
  if(bytes.byteLength!==result.data.bytes||bytes.byteLength!==result.data.rows*stride*8)throw new Error("Oscillator artifact shape mismatch");
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),values=new Float64Array(bytes.byteLength/8);
  for(let index=0;index<values.length;index++){
    values[index]=view.getFloat64(index*8,true);
    if(!Number.isFinite(values[index]))throw new Error("Oscillator artifact contains nonfinite data");
  }
  return values;
}
