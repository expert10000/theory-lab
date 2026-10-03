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
  assert.deepEqual(QLAB_UI_STEPS.map(r=>[r.id,r.state]),Array.from({length:8},(_,i)=>[`QLAB-UI-${i+1}`,i>=3&&i<=4?"Implemented":i<3?"Partial":"Planned"]));
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

test("linked-workspace roadmap names delivered, partial and next UI gates",async()=>{
  const doc=await readFile("docs/QLAB_LINKED_WORKSPACE_ROADMAP.md","utf8");
  assert.match(doc,/Status \(\d{4}-\d{2}-\d{2}\): QLAB-UI-4–5 implemented for declared adapters; UI-1–3 partial; UI-6–8 planned/);
  assert.match(doc,/\| Done \| QLAB-UI-4 \|/);
  assert.match(doc,/\| Done \| QLAB-UI-5 \|/);
  for(const id of ["QLAB-UI-1","QLAB-UI-2","QLAB-UI-3"])
    assert.match(doc,new RegExp(`\\| Partially done \\| ${id} \\|`));
  assert.match(doc,/\| Next \| Transmon and Ising adapters \|/);
  assert.match(doc,/\| Later \| QLAB-UI-6–8 \|/);
  for(const path of ["docs/ROADMAP.md","docs/POST_QLAB_QVIS_M3D_ROADMAP.md"]){
    const overview=await readFile(path,"utf8");
    assert.match(overview,/UI-4–5 are implemented for/);
    assert.match(overview,/UI-1–3 are partial and UI-6–8 are\s+planned/);
  }
});

test("UI-1–3 remaining-lab audit preserves explicit data and unavailable-state boundaries",async()=>{
  const audit=await readFile("docs/QLAB_UI_1_3_REMAINING_LABS_AUDIT.md","utf8");
  for(const lab of ["Transmon circuit","Ising chain","Evolution sweep","SSH/QWZ topology","Hydrogenic orbital","Oscillator family"])
    assert.ok(audit.includes(lab));
  assert.match(audit,/No eigenvectors or charge-basis amplitudes/);
  assert.match(audit,/No full ground-state vector/);
  assert.match(audit,/UI-1–3 remain \*\*Partial\*\*/);
});
