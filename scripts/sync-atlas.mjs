// Rebuild the vendored, read-only Atlas snapshot from a checked-out theory repository.
// This is an explicit maintainer action; the desktop app never fetches live content.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const revision = "61791aff00c0f35a82ec6f2271deded5cc5e99d6";
const source = resolve(process.argv[2] ?? "../THEORY");
const files = ["a1_fixtures", "driven_light_matter", "foundational", "lattice_topological", "spin_atomic_fields"];
function read(path) {
  return JSON.parse(execFileSync("git", ["-C", source, "show", `${revision}:data/hamiltonian_atlas/${path}`], { encoding: "utf8" }));
}
const actual = execFileSync("git", ["-C", source, "rev-parse", revision], { encoding: "utf8" }).trim();
if (actual !== revision) throw new Error("Theory revision does not match pinned Atlas source");
const entries = files.flatMap(name => read(`registry/${name}.yaml`).entries.map(entry => ({ ...entry, sourceFile: `registry/${name}.yaml` })));
const presets = read("presets/canonical_parameters.yaml").presets;
const ids = new Set(entries.map(entry => entry.id));
if (entries.length !== 48 || ids.size !== 48) throw new Error("Unexpected Atlas entry count or duplicate ID");
for (const entry of entries) {
  if (entry.schema_version !== "1.0" || !entry.formula?.latex || !entry.basis?.description || !entry.presentation?.summary || !Array.isArray(entry.parameters)) throw new Error(`Incomplete Atlas entry ${entry.id}`);
  if (entry.computation?.adapter !== null || entry.computation?.runnable !== null) throw new Error(`Source unexpectedly marks ${entry.id} runnable`);
  if (entry.computation.default_preset && presets[entry.computation.default_preset]?.model !== entry.id) throw new Error(`Invalid preset for ${entry.id}`);
  for (const relation of entry.relations) if (!ids.has(relation.target)) throw new Error(`Broken relation ${entry.id} → ${relation.target}`);
}
const snapshot = { schema: "theory-atlas-snapshot/v1", sourceRepository: "https://github.com/expert10000/theory", sourceRevision: revision, atlasVersion: "1.0", entries, presets };
writeFileSync(resolve("packages/atlas/atlas.v1.json"), JSON.stringify(snapshot, null, 2) + "\n");
console.log(`Pinned ${entries.length} Atlas entries from ${revision}`);
