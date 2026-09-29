// Rebuild the vendored, read-only Atlas snapshot from a checked-out theory repository.
// This is an explicit maintainer action; the desktop app never fetches live content.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const revision = "48e2036ba7c7dd5c79d54749341a79d41770cbb7";
const source = resolve(
  process.argv.slice(2).find((arg) => arg !== "--check") ?? "../THEORY",
);
const files = [
  "a1_fixtures",
  "driven_light_matter",
  "foundational",
  "lattice_topological",
  "spin_atomic_fields",
  "hall_many_body_superconducting",
  "qec_effective",
];
function read(path) {
  return JSON.parse(
    execFileSync(
      "git",
      ["-C", source, "show", `${revision}:data/hamiltonian_atlas/${path}`],
      { encoding: "utf8" },
    ),
  );
}
const actual = execFileSync("git", ["-C", source, "rev-parse", revision], {
  encoding: "utf8",
}).trim();
if (actual !== revision)
  throw new Error("Theory revision does not match pinned Atlas source");
const entries = files.flatMap((name) =>
  read(`registry/${name}.yaml`).entries.map((entry) => ({
    ...entry,
    sourceFile: `registry/${name}.yaml`,
  })),
);
const presets = read("presets/canonical_parameters.yaml").presets;
const ids = new Set(entries.map((entry) => entry.id));
if (entries.length !== 68 || ids.size !== 68)
  throw new Error("Unexpected Atlas entry count or duplicate ID");
for (const entry of entries) {
  if (
    entry.schema_version !== "1.0" ||
    !entry.formula?.latex ||
    !entry.basis?.description ||
    !entry.presentation?.summary ||
    !Array.isArray(entry.parameters)
  )
    throw new Error(`Incomplete Atlas entry ${entry.id}`);
  if (
    entry.computation?.adapter !== null ||
    entry.computation?.runnable !== null
  )
    throw new Error(`Source unexpectedly marks ${entry.id} runnable`);
  if (
    entry.computation.default_preset &&
    presets[entry.computation.default_preset]?.model !== entry.id
  )
    throw new Error(`Invalid preset for ${entry.id}`);
  for (const relation of entry.relations)
    if (!ids.has(relation.target))
      throw new Error(`Broken relation ${entry.id} → ${relation.target}`);
}
// Source example paths are evidence of source-side programs, NEVER Lab execution permissions.
const sourceBindings = read("integration/computational_bindings.yaml").bindings;
for (const [id, binding] of Object.entries(sourceBindings)) {
  if (
    !ids.has(id) ||
    !["direct", "family", "reference_lab"].includes(binding.kind) ||
    Object.keys(binding).some(
      (key) => !["kind", "adapter", "example", "notes"].includes(key),
    ) ||
    typeof binding.notes !== "string"
  )
    throw new Error(`Invalid source binding ${id}`);
  for (const key of ["adapter", "example"]) {
    const path = binding[key];
    if (
      typeof path !== "string" ||
      !/^examples\/python\/qutip\/[A-Za-z0-9_/-]+\.py$/.test(path) ||
      path.split("/").includes("..") ||
      execFileSync(
        "git",
        ["-C", source, "cat-file", "-t", `${revision}:${path}`],
        { encoding: "utf8" },
      ).trim() !== "blob"
    )
      throw new Error(`Missing or unsafe source ${key} path for ${id}`);
  }
}
const catalog = JSON.parse(
  execFileSync(
    "git",
    [
      "-C",
      source,
      "show",
      `${revision}:generated/hamiltonian_atlas/theory_lab_catalog.json`,
    ],
    { encoding: "utf8" },
  ),
);
if (
  catalog.models.length !== entries.length ||
  new Set(catalog.models.map((m) => m.id)).size !== ids.size ||
  catalog.models.some((m) => !ids.has(m.id))
)
  throw new Error("Canonical consumer catalog does not cover the registry");
for (const entry of entries) {
  const model = catalog.models.find((m) => m.id === entry.id),
    binding = sourceBindings[entry.id];
  if (
    JSON.stringify(model.parameters) !== JSON.stringify(entry.parameters) ||
    model.formula_latex !== entry.formula.latex ||
    JSON.stringify(model.basis) !== JSON.stringify(entry.basis) ||
    JSON.stringify(model.computational_binding) !==
      JSON.stringify(binding ?? null) ||
    model.capabilities.browse !== true ||
    model.capabilities.theory_lab !== true ||
    model.capabilities.qutip_adapter !== Boolean(binding?.adapter) ||
    model.capabilities.runnable_example !== Boolean(binding?.example)
  )
    throw new Error(`Consumer catalog/registry disagreement for ${entry.id}`);
}
const snapshot = {
  schema: "theory-atlas-snapshot/v1",
  sourceRepository: "https://github.com/expert10000/theory",
  sourceRevision: revision,
  atlasVersion: "1.0",
  entries,
  presets,
  sourceBindings,
};
const destination = resolve("packages/atlas/atlas.v1.json"),
  bytes = JSON.stringify(snapshot, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(destination, "utf8").replaceAll("\r\n", "\n") !== bytes)
    throw new Error("Vendored Atlas differs from pinned source");
} else writeFileSync(destination, bytes);
console.log(
  `${process.argv.includes("--check") ? "Verified" : "Pinned"} ${entries.length} Atlas entries and ${Object.keys(sourceBindings).length} source bindings from ${revision}`,
);
