import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import frozen from "../packages/atlas/atlas-lab-reconciliation.v1.json";
import schema from "../packages/atlas/atlas-lab-reconciliation.v1.schema.json";
import {
  atlasLabFreezeManifest,
  PROTECTED_SCHEMA_PATHS,
} from "../packages/atlas/freeze-manifest";
import { assertAtlasLabFreeze } from "../packages/atlas/freeze-validation";
import legacy from "../packages/atlas/fixtures/legacy-48.v1.json";
import r5 from "../packages/atlas/fixtures/reconciliation-r5.v1.json";
import freeBaseline from "../packages/atlas/fixtures/bindings-d1-free.v1.json";
const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");

test("R5 freezes complete additive metadata without changing existing scientific protocols or bindings", () => {
  assertAtlasLabFreeze(frozen);
  assert.ok(new Ajv({ strict: true }).compile(schema)(frozen));
  const actual = atlasLabFreezeManifest(
    digest,
    PROTECTED_SCHEMA_PATHS.map((path) => ({
      path,
      sha256: digest(JSON.parse(readFileSync(path, "utf8"))),
    })),
  );
  assert.deepEqual(frozen, actual);
  assert.equal(frozen.entries.length, 68);
  assert.equal(frozen.entries.filter((e) => e.binding).length, 11);
  assert.equal(frozen.entries.filter((e) => e.binding?.webLoad).length, 4);
  assert.equal(frozen.entries.filter((e) => e.sourceExample).length, 7);
  assert.equal(frozen.catalogSha256,r5.catalogSha256,"all 68 source definitions and source-example references unchanged");
  assert.equal(freeBaseline.bindings.length,10);
  for(const previous of freeBaseline.bindings)assert.deepEqual(actual.entries.find(e=>e.atlasId===previous.atlasId),previous,`preserve all ten previously delivered bindings: ${previous.atlasId}`);
  for(const row of r5.entries){
    const current=actual.entries.find(e=>e.atlasId===row.atlasId)!;
    if(!["harmonic_oscillator","driven_harmonic_oscillator"].includes(row.atlasId))assert.deepEqual(current,row,`preserve R5 row ${row.atlasId}`);
    else {assert.equal(current.binding?.operation,row.atlasId==="harmonic_oscillator"?"oscillator":"oscillator_drive");assert.equal(current.executionReview,"accepted-binding");assert.deepEqual(current.relatedModelIds,row.relatedModelIds);}
  }
  for (const [id, binding] of Object.entries(legacy.bindings)) {
    const row = actual.entries.find((e) => e.atlasId === id)!.binding!;
    assert.deepEqual(row.parameters, binding.parameters);
    assert.equal(row.convention, binding.convention);
    assert.equal(row.modelId, binding.modelId);
  }
});

test("R5 rejects unknown versions, executable metadata and silent capability/coverage changes", () => {
  const mutations: ((v: any) => void)[] = [
    (v) => {
      v.catalogSha256 = "0".repeat(64);
    },
    (v) => {
      v.reviewSha256 = "0".repeat(64);
    },
    (v) => {
      v.protectedSchemas[0].sha256 = "0".repeat(64);
    },
    (v) => {
      v.schema = "atlas-lab-reconciliation/v2";
    },
    (v) => {
      v.script = "run a runner";
    },
    (v) => {
      v.policy.sourceExamplesAuthorizeExecution = true;
    },
    (v) => {
      v.policy.extension = "replace";
    },
    (v) => {
      v.policy.math3dConnected = true;
    },
    (v) => {
      v.entries.pop();
    },
    (v) => {
      v.entries[1] = v.entries[0];
    },
    (v) => {
      v.entries[0].physicsGap.priority = Infinity;
    },
    (v) => {
      v.entries[0].binding = v.entries.find((e: any) => e.binding && e.atlasId!==v.entries[0].atlasId).binding;
    },
    (v) => {
      v.entries.find((e: any) => e.binding).binding = null;
    },
    (v) => {
      v.entries.find((e: any) => e.binding).binding.webLoad = !v.entries.find(
        (e: any) => e.binding,
      ).binding.webLoad;
    },
    (v) => {
      v.entries.find((e: any) => e.binding).binding.operation = "topology";
    },
    (v) => {
      v.entries.find((e: any) => e.binding).binding.parameters.injected = 1;
    },
    (v) => {
      v.entries.find((e: any) => e.binding).binding.sceneViews = ["bands"];
    },
    (v) => {
      v.entries.find((e: any) => e.sourceExample).sourceExample.adapter =
        "../secret.py";
    },
    (v) => {
      v.entries.find((e: any) => e.sourceExample).sourceExample.kind = "direct";
      v.entries.find((e: any) => e.sourceExample).sourceExample.notes =
        "Permission to run";
    },
    (v) => {
      v.source.revision = "a".repeat(40);
    },
    (v) => {
      v.sceneReviewIds.pop();
    },
    (v) => {
      v.gapGroupIds[0] = "G99";
    },
    (v) => {
      v.protectedSchemas.pop();
    },
    (v) => {
      v.protectedSchemas[0] = v.protectedSchemas[1];
    },
    (v) => {
      v.existingFormats[0] = "unrelated/v1";
    },
  ];
  for (const mutate of mutations) {
    const v = structuredClone(frozen);
    mutate(v);
    assert.throws(() => assertAtlasLabFreeze(v));
  }
});
