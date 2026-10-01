import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DELIVERED_QVIS,
  POST_QVIS,
  SOURCE_PLAN_COVERAGE,
  ATLAS_RECONCILIATION_STEPS,
  D1_OSCILLATOR_STEPS,
  QLAB_UI_STEPS,
} from "../packages/models/roadmap";

test("roadmap preserves delivered IDs and labels future work as planned", () => {
  assert.deepEqual(
    DELIVERED_QVIS.map((r) => r.id),
    Array.from(
      { length: 13 },
      (_, i) => `QVIS-${String(i + 1).padStart(3, "0")}`,
    ),
  );
  assert.ok(DELIVERED_QVIS.every((r) => r.state === "Implemented"));
  assert.deepEqual(D1_OSCILLATOR_STEPS.map(r=>[r.id,r.state]),Array.from({length:22},(_,i)=>[`D1-${String(i+1).padStart(3,"0")}`,"Implemented"]));
  assert.deepEqual(QLAB_UI_STEPS.map(r=>[r.id,r.state]),Array.from({length:8},(_,i)=>[`QLAB-UI-${i+1}`,i<4?"Partial":"Planned"]));
  assert.match(DELIVERED_QVIS[5].title, /bundle import/);
  assert.match(DELIVERED_QVIS[6].title, /convergence/);
  assert.deepEqual(
    POST_QVIS.slice(0, 3).map((r) => r.id),
    [],
  );
  assert.ok(POST_QVIS.every((r) => r.state === "Planned"));
  assert.deepEqual(
    ATLAS_RECONCILIATION_STEPS.map((r) => [r.id, r.state]),
    [
      ["R1", "Implemented"],
      ["R2", "Implemented"],
      ["R3", "Implemented"],
      ["R4", "Implemented"],
      ["R5", "Implemented"],
    ],
  );
  assert.equal(
    new Set([...DELIVERED_QVIS, ...POST_QVIS].map((r) => r.id)).size,
    13,
  );
  assert.equal(
    SOURCE_PLAN_COVERAGE.find((r) => r.id === "QVIS-005")!.state,
    "Partial",
  );
  assert.equal(
    SOURCE_PLAN_COVERAGE.find((r) => r.id === "QVIS-006")!.state,
    "Partial",
  );
  assert.equal(
    SOURCE_PLAN_COVERAGE.find((r) => r.id === "QVIS-007")!.state,
    "Implemented (bounded)",
  );
  assert.equal(
    SOURCE_PLAN_COVERAGE.find((r) => r.id === "M3D-Q01–Q10")!.state,
    "External / not assessed",
  );
});

test("tracked post-QLAB document keeps the source plan and a separate status overlay", async () => {
  const doc = await readFile("docs/POST_QLAB_QVIS_M3D_ROADMAP.md", "utf8");
  assert.match(doc, /# Supplied planning reference \(preserved\)/);
  assert.match(doc, /# 9\. Numbering Freeze/);
  assert.match(
    doc,
    /Acceptance checkmarks in the supplied plan are targets, not test results/,
  );
  for (const row of [...DELIVERED_QVIS, ...POST_QVIS])
    assert.ok(doc.includes(row.id));
  assert.match(doc, /commit e4afd9a/);
  assert.match(
    doc,
    /Lab continuation milestones \(status updated per delivery\)/,
  );
});
