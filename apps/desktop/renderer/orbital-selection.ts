import type {OrbitalResult} from "../../../packages/contracts";

export type OrbitalSelection=
  | {kind:"radial";runId:string;index:number}
  | {kind:"voxel";runId:string;x:number;y:number;z:number};
export type OrbitalSample=
  | {kind:"radial";index:number;radius:number;probability:number}
  | {kind:"voxel";x:number;y:number;z:number;position:[number,number,number];real:number;imaginary:number;density:number};
export interface OrbitalRunContext {result:OrbitalResult;selection:OrbitalSelection|null;sample:OrbitalSample|null;stale:boolean}
export function selectedOrbitalSample(selection:OrbitalSelection|null,result:OrbitalResult|null,data:Uint8Array|null):OrbitalSample|null{
  if(!selection||!result||selection.runId!==result.runId)return null;
  if(selection.kind==="radial"){
    const {radialRadii,radialProbability}=result.analysis,index=selection.index;
    if(!Number.isInteger(index)||index<0||index>=radialRadii.length||radialRadii.length!==radialProbability.length)return null;
    const radius=radialRadii[index],probability=radialProbability[index];
    return Number.isFinite(radius)&&Number.isFinite(probability)?{kind:"radial",index,radius,probability}:null;
  }
  const n=result.model.parameters.grid,{x,y,z}=selection;
  if(!data||data.byteLength!==n**3*16||![x,y,z].every(value=>Number.isInteger(value)&&value>=0&&value<n))return null;
  const index=(x*n+y)*n+z,view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  const real=view.getFloat64(index*16,true),imaginary=view.getFloat64(index*16+8,true);
  const radius=result.model.parameters.radius,spacing=2*radius/(n-1);
  return Number.isFinite(real)&&Number.isFinite(imaginary)?{kind:"voxel",x,y,z,
    position:[-radius+x*spacing,-radius+y*spacing,-radius+z*spacing],real,imaginary,density:real*real+imaginary*imaginary}:null;
}
