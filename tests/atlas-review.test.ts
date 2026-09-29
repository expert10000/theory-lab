import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { ATLAS_ENTRIES } from "../packages/atlas";
import { atlasBinding } from "../packages/atlas/bindings";
import { BINDING_REVIEWS, ADDITIONAL_MAPPING_REVIEWS, EXECUTABLE_REVIEWS } from "../packages/atlas/executable-review";
import { reconciliationReviewReport } from "../packages/atlas/review-report";
import { SCENE_COMPATIBILITY_REVIEWS } from "../packages/atlas/scene-review";

test("R2 reviews every entry, preserves all binding permissions and records scientific evidence", () => {
  assert.equal(EXECUTABLE_REVIEWS.length, 68);
  assert.deepEqual(EXECUTABLE_REVIEWS.map(r => r.atlasId), ATLAS_ENTRIES.map(e => e.id));
  assert.equal(Object.keys(BINDING_REVIEWS).length, 9);
  assert.equal(EXECUTABLE_REVIEWS.filter(r => r.disposition === "adapter-candidate").length, 2);
  for (const r of EXECUTABLE_REVIEWS) {
    assert.equal(r.enabled, Boolean(atlasBinding(r.atlasId)));
    assert.equal(Boolean(r.scientificMapping), r.enabled);
    assert.ok(r.nextRequirement);
    if (r.scientificMapping) {
      assert.ok(r.scientificMapping.conversion && r.scientificMapping.basis && r.scientificMapping.boundedScope);
      assert.ok(r.scientificMapping.evidence.every(p => existsSync(p)), r.atlasId);
    }
  }
  for (const id of Object.keys(ADDITIONAL_MAPPING_REVIEWS)) assert.ok(ATLAS_ENTRIES.some(e => e.id === id));
  assert.equal(readFileSync("docs/ATLAS_RECONCILIATION_R2_R5.md", "utf8").replaceAll("\r\n", "\n"), reconciliationReviewReport());
});

test("R3 preserves every C2–C8 idea and records compatible vocabulary plus unresolved additive gaps", () => {
  assert.deepEqual(SCENE_COMPATIBILITY_REVIEWS.map(r => r.id), ["C2", "C3", "C4", "C5", "C6", "C7", "C8"]);
  for (const r of SCENE_COMPATIBILITY_REVIEWS) {
    assert.ok(r.compatibleScope && r.requiredConversion && r.remainingGap);
    assert.ok(r.vocabulary.length);
    assert.ok([...r.existingModules, ...r.evidence].every(p => existsSync(p)), r.id);
  }
});
