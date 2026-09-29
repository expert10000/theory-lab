import { ATLAS_REVISION } from "./index";
import { EXECUTABLE_REVIEWS } from "./executable-review";
import { SCENE_COMPATIBILITY_REVIEWS } from "./scene-review";
import { PHYSICS_GAP_GROUPS, PHYSICS_GAP_REVIEWS } from "./physics-gaps";

export function reconciliationReviewReport(): string {
  return [
    "# R2–R5 — Additive Atlas reconciliation",
    "",
    `Canonical source: \`${ATLAS_REVISION}\`. R1's complete inventory is retained in [ATLAS_RECONCILIATION_R1.md](ATLAS_RECONCILIATION_R1.md).`,
    "",
    "No existing lab, source definition, binding, engine, host control or scene vocabulary is removed. These milestones complete the review and freeze; they do not claim implementation of unbound physics. Source programs are evidence, not execution permission.",
    "",
    "## R2 — Executable mapping review (implemented)",
    "",
    "All 68 entries have an explicit disposition. The nine existing bindings remain enabled through the unchanged atlasBinding switch. Two restricted adapter candidates remain disabled pending unit/parameter acceptance. Every new model must extend existing contracts and worker supervision, not create a parallel executor.",
    "",
    "| Atlas ID | Disposition | Enabled existing binding | Next requirement |",
    "| --- | --- | --- | --- |",
    ...EXECUTABLE_REVIEWS.map(r => `| \`${r.atlasId}\` | ${r.disposition} | ${r.enabled ? "yes" : "no"} | ${r.nextRequirement} |`),
    "",
    "### Preserved scientific conversions",
    "",
    ...EXECUTABLE_REVIEWS.filter(r => r.scientificMapping).flatMap(r => [
      `#### ${r.atlasId}`, "", r.scientificMapping!.conversion, "", r.scientificMapping!.basis, "",
      r.scientificMapping!.boundedScope, "", `Evidence: ${r.scientificMapping!.evidence.map(p => `\`${p}\``).join(", ")}.`, "",
    ]),
    "Source review: pinned examples/python/qutip/adapters/dispersive_jc.py and tavis_cummings.py. Their rotating-frame/tensor conventions above are not silently substituted for Lab's existing closed cavity convention.",
    "",
    "## R3 — C2–C8 to existing quantum-scene/v1 (implemented)",
    "",
    "Seven ideas reviewed against the real QVIS vocabulary. Compatible scope does not imply a new model solver or automatic import of the B/C request envelopes. The additive grid-order utility converts only supplied bounded regular data; it does not resample, infer wavefunctions, normalize or modify existing adapters.",
    "",
    ...SCENE_COMPATIBILITY_REVIEWS.flatMap(r => [
      `### ${r.id} — ${r.title}`, "",
      `Pinned source: [${r.sourceDocument}](https://github.com/expert10000/theory/blob/${ATLAS_REVISION}/docs/theory-lab/${r.sourceDocument}).`, "",
      `Existing vocabulary: ${r.vocabulary.join(", ")}. Modules: ${r.existingModules.map(p => `\`${p}\``).join(", ")}.`, "",
      `Compatible scope: ${r.compatibleScope}`, "", `Conversion: ${r.requiredConversion}`, "",
      `Additive gap: ${r.remainingGap}`, "", `Evidence: ${r.evidence.map(p => `\`${p}\``).join(", ")}.`, "",
    ]),
    "Keep QuantumResult → QuantumScene → independent consumers. Reuse current TS/Python validators, hashes, 16 MiB regular-scene budget, four fields and 3..49 grid axes; larger/chunked data retains the separate existing stream contract. No direct Lab-to-Math3D worker calls.",
    "",
    "## R4 — Genuine physics/model gaps (implemented review)",
    "",
    "Every Atlas ID is classified exactly once: nine covered subspaces, two parameter-adapter candidates and 57 entries requiring new model scope. Covered subspace never means the full Atlas Hamiltonian family is implemented. Priority 1 is adapter review; 2 is bounded first extensions; 3 is more involved physics; 4 is substantial many-body/QEC scope. This is an additive backlog, not authorization to execute or build every entry.",
    "",
    "| Atlas ID | Gap status | Group | Priority |",
    "| --- | --- | --- | --- |",
    ...PHYSICS_GAP_REVIEWS.map(r => `| \`${r.atlasId}\` | ${r.status} | ${r.groupId ?? "—"} | ${r.priority || "preserve"} |`),
    "",
    ...PHYSICS_GAP_GROUPS.flatMap(g => [
      `### ${g.id} — ${g.title} (priority ${g.priority})`, "",
      `Entries: ${g.atlasIds.map(id => `\`${id}\``).join(", ")}. Dependencies: ${g.dependencies.join(", ") || "none"}.`, "",
      `Reuse: ${g.reuse}`, "", `Missing: ${g.missing}`, "", "Acceptance requirements:", "",
      ...g.acceptance.map(a => `- ${a}`), "",
    ]),
    "Recommended next physics milestone after reconciliation: an additive standalone 1D harmonic-oscillator lab within G02, with analytic ladder and cutoff acceptance. G01 adapter candidates can be handled independently. Rice–Mele and XY/Heisenberg are further bounded candidates. No D1 solver is implemented by this review; all current labs remain available.",
    "",
    "R5 remains planned until its freeze artifact and acceptance gates land.",
    "",
  ].join("\n");
}
