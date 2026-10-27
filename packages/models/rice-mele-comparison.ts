import type { RiceMelePumpAnalysis, TopologyResult } from "../contracts";

/** The two traces may be compared only as observations from one saved cycle. */
export function linkedRiceMeleTraces(result: TopologyResult): {
  runId: string;
  parameters: Extract<TopologyResult["model"], { type: "rice_mele_pump" }>["parameters"];
  bulk: NonNullable<RiceMelePumpAnalysis["dynamics"]>;
  chain: NonNullable<RiceMelePumpAnalysis["finiteChain"]>;
} | null {
  if (result.model.type !== "rice_mele_pump" || result.analysis.kind !== "rice_mele_pump") return null;
  const { dynamics: bulk, finiteChain: chain } = result.analysis;
  if (!bulk || !chain) return null;
  const p = result.model.parameters;
  const count = p.phaseSamples + 1;
  if (p.chainCells !== chain.cells || p.duration !== bulk.duration || p.duration !== chain.duration ||
      p.stepsPerPhase !== bulk.stepsPerPhase || p.stepsPerPhase !== chain.stepsPerPhase ||
      bulk.timeValues.length !== count || chain.timeValues.length !== count ||
      bulk.phaseValues.length !== count || chain.phaseValues.length !== count ||
      !bulk.timeValues.every((v, i) => Number.isFinite(v) && v === chain.timeValues[i]) ||
      !bulk.phaseValues.every((v, i) => Number.isFinite(v) && v === chain.phaseValues[i])) return null;
  return { runId: result.runId, parameters: p, bulk, chain };
}
