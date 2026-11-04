import type { QuantumResult } from "../contracts";
import { consistentTopologyResult } from "../models/topology";
import { bandSceneFromResult } from "./bands";
import { sceneFromResult } from "./from-result";

export const QWZ_SCENE_COMPILER_VERSION = "qvis-compiler/1" as const;
export const QWZ_SCENE_NUMERIC_POLICY = "source-f64le-exact/1" as const;
export const QWZ_SCENE_RECIPES = [
  { id: "qwz-curvature/v1", view: "standard", sceneSchema: "quantum-scene/v1",
    capabilities: ["berry-curvature", "topology", "reciprocal-guides"] },
  { id: "qwz-bands/v1", view: "bands", sceneSchema: "quantum-scene/v1",
    capabilities: ["band-surfaces", "reciprocal-guides"] },
] as const;
export type QWZSceneRecipeId = typeof QWZ_SCENE_RECIPES[number]["id"];

/** Explicit QWZ registry over the existing scene adapters; compilation is read-only. */
export async function compileQWZSceneRecipe(result: QuantumResult, resultBytes: Uint8Array,
  recipeId: QWZSceneRecipeId, digest: (bytes: Uint8Array) => Promise<string>) {
  const recipe = QWZ_SCENE_RECIPES.find(item => item.id === recipeId);
  if (!recipe) throw new Error("Unsupported QWZ scene recipe");
  if (result.operation !== "topology" || result.model.type !== "qwz" || result.analysis.kind !== "qwz" ||
      !consistentTopologyResult({ schema: "quantum-job/v1", jobId: result.jobId,
        operation: "topology", engine: "native", model: result.model }, result))
    throw new Error("QWZ recipe requires a verified completed topology result");
  if (JSON.stringify(JSON.parse(Buffer.from(resultBytes).toString("utf8"))) !== JSON.stringify(result))
    throw new Error("QWZ recipe result differs from exact source bytes");
  const resultSha256 = await digest(resultBytes);
  if (!/^[a-f0-9]{64}$/.test(resultSha256)) throw new Error("Invalid source result hash");
  const payload = recipe.view === "bands"
    ? await bandSceneFromResult(result, resultSha256, digest)
    : await sceneFromResult(result, null, resultSha256, digest);
  if (payload.scene.schema !== recipe.sceneSchema || payload.scene.provenance.resultSha256 !== resultSha256)
    throw new Error("QWZ scene recipe emitted an unexpected schema or source hash");
  return payload;
}
