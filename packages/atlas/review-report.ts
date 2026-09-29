import { ATLAS_REVISION } from "./index";
import { EXECUTABLE_REVIEWS } from "./executable-review";

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
    "R3–R5 remain planned until their review artifacts and acceptance gates land.",
    "",
  ].join("\n");
}
