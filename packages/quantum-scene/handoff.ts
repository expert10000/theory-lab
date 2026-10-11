import type { QuantumScene } from "./index";

/** In-memory verification receipt; the portable .qscene format is unchanged. */
export interface SceneHandoffReceipt {
  directory: string;
  bundleSchema: "quantum-scene-bundle/v1";
  sceneSchema: QuantumScene["schema"];
  sceneId: string;
  runId: string;
  resultSha256: string;
  view: "standard" | "bands";
  coordinates: QuantumScene["coordinates"];
  datasets: Pick<QuantumScene["datasets"][number], "id" | "unit" | "count" | "components" | "sha256">[];
  selectionTransferred: false;
}
