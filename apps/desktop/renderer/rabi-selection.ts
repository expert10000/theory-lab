import type { EvolutionResult } from "../../../packages/contracts";
import { sampleAt, type EvolutionSample } from "../../../packages/quantum-3d/evolution";

export interface RabiTimeSelection {
  kind: "time_sample";
  model: "driven_two_level";
  runId: string;
  index: number;
}

export interface RabiRunContext {
  result: EvolutionResult;
  selection: RabiTimeSelection;
  sample: EvolutionSample;
  stale: boolean;
}

export function selectedRabiSample(
  selection: RabiTimeSelection | null,
  result: EvolutionResult | null,
  data: Float64Array | null,
): EvolutionSample | null {
  if (!selection || !result || !data || result.model.type !== "driven_two_level" ||
      selection.kind !== "time_sample" || selection.model !== "driven_two_level" ||
      selection.runId !== result.runId || data.length !== result.data.rows * 10 ||
      !Number.isInteger(selection.index) || selection.index < 0 || selection.index >= result.data.rows)
    return null;
  return sampleAt(data, selection.index);
}
