import type { TopologyJob, TopologyResult, WorkspaceSnapshot } from "../contracts";
import { ATLAS_REVISION, ATLAS_SOURCE, atlasEntry } from "../atlas";

export type TopologyDraft = NonNullable<WorkspaceSnapshot["topology"]>;
export const TOPOLOGY_DEFAULTS: TopologyDraft = {
  modelId: "ssh", t1: "0.6", t2: "1", cells: "16", kPoints: "101", mass: "-1", grid: "21",
};
function numeric(raw: string, minimum: number, maximum: number, integer = false): number {
  if (!raw.trim()) throw new Error("All topology parameters are required");
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value)))
    throw new Error(`Topology parameter must be ${integer ? "an integer" : "finite"} in [${minimum}, ${maximum}]`);
  return value;
}
export function topologyJob(jobId: string, draft: TopologyDraft): TopologyJob {
  const entry = atlasEntry(draft.modelId)!;
  const source = { sourceRepository: `${ATLAS_SOURCE}/tree/${ATLAS_REVISION}`,
    sourceModule: `data/hamiltonian_atlas/${entry.sourceFile}`, volume: "VIII", exampleId: `Atlas ${draft.modelId}` };
  if (draft.modelId === "ssh") return { schema: "quantum-job/v1", jobId, operation: "topology", engine: "native",
    model: { type: "ssh", parameters: { t1: numeric(draft.t1, -10, 10), t2: numeric(draft.t2, -10, 10),
      cells: numeric(draft.cells, 4, 40, true), kPoints: numeric(draft.kPoints, 21, 201, true) }, source } };
  return { schema: "quantum-job/v1", jobId, operation: "topology", engine: "native",
    model: { type: "qwz", parameters: { mass: numeric(draft.mass, -6, 6), grid: numeric(draft.grid, 11, 31, true) }, source } };
}

export function consistentTopologyResult(job: TopologyJob, result: TopologyResult): boolean {
  if (result.jobId !== job.jobId || JSON.stringify(result.model) !== JSON.stringify(job.model) ||
      result.analysis.kind !== job.model.type) return false;
  const a = result.analysis;
  if (job.model.type === "ssh" && a.kind === "ssh") {
    const { t1, t2, cells, kPoints } = job.model.parameters;
    const gap = 2 * Math.abs(Math.abs(t1) - Math.abs(t2));
    return a.kValues.length === kPoints && a.lowerBand.length === kPoints && a.upperBand.length === kPoints &&
      a.edgeDensity.length === 2 * cells && Math.abs(a.bulkGap - gap) < 1e-8 &&
      a.winding === (gap < 1e-10 ? null : Number(Math.abs(t2) > Math.abs(t1))) &&
      Math.abs(a.edgeDensity.reduce((sum, value) => sum + value, 0) - 1) < 1e-7 &&
      Math.abs(a.edgeWeight - a.edgeDensity[0] - a.edgeDensity[a.edgeDensity.length - 1]) < 1e-7 &&
      Math.abs(a.lowerBand[0] + a.upperBand[0]) < 1e-8;
  }
  if (job.model.type === "qwz" && a.kind === "qwz") {
    const { mass, grid } = job.model.parameters;
    const gap = 2 * Math.min(Math.abs(mass + 2), Math.abs(mass), Math.abs(mass - 2));
    if (Math.abs(a.bulkGap - gap) > 1e-8 || a.gapClosed !== (gap < 1e-10)) return false;
    if (a.gapClosed) return a.chern === null && a.latticeChern === null && a.analyticChern === null &&
      !a.meshResolved && a.chernIntegral === null && a.berryCurvature.length === 0;
    const expected = mass > -2 && mass < 0 ? -1 : mass > 0 && mass < 2 ? 1 : 0;
    if (a.analyticChern !== expected || a.latticeChern === null ||
        a.meshResolved !== (a.latticeChern === expected) ||
        a.chern !== (a.meshResolved ? a.latticeChern : null) ||
        a.chernIntegral === null || a.berryCurvature.length !== grid * grid) return false;
    const integral = a.berryCurvature.reduce((sum, value) => sum + value, 0) * (2 * Math.PI / grid) ** 2 / (2 * Math.PI);
    return Math.abs(integral - a.chernIntegral) < 1e-7 && a.sampledGap >= gap - 1e-7;
  }
  return false;
}

// Browser-safe structural guard. Unlike the AJV contract compiler this uses no
// runtime code generation, so the web client's strict CSP can remain intact.
export function isTopologyResponse(value: unknown, job: TopologyJob): value is TopologyResult {
  const record = (item: unknown): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item);
  const finite = (item: unknown): item is number => typeof item === "number" && Number.isFinite(item);
  const numericArray = (item: unknown, size: number) => Array.isArray(item) && item.length === size && item.every(finite);
  if (!record(value) || value.schema !== "quantum-result/v1" || value.status !== "completed" ||
      value.operation !== "topology" || value.jobId !== job.jobId ||
      typeof value.runId !== "string" || !/^run-[A-Za-z0-9_-]{1,96}$/.test(value.runId) ||
      !record(value.model) || JSON.stringify(value.model) !== JSON.stringify(job.model) ||
      !record(value.engine) || value.engine.name !== "native" || typeof value.engine.version !== "string" ||
      !record(value.provenance) || typeof value.provenance.pythonVersion !== "string" ||
      typeof value.provenance.workerVersion !== "string" || typeof value.provenance.computedAt !== "string" ||
      !finite(value.provenance.durationMs) || value.provenance.durationMs < 0 || !record(value.analysis)) return false;
  const a = value.analysis;
  if (job.model.type === "ssh") {
    const { cells, kPoints } = job.model.parameters;
    if (a.kind !== "ssh" || !finite(a.bulkGap) || a.bulkGap < 0 ||
        !(a.winding === null || a.winding === 0 || a.winding === 1) ||
        !numericArray(a.kValues, kPoints) || !numericArray(a.lowerBand, kPoints) ||
        !numericArray(a.upperBand, kPoints) || !numericArray(a.edgeEnergies, 2) ||
        !numericArray(a.edgeDensity, 2 * cells) || !finite(a.edgeWeight) || a.edgeWeight < 0 || a.edgeWeight > 1) return false;
  } else {
    const { grid } = job.model.parameters;
    const phase = (item: unknown) => item === null || item === -1 || item === 0 || item === 1;
    if (a.kind !== "qwz" || !finite(a.bulkGap) || a.bulkGap < 0 ||
        !finite(a.sampledGap) || a.sampledGap < 0 || typeof a.gapClosed !== "boolean" ||
        typeof a.meshResolved !== "boolean" || !phase(a.chern) || !phase(a.latticeChern) ||
        !phase(a.analyticChern) || !(a.chernIntegral === null || finite(a.chernIntegral)) ||
        !numericArray(a.berryCurvature, a.gapClosed ? 0 : grid * grid)) return false;
  }
  return consistentTopologyResult(job, value as unknown as TopologyResult);
}
