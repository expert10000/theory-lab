import type { TopologyJob, WorkspaceSnapshot } from "../contracts";
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
