import type { EvolutionResult } from "../../../packages/contracts";
import { sampleAt, type EvolutionSample } from "../../../packages/quantum-3d/evolution";

export interface EvolutionTimeSelection {
  kind: "time_sample";
  model: EvolutionResult["model"]["type"];
  runId: string;
  index: number;
}

export interface EvolutionRunContext {
  result: EvolutionResult;
  selection: EvolutionTimeSelection;
  sample: EvolutionSample;
  finalSample: EvolutionSample;
  stale: boolean;
}

/** A time sample is valid only for the exact stored run, model and artifact. */
export function selectedEvolutionSample(
  selection: EvolutionTimeSelection | null,
  result: EvolutionResult | null,
  data: Float64Array | null,
): EvolutionSample | null {
  if (!selection || !result || !data || selection.kind !== "time_sample" ||
      selection.model !== result.model.type || selection.runId !== result.runId ||
      data.length !== result.data.rows * 10 ||
      !Number.isInteger(selection.index) || selection.index < 0 || selection.index >= result.data.rows)
    return null;
  return sampleAt(data, selection.index);
}
