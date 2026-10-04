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
  QVIS_WORKFLOW_STEPS,
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
  assert.deepEqual(QLAB_UI_STEPS.map(r=>[r.id,r.state]),Array.from({length:8},(_,i)=>[`QLAB-UI-${i+1}`,"Implemented"]));
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

test("linked-workspace roadmap names completed current-lab adapters and next UI gates",async()=>{
  const doc=await readFile("docs/QLAB_LINKED_WORKSPACE_ROADMAP.md","utf8");
  assert.match(doc,/Status \(\d{4}-\d{2}-\d{2}\): QLAB-UI-1–8 implemented for declared adapters/);
  assert.match(doc,/\| Done \| QLAB-UI-4 \|/);
  assert.match(doc,/\| Done \| QLAB-UI-5 \|/);
  for(const id of ["QLAB-UI-1","QLAB-UI-2","QLAB-UI-3"])
    assert.match(doc,new RegExp(`\\| Done \\| ${id} \\|`));
  assert.match(doc,/\| Done \| QLAB-UI-6 \|/);
  assert.match(doc,/\| Done \| QLAB-UI-7 \|/);
  assert.match(doc,/\| Done \| QLAB-UI-8 \|/);
  assert.match(doc,/selected.*full-run|full-run.*selection/s);
  for(const path of ["docs/ROADMAP.md","docs/POST_QLAB_QVIS_M3D_ROADMAP.md"]){
    const overview=await readFile(path,"utf8");
    assert.match(overview,/UI-4–5 are implemented for/);
    assert.match(overview,/UI-6 .*saved-run comparison|UI-6 covers\s+all current saved-result operations/);
    assert.match(overview,/UI-7 is implemented|UI-7 implements/);
    assert.match(overview,/UI-8 is implemented|UI-8 implements/);
  }
});

test("QVIS-014–017 complete declared bounded adapters without relabelling later work",async()=>{
  assert.deepEqual(QVIS_WORKFLOW_STEPS.map(entry=>[entry.id,entry.state]),
    Array.from({length:10},(_,index)=>[`QVIS-${String(index+14).padStart(3,"0")}`,index<=3?"Implemented":"Planned"]));
  assert.equal(DELIVERED_QVIS.length,13);
  const doc=await readFile("docs/ROADMAP.md","utf8");
  assert.match(doc,/QVIS-014–017 implemented for their declared bounded\s+desktop scope/);
  assert.match(doc,/fingerprint guard forbids silently extending it/);
  const audit=await readFile("docs/QVIS016_OBSERVABLE_AUDIT.md","utf8");
  assert.match(audit,/All base v1 results lack pair expectations/);
  const ising=await readFile("docs/QVIS017_ISING_STATE.md","utf8");
  assert.match(ising,/Corruption is an error/);
  assert.match(doc,/renderer-local\s+`scientific-selection\/v1` reference/);
  assert.match(doc,/independently opened web scenes/);
  assert.match(doc,/Half-chain entropy is already recorded/);
  assert.match(doc,/Neighboring-ground-state fidelity remains out of scope/);
  assert.match(doc,/quantum-spectrum-study\/v1/);
  assert.match(doc,/`Ω` at fixed `Δ` \(`v2`\)/);
  assert.match(doc,/The grid is one immutable saved run/);
});

test("UI-1–3 remaining-lab audit preserves explicit data and unavailable-state boundaries",async()=>{
  const audit=await readFile("docs/QLAB_UI_1_3_REMAINING_LABS_AUDIT.md","utf8");
  for(const lab of ["Transmon circuit","Ising chain","Evolution sweep","SSH/QWZ topology","Hydrogenic orbital","Oscillator family"])
    assert.ok(audit.includes(lab));
  assert.match(audit,/No eigenvectors or charge-basis amplitudes/);
  assert.match(audit,/No full ground-state vector/);
  assert.match(audit,/UI-1–3 are \*\*Implemented for the currently\s+reachable desktop labs\*\*/);
});
