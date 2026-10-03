import type { ManyBodyResult } from "../../../packages/contracts";

export type ManyBodySelection =
  | {kind:"energy_level";runId:string;index:number}
  | {kind:"site_magnetization";runId:string;index:number};
export type ManyBodyItem =
  | {kind:"energy_level";index:number;energy:number;relativeEnergy:number}
  | {kind:"site_magnetization";index:number;magnetization:number};
export interface ManyBodyRunContext {
  result:ManyBodyResult;
  selection:ManyBodySelection|null;
  item:ManyBodyItem|null;
  stale:boolean;
}
export function selectedManyBodyItem(selection:ManyBodySelection|null,result:ManyBodyResult|null):ManyBodyItem|null{
  if(!selection||!result||selection.runId!==result.runId||!Number.isInteger(selection.index)||selection.index<0)return null;
  if(selection.kind==="energy_level"){
    if(selection.index>=result.spectrum.lowEnergies.length)return null;
    const energy=result.spectrum.lowEnergies[selection.index],ground=result.spectrum.lowEnergies[0];
    if(!Number.isFinite(energy)||!Number.isFinite(ground))return null;
    return {kind:"energy_level",index:selection.index,energy,relativeEnergy:energy-ground};
  }
  if(selection.kind==="site_magnetization"){
    if(selection.index>=result.model.parameters.sites||selection.index>=result.groundState.siteMagnetization.length)return null;
    const magnetization=result.groundState.siteMagnetization[selection.index];
    return Number.isFinite(magnetization)?{kind:"site_magnetization",index:selection.index,magnetization}:null;
  }
  return null;
}
