import type { CircuitResult } from "../../../packages/contracts";

export interface CircuitLevelSelection {kind:"energy_level";runId:string;index:number}
export interface CircuitLevel {index:number;energyGHz:number;relativeGHz:number}
export interface CircuitRunContext {
  result:CircuitResult;
  selection:CircuitLevelSelection|null;
  level:CircuitLevel|null;
  stale:boolean;
}
export function selectedCircuitLevel(selection:CircuitLevelSelection|null,result:CircuitResult|null):CircuitLevel|null{
  if(!selection||!result||selection.kind!=="energy_level"||selection.runId!==result.runId||
    !Number.isInteger(selection.index)||selection.index<0||selection.index>=result.spectrum.energies.length||
    result.spectrum.energies.length!==result.model.parameters.levels)return null;
  const energy=result.spectrum.energies[selection.index],ground=result.spectrum.energies[0];
  if(!Number.isFinite(energy)||!Number.isFinite(ground))return null;
  return {index:selection.index,energyGHz:energy,relativeGHz:energy-ground};
}
