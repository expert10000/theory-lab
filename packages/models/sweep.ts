import type { EngineName, SweepAxis, SweepJob } from "../contracts";
import { MODEL_REGISTRY, evolutionJob, type EvolutionModelId } from "./index";

export const SWEEP_DEFAULTS: Record<EvolutionModelId, { x: SweepAxis; y: SweepAxis }> = {
  driven_two_level: {
    x: { parameter: "amplitude", start: 0, stop: 2, points: 25 },
    y: { parameter: "frequency", start: .6, stop: 1.4, points: 15 },
  },
  landau_zener: {
    x: { parameter: "gap", start: 0, stop: 1.6, points: 25 },
    y: { parameter: "sweepRate", start: .5, stop: 2, points: 15 },
  },
  stuckelberg: {
    x: { parameter: "gap", start: 0, stop: 1.6, points: 25 },
    y: { parameter: "turnTime", start: 2, stop: 6, points: 15 },
  },
  strong_drive: {
    x: { parameter: "amplitude", start: 0, stop: 2.5, points: 25 },
    y: { parameter: "frequency", start: .6, stop: 1.4, points: 15 },
  },
};

export function sweepJob(
  modelId: EvolutionModelId,
  jobId: string,
  parameters: Record<string, string>,
  x: SweepAxis,
  y: SweepAxis | null,
  tStart: number,
  tStop: number,
  initialIndex: 0 | 1,
  engine: EngineName,
): SweepJob {
  const definition = MODEL_REGISTRY[modelId];
  const validateAxis = (axis: SweepAxis) => {
    const parameter = definition.parameters.find(item => item.key === axis.parameter);
    if (!parameter || !Number.isFinite(axis.start) || !Number.isFinite(axis.stop) ||
        axis.start < parameter.minimum || axis.stop > parameter.maximum || axis.start >= axis.stop ||
        !Number.isInteger(axis.points) || axis.points < 2 || axis.points > 101)
      throw new Error("Invalid sweep axis or parameter range");
  };
  validateAxis(x);
  if (y) {
    validateAxis(y);
    if (x.parameter === y.parameter) throw new Error("Sweep axes must differ");
  }
  if (x.points * (y?.points ?? 1) > 10000) throw new Error("Sweep exceeds 10,000 cells");
  const base = evolutionJob(modelId, jobId, parameters, initialIndex, tStart, tStop, 2, engine);
  return { schema: "quantum-job/v1", jobId, operation: "sweep", engine,
    model: base.model, sweep: { x, y, metric: "final_p1", tStart, tStop, initialIndex } };
}
