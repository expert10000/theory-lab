import {
  ATLAS_ENTRIES,
  ATLAS_PRESETS,
  ATLAS_REVISION,
  ATLAS_SOURCE,
  ATLAS_SOURCE_BINDINGS,
} from "./index";
import { ATLAS_RECONCILIATION, LAB_IMPLEMENTATIONS } from "./reconciliation";
import { atlasBinding } from "./bindings";
import { EXECUTABLE_REVIEWS } from "./executable-review";
import { SCENE_COMPATIBILITY_REVIEWS } from "./scene-review";
import { PHYSICS_GAP_REVIEWS, PHYSICS_GAP_GROUPS } from "./physics-gaps";

export const PROTECTED_SCHEMA_PATHS = [
  "packages/contracts/schemas/quantum-job.v1.json",
  "packages/contracts/schemas/quantum-result.v1.json",
  "packages/contracts/schemas/worker-capabilities.v1.json",
  "packages/contracts/schemas/worker-resources.v1.json",
  "packages/quantum-scene/quantum-scene.v1.json",
] as const;

/** Additive metadata contract, never a worker request or dynamic execution registry. */
export function atlasLabFreezeManifest(
  digest: (value: unknown) => string,
  protectedSchemas: { path: string; sha256: string }[],
) {
  return {
    schema: "atlas-lab-reconciliation/v1" as const,
    source: { repository: ATLAS_SOURCE, revision: ATLAS_REVISION },
    policy: {
      extension: "additive-reviewed" as const,
      executionAuthority: "existing-tested-atlasBinding" as const,
      sourceExamplesAuthorizeExecution: false as const,
      sceneFlow:
        "QuantumResult -> QuantumScene -> independent consumers" as const,
      math3dConnected: false as const,
    },
    existingFormats: [
      "quantum-job/v1",
      "quantum-result/v1",
      "worker-capabilities/v1",
      "worker-resources/v1",
      "quantum-scene/v1",
      "quantum-scene-bundle/v1",
      "quantum-scene-stream/v1",
      "quantum-scene-stream-bundle/v1",
    ],
    protectedSchemas,
    catalogSha256: digest({
      entries: ATLAS_ENTRIES,
      presets: ATLAS_PRESETS,
      sourceBindings: ATLAS_SOURCE_BINDINGS,
    }),
    reviewSha256: digest({
      EXECUTABLE_REVIEWS,
      SCENE_COMPATIBILITY_REVIEWS,
      PHYSICS_GAP_REVIEWS,
      PHYSICS_GAP_GROUPS,
      LAB_IMPLEMENTATIONS,
    }),
    sceneReviewIds: SCENE_COMPATIBILITY_REVIEWS.map((r) => r.id),
    gapGroupIds: PHYSICS_GAP_GROUPS.map((g) => g.id),
    entries: ATLAS_RECONCILIATION.map((row) => {
      const binding = atlasBinding(row.atlasId),
        implementation = row.lab?.implementation;
      const execution = EXECUTABLE_REVIEWS.find(
        (r) => r.atlasId === row.atlasId,
      )!;
      const gap = PHYSICS_GAP_REVIEWS.find((r) => r.atlasId === row.atlasId)!;
      return {
        atlasId: row.atlasId,
        reference: true as const,
        sourceExample: row.sourceExample,
        relatedModelIds: row.relatedLabs.map((r) => r.modelId),
        binding:
          binding && implementation
            ? {
                modelId: binding.modelId,
                operation: row.lab!.operation,
                parameters: binding.parameters,
                convention: binding.convention,
                desktopLoad: true as const,
                webLoad: implementation.webControl,
                gatewayOperation: implementation.gatewayOperations.includes(
                  row.lab!.operation,
                )
                  ? row.lab!.operation
                  : null,
                sceneViews: [...implementation.sceneViews],
              }
            : null,
        executionReview: execution.disposition,
        physicsGap: {
          status: gap.status,
          groupId: gap.groupId,
          priority: gap.priority,
        },
      };
    }),
  };
}
export type AtlasLabFreezeManifest = ReturnType<typeof atlasLabFreezeManifest>;
