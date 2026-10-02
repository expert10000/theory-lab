import type { EvolutionResult } from "../../../packages/contracts";
import type { EvolutionSample } from "../../../packages/quantum-3d/evolution";
import { selectedEvolutionSample, type EvolutionRunContext, type EvolutionTimeSelection } from "./evolution-selection";

/** Backward-compatible name for the first linked evolution adapter. */
export type RabiTimeSelection = EvolutionTimeSelection & {model:"driven_two_level"};
export type RabiRunContext = EvolutionRunContext & {selection:RabiTimeSelection};
export function selectedRabiSample(selection:RabiTimeSelection|null,result:EvolutionResult|null,data:Float64Array|null):EvolutionSample|null {
  if(result?.model.type!=="driven_two_level")return null;
  return selectedEvolutionSample(selection,result,data);
}
