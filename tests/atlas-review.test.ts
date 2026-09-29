import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { ATLAS_ENTRIES } from "../packages/atlas";
import { atlasBinding } from "../packages/atlas/bindings";
import {
  BINDING_REVIEWS,
  ADDITIONAL_MAPPING_REVIEWS,
  EXECUTABLE_REVIEWS,
} from "../packages/atlas/executable-review";
import { reconciliationReviewReport } from "../packages/atlas/review-report";
import { SCENE_COMPATIBILITY_REVIEWS } from "../packages/atlas/scene-review";
import {
  PHYSICS_GAP_GROUPS,
  PHYSICS_GAP_REVIEWS,
} from "../packages/atlas/physics-gaps";

test("R2 reviews every entry, preserves all binding permissions and records scientific evidence", () => {
  assert.equal(EXECUTABLE_REVIEWS.length, 68);
  assert.deepEqual(
    EXECUTABLE_REVIEWS.map((r) => r.atlasId),
    ATLAS_ENTRIES.map((e) => e.id),
  );
  assert.equal(Object.keys(BINDING_REVIEWS).length, 11);
  assert.equal(
    EXECUTABLE_REVIEWS.filter((r) => r.disposition === "adapter-candidate")
      .length,
    2,
  );
  for (const r of EXECUTABLE_REVIEWS) {
    assert.equal(r.enabled, Boolean(atlasBinding(r.atlasId)));
    assert.equal(Boolean(r.scientificMapping), r.enabled);
    assert.ok(r.nextRequirement);
    if (r.scientificMapping) {
      assert.ok(
        r.scientificMapping.conversion &&
          r.scientificMapping.basis &&
          r.scientificMapping.boundedScope,
      );
      assert.ok(
        r.scientificMapping.evidence.every((p) => existsSync(p)),
        r.atlasId,
      );
    }
  }
  for (const id of Object.keys(ADDITIONAL_MAPPING_REVIEWS))
    assert.ok(ATLAS_ENTRIES.some((e) => e.id === id));
  assert.equal(
    readFileSync("docs/ATLAS_RECONCILIATION_R2_R5.md", "utf8").replaceAll(
      "\r\n",
      "\n",
    ),
    reconciliationReviewReport(),
  );
});

test("R4 ranks every genuine gap exactly once without downgrading existing bindings", () => {
  assert.equal(PHYSICS_GAP_REVIEWS.length, 68);
  assert.equal(
    PHYSICS_GAP_REVIEWS.filter((r) => r.status === "covered-subspace").length,
    11,
  );
  assert.equal(
    PHYSICS_GAP_REVIEWS.filter((r) => r.status === "parameter-adapter").length,
    2,
  );
  assert.equal(
    PHYSICS_GAP_REVIEWS.filter((r) => r.status === "new-model").length,
    55,
  );
  const ids = PHYSICS_GAP_GROUPS.flatMap((g) => [...g.atlasIds]);
  assert.equal(ids.length, 57);
  assert.equal(new Set(ids).size, 57);
  assert.ok(PHYSICS_GAP_GROUPS.find(g=>g.id==="G02")?.deliveredSubspaces?.some(s=>s.includes("driven_harmonic_oscillator")));
  assert.match(PHYSICS_GAP_GROUPS.find(g=>g.id==="G02")!.missing,/general driven envelopes\/pulses/);
  assert.ok(PHYSICS_GAP_GROUPS.find(g=>g.id==="G02")?.deliveredSubspaces?.some(s=>s.includes("harmonic_oscillator")));
  const groups = new Map(PHYSICS_GAP_GROUPS.map((g) => [g.id, g]));
  assert.equal(groups.size, 12);
  for (const g of PHYSICS_GAP_GROUPS) {
    assert.ok(g.acceptance.length && g.reuse && g.missing);
    for (const id of g.atlasIds)
      assert.ok(ATLAS_ENTRIES.some((e) => e.id === id));
    for (const d of g.dependencies) assert.ok(groups.has(d) && d !== g.id);
    const visit = (id: string, seen: string[]) => {
      assert.ok(!seen.includes(id), "Cyclic scientific dependency");
      for (const next of groups.get(id)!.dependencies)
        visit(next, [...seen, id]);
    };
    visit(g.id, []);
  }
  for (const r of PHYSICS_GAP_REVIEWS)
    assert.equal(
      r.status === "covered-subspace",
      Boolean(atlasBinding(r.atlasId)),
    );
});

test("R3 preserves every C2–C8 idea and records compatible vocabulary plus unresolved additive gaps", () => {
  assert.deepEqual(
    SCENE_COMPATIBILITY_REVIEWS.map((r) => r.id),
    ["C2", "C3", "C4", "C5", "C6", "C7", "C8"],
  );
  for (const r of SCENE_COMPATIBILITY_REVIEWS) {
    assert.ok(r.compatibleScope && r.requiredConversion && r.remainingGap);
    assert.ok(r.vocabulary.length);
    assert.ok(
      [...r.existingModules, ...r.evidence].every((p) => existsSync(p)),
      r.id,
    );
  }
});
