import type {QuantumResult} from "../../../packages/contracts";
import {supportsScene} from "../../../packages/quantum-scene/from-result";
import type {ScenePayload} from "../../../packages/quantum-scene";

export type SceneView="standard"|"bands";
export type SceneSample=
  | {kind:"evolution_time";index:number}
  | {kind:"ssh_site";index:number}
  | {kind:"ssh_band";index:number}
  | {kind:"qwz_cell";x:number;y:number;grid:number}
  | {kind:"ising_site";index:number}
  | {kind:"orbital_voxel";x:number;y:number;z:number}
  | {kind:"unmapped";description:string};
export interface SceneLaunch {nonce:number;runId:string;view:SceneView;sample?:SceneSample|null}
export type SceneFocus={kind:"object";objectId:string;index:number}|{kind:"voxel";grid:[number,number,number]};

/** UI capability only; main still verifies the saved result and generated scene. */
export function availableSceneViews(result:QuantumResult):{standard:boolean;bands:boolean}{
  if(result.operation==="topology"){
    const analysis=result.analysis;
    return {standard:result.model.type==="ssh"||analysis.kind==="qwz"&&!analysis.gapClosed,
      bands:!!analysis.lowerBand&&!!analysis.upperBand&&
        (analysis.kind==="ssh"||!!analysis.bandKValues)};
  }
  return {standard:supportsScene(result.operation,result.model.type),bands:false};
}

/** Preserve a selection only when the existing scene has that exact saved sample. */
export function sceneFocusForLaunch(payload:ScenePayload,launch:SceneLaunch|null):{focus:SceneFocus|null;message:string}{
  if(!launch||payload.scene.provenance.runId!==launch.runId)return {focus:null,message:"Full saved-run scene; no lab selection attached."};
  const sample=launch.sample;
  if(!sample)return {focus:null,message:"Full saved-run scene; no sample was selected in the source lab."};
  if(sample.kind==="unmapped")return {focus:null,message:`Full saved-run scene; ${sample.description} has no scene sample mapping.`};
  if(sample.kind==="orbital_voxel"){
    const field=payload.scene.fields?.find(value=>value.kind==="complex-field");
    const grid:[number,number,number]=[sample.x,sample.y,sample.z];
    if(launch.view==="standard"&&field&&grid.every((value,index)=>Number.isInteger(value)&&value>=0&&value<field.grid.shape[index]))
      return {focus:{kind:"voxel",grid},message:`Linked saved orbital voxel (${grid.join(", ")}).`};
  }else{
    let objectId:string|null=null,index:number|null=null,expectedCount:number|null=null;
    if(sample.kind==="evolution_time"&&launch.view==="standard"&&
      ["driven_two_level","landau_zener","stuckelberg","strong_drive"].includes(payload.scene.provenance.model)){
      objectId="bloch-trajectory";index=sample.index;
      expectedCount=payload.scene.datasets.find(data=>data.id==="time")?.count??null;
    }else if(sample.kind==="ssh_site"&&launch.view==="standard"&&payload.scene.provenance.model==="ssh"){
      objectId="edge-density";index=sample.index;
    }else if(sample.kind==="ssh_band"&&launch.view==="bands"&&payload.scene.provenance.model==="ssh"){
      objectId="band-0";index=sample.index;
    }else if(sample.kind==="qwz_cell"&&launch.view==="standard"&&payload.scene.provenance.model==="qwz"&&
      Number.isInteger(sample.x)&&Number.isInteger(sample.y)&&Number.isInteger(sample.grid)&&
      sample.grid>0&&sample.x>=0&&sample.x<sample.grid&&sample.y>=0&&sample.y<sample.grid){
      objectId="berry-curvature";index=sample.x*sample.grid+sample.y;expectedCount=sample.grid*sample.grid;
    }else if(sample.kind==="ising_site"&&launch.view==="standard"&&payload.scene.provenance.model==="ising_chain"){
      objectId="ising-sites";index=sample.index;
    }
    const object=payload.scene.objects.find(value=>value.id===objectId);
    const count=object?payload.scene.datasets.find(data=>data.id===object.positions)?.count:null;
    if(object&&count!==null&&count!==undefined&&Number.isInteger(index)&&index!==null&&index>=0&&index<count&&
      (expectedCount===null||expectedCount===count))
      return {focus:{kind:"object",objectId:object.id,index},message:`Linked saved ${sample.kind.replaceAll("_"," ")} sample ${index}.`};
  }
  return {focus:null,message:"Full saved-run scene; selected lab sample is not represented by this scene view."};
}
