import Ajv from "ajv";
import { createHash } from "node:crypto";
import schema from "./atlas-lab-reconciliation.v1.schema.json";
import {
  ATLAS_ENTRIES,
  ATLAS_PRESETS,
  ATLAS_REVISION,
  ATLAS_SOURCE_BINDINGS,
} from "./index";
import jobSchema from "../contracts/schemas/quantum-job.v1.json";
import resultSchema from "../contracts/schemas/quantum-result.v1.json";
import capabilitiesSchema from "../contracts/schemas/worker-capabilities.v1.json";
import resourcesSchema from "../contracts/schemas/worker-resources.v1.json";
import sceneSchema from "../quantum-scene/quantum-scene.v1.json";
import { atlasBinding } from "./bindings";
import { ATLAS_RECONCILIATION, LAB_IMPLEMENTATIONS } from "./reconciliation";
import { EXECUTABLE_REVIEWS } from "./executable-review";
import { PHYSICS_GAP_REVIEWS, PHYSICS_GAP_GROUPS } from "./physics-gaps";
import { SCENE_COMPATIBILITY_REVIEWS } from "./scene-review";
import {
  PROTECTED_SCHEMA_PATHS,
  type AtlasLabFreezeManifest,
} from "./freeze-manifest";
const validate = new Ajv({ strict: true }).compile(schema);
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const protocolSchemas = [
  jobSchema,
  resultSchema,
  capabilitiesSchema,
  resourcesSchema,
  sceneSchema,
];

/** Maintainer/host-side validator; not shipped in the strict-CSP renderer. */
export function assertAtlasLabFreeze(
  value: unknown,
): asserts value is AtlasLabFreezeManifest {
  if (!validate(value))
    throw new Error(
      `Invalid atlas-lab-reconciliation/v1: ${JSON.stringify(validate.errors)}`,
    );
  const manifest = value as AtlasLabFreezeManifest;
  if (
    manifest.catalogSha256 !==
      digest({
        entries: ATLAS_ENTRIES,
        presets: ATLAS_PRESETS,
        sourceBindings: ATLAS_SOURCE_BINDINGS,
      }) ||
    manifest.reviewSha256 !==
      digest({
        EXECUTABLE_REVIEWS,
        SCENE_COMPATIBILITY_REVIEWS,
        PHYSICS_GAP_REVIEWS,
        PHYSICS_GAP_GROUPS,
        LAB_IMPLEMENTATIONS,
      })
  )
    throw new Error("Catalog/review digest mismatch");
  if (manifest.source.revision !== ATLAS_REVISION)
    throw new Error("Unpinned reconciliation source");
  const unique = (ids: string[]) => {
    if (new Set(ids).size !== ids.length)
      throw new Error("Duplicate reconciliation identity");
  };
  unique(manifest.entries.map((e) => e.atlasId));
  unique(manifest.protectedSchemas.map((s) => s.path));
  for (const format of [
    "quantum-job/v1",
    "quantum-result/v1",
    "worker-capabilities/v1",
    "worker-resources/v1",
    "quantum-scene/v1",
    "quantum-scene-bundle/v1",
    "quantum-scene-stream/v1",
    "quantum-scene-stream-bundle/v1",
  ])
    if (!manifest.existingFormats.includes(format))
      throw new Error("Existing format removed");
  if (
    JSON.stringify(manifest.sceneReviewIds) !==
      JSON.stringify(SCENE_COMPATIBILITY_REVIEWS.map((r) => r.id)) ||
    JSON.stringify(manifest.gapGroupIds) !==
      JSON.stringify(PHYSICS_GAP_GROUPS.map((g) => g.id))
  )
    throw new Error("Review scope changed");
  for (const path of PROTECTED_SCHEMA_PATHS)
    if (!manifest.protectedSchemas.some((s) => s.path === path))
      throw new Error("Missing protected schema");
  if (manifest.protectedSchemas.length !== PROTECTED_SCHEMA_PATHS.length)
    throw new Error("Protected schema scope changed");
  for (const [i, path] of PROTECTED_SCHEMA_PATHS.entries())
    if (
      manifest.protectedSchemas.find((s) => s.path === path)!.sha256 !==
      digest(protocolSchemas[i])
    )
      throw new Error("Protocol digest mismatch");
  const ids = new Set(ATLAS_ENTRIES.map((e) => e.id));
  if (
    manifest.entries.length !== ids.size ||
    manifest.entries.some((e) => !ids.has(e.atlasId))
  )
    throw new Error("Incomplete Atlas coverage");
  for (const entry of manifest.entries) {
    const row = ATLAS_RECONCILIATION.find((r) => r.atlasId === entry.atlasId)!;
    const review = EXECUTABLE_REVIEWS.find((r) => r.atlasId === entry.atlasId)!;
    const gap = PHYSICS_GAP_REVIEWS.find((r) => r.atlasId === entry.atlasId)!;
    if (
      entry.executionReview !== review.disposition ||
      JSON.stringify(entry.physicsGap) !==
        JSON.stringify({
          status: gap.status,
          groupId: gap.groupId,
          priority: gap.priority,
        })
    )
      throw new Error("Reviewed disposition changed");
    if (
      JSON.stringify(entry.relatedModelIds) !==
      JSON.stringify(row.relatedLabs.map((l) => l.modelId))
    )
      throw new Error("Related scope changed");
    const binding = atlasBinding(entry.atlasId);
    if (Boolean(binding) !== Boolean(entry.binding))
      throw new Error("Freeze cannot authorize/remove a binding");
    if (
      JSON.stringify(entry.sourceExample) !==
      JSON.stringify(ATLAS_SOURCE_BINDINGS[entry.atlasId] ?? null)
    )
      throw new Error("Source evidence changed");
    if (
      entry.relatedModelIds.some(
        (id) => !Object.hasOwn(LAB_IMPLEMENTATIONS, id),
      )
    )
      throw new Error("Unknown related model");
    if (binding) {
      const frozen = entry.binding!;
      if (
        frozen.modelId !== binding.modelId ||
        JSON.stringify(frozen.parameters) !==
          JSON.stringify(binding.parameters) ||
        frozen.convention !== binding.convention
      )
        throw new Error("Preserved binding conversion changed");
      const implementation = row.lab!.implementation,
        operation = row.lab!.operation;
      if (
        frozen.operation !== operation ||
        frozen.webLoad !== implementation.webControl ||
        frozen.gatewayOperation !==
          (implementation.gatewayOperations.includes(operation)
            ? operation
            : null) ||
        JSON.stringify(frozen.sceneViews) !==
          JSON.stringify(implementation.sceneViews)
      )
        throw new Error("Host/scene capability changed");
      if (
        !["preserved-binding","accepted-binding"].includes(entry.executionReview) ||
        entry.physicsGap.status !== "covered-subspace" ||
        entry.physicsGap.groupId !== null ||
        entry.physicsGap.priority !== 0
      )
        throw new Error("Bound subspace misclassified");
    } else {
      if (
        ["preserved-binding","accepted-binding"].includes(entry.executionReview) ||
        entry.physicsGap.status === "covered-subspace" ||
        entry.physicsGap.priority === 0 ||
        !entry.physicsGap.groupId ||
        !manifest.gapGroupIds.includes(entry.physicsGap.groupId)
      )
        throw new Error("Unbound model misclassified");
    }
  }
}
