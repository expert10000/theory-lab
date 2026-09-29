import { ATLAS_REVISION, ATLAS_SOURCE } from "./index";
import { ATLAS_RECONCILIATION, LAB_IMPLEMENTATIONS } from "./reconciliation";

/** Deterministic review document, not a new persisted worker/scene contract. */
export function atlasReconciliationReport(): string {
  const rows = ATLAS_RECONCILIATION,
    bound = rows.filter((r) => r.lab),
    source = rows.filter((r) => r.sourceExample);
  const list = (items: readonly string[]) => items.join(", ") || "—";
  const lines = [
    "# R1 — Canonical Atlas ↔ existing Theory Lab",
    "",
    `Pinned theory revision: \`${ATLAS_REVISION}\` (${ATLAS_SOURCE}).`,
    "",
    `${rows.length} reference definitions; ${source.length} declared theory-example bindings; ${bound.length} tested Lab bindings; ${bound.filter((r) => r.lab!.implementation.webControl).length} web compute bindings; ${bound.filter((r) => r.lab!.implementation.sceneViews.length).length} bound models with saved scene adapters.`,
    "",
    "R1 is implemented: the catalog, capability map and UI explanations are reconciled. No new physics executor, job/result protocol, scene format or Math3D integration is introduced. The canonical Atlas remains the metadata source; Lab owns its explicit tested parameter adapters. This map is an implementation inventory, not an execution authorization registry or the R5 contract freeze.",
    "",
    "## Reading the map",
    "",
    "Reference means browseable. Theory example means declared adapter/program paths exist at the pinned source revision, not that they were run or accepted here. A reference_lab binding is a related QEC program, not a one-to-one Hamiltonian executor. Lab-bound means one of the nine existing tested subspace mappings. Related-only means an existing physical family is relevant but no parameter binding is enabled. Engines are implemented integrations, not a claim that optional packages/devices are installed. Runtime worker capabilities still gate execution.",
    "",
    "## Complete 68-entry inventory",
    "",
    "| Atlas ID | Status | Theory example kind | Bound Lab model / operation | Related existing Lab (not bound) |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| \`${r.atlasId}\` | ${r.status} | ${r.sourceExample?.kind ?? "—"} | ${r.lab ? `\`${r.lab.modelId}\` / ${r.lab.operation}` : "—"} | ${list(r.relatedLabs.map((l) => l.modelId))} |`,
    ),
    "",
    "## Tested binding coverage",
    "",
    "All nine bindings and the original 48 formula/basis/parameter definitions are preserved by checked-in legacy regression fixtures. The bound operation is the tested Atlas path; other Lab operations listed below do not automatically become additional Atlas bindings.",
    "",
    "| Atlas ID | Desktop load | Web compute load | Bound gateway operation | Saved scene views | Convention |",
    "| --- | --- | --- | --- | --- | --- |",
    ...bound.map((r) => {
      const l = r.lab!,
        i = l.implementation;
      return `| \`${r.atlasId}\` | yes | ${i.webControl ? "yes" : "no"} | ${i.gatewayOperations.includes(l.operation) ? l.operation : "not accepted"} | ${list(i.sceneViews)} | ${l.convention.replaceAll("|", "\\|")} |`;
    }),
    "",
    "Saved scenes can be viewed/imported in desktop and web even when the web has no compute form. No scene adapter is claimed for cavity, Lindblad, transmon, sweeps or static-spectrum results. Generic geometry/field primitives are not evidence that a Hamiltonian has a numerical adapter.",
    "",
    "## Existing typed implementation inventory",
    "",
    "The central MODEL_REGISTRY covers five two-level models. Other families use their existing typed modules; R1 does not replace them. Every inventory model has a contract-valid job constructed from its real helper in tests.",
    "",
    "| Lab model | Existing module | Operations | Engines (runtime availability required) | Web compute form | Gateway operations | Scene operation / views |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...Object.entries(LAB_IMPLEMENTATIONS).map(
      ([id, i]) =>
        `| \`${id}\` | ${i.module} | ${list(i.operations)} | ${list(i.engines)} | ${i.webControl ? "yes" : "no"} | ${list(i.gatewayOperations)} | ${i.sceneOperation ? `${i.sceneOperation} / ${list(i.sceneViews)}` : "—"} |`,
    ),
    "",
    ...Object.entries(LAB_IMPLEMENTATIONS).map(
      ([id, i]) => `- **${id}**: ${i.scope}`,
    ),
    "",
    "## Source-side programs, not Lab permissions",
    "",
    "| Atlas ID | Kind | Adapter path | Example path |",
    "| --- | --- | --- | --- |",
    ...source.map(
      (r) =>
        `| \`${r.atlasId}\` | ${r.sourceExample!.kind} | ${r.sourceExample!.adapter} | ${r.sourceExample!.example} |`,
    ),
    "",
    "All paths are checked in Git at the pinned revision during snapshot generation. Catalog flags such as theory_lab=true mean source-side catalog exposure, not an installed Lab solver. No runner path crosses preload/gateway, no dynamic script execution is added, and source flags never enable Load/Run actions.",
    "",
    "## Related physics is not a missing architecture",
    "",
    ...rows.flatMap((r) =>
      r.relatedLabs.map(
        (l) => `- **${r.atlasId} → ${l.modelId}**: ${l.limitation}`,
      ),
    ),
    "",
    "## Genuine gaps and the next reconciliation steps",
    "",
    "R2 — review additional executable mappings against existing quantum-job/v1 and quantum-result/v1. Hydrogenic Coulomb mapping is an adapter gap; source-side dispersive JC/Tavis–Cummings/QEC programs need separate bounded numerical integration and tests. Do not execute their paths from catalog flags.",
    "",
    "R3 — map C2–C8 ideas into quantum-scene/v1. Bloch, bounded fields, lattices, SSH/QWZ bands and supplied topology already exist. C's nested atomic [z][y][x] arrays require explicit conversion to xyz-z-fastest; nonuniform grids, arbitrary crystals, species and periodic bonds exceed current bounded vocabulary. Density alone is not a supplied complex wavefunction. Preserve units, provenance and compatibility tests.",
    "",
    "R4 — rank genuinely missing physics after R2/R3. A standalone harmonic-oscillator lab, collective light–matter models, broader Hall/Hubbard/superconducting models and QEC execution are not currently implemented as Atlas-bound Lab solvers. An existing component or related reference is not sufficient evidence of coverage. This list is not authorization to implement them all.",
    "",
    "R5 — freeze the reconciled Atlas ↔ Lab contract only after mappings and gap review. R1 does not freeze the B scaffold's alternative job/result or C bridge shapes. Keep QuantumResult → QuantumScene → independent consumers; Math3D remains a separate track.",
    "",
    "## Reproduce and verify",
    "",
    "```powershell",
    "node scripts/sync-atlas.mjs ../THEORY --check",
    "npx tsx scripts/report-atlas.ts --check",
    "npm run typecheck",
    "npm test",
    "npm run test:web",
    "npm run test:desktop",
    "```",
    "",
    "The source checkout needs the pinned Git object, not a switched working tree. The app never fetches live Atlas content. Generation checks the complete canonical consumer catalog, source bindings and paths; normal tests/UI use only vendored data. No Math3D files or theory working-tree files are modified.",
    "",
  ];
  return lines.join("\n");
}
