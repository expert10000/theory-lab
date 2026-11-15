/** Independently check a retained packaged QWZ handoff before Math3D import.
 * Usage: node scripts/verify-qi40-retained.mjs <retained-directory>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const argument = process.argv[2];
if (process.argv.length !== 3 || !argument) throw new Error("Pass one retained evidence directory");
const root = resolve(argument);
const rootInfo = await lstat(root);
if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("Retained evidence root must be a directory");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const name = value => typeof value === "string" && /^[A-Za-z0-9._-]+$/.test(value) &&
  value !== "." && value !== "..";
async function json(path) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 8 * 1024 * 1024)
    throw new Error("Invalid QI-40 evidence file");
  return JSON.parse(await readFile(path, "utf8"));
}
async function files(directory, prefix = "") {
  const values = [];
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    if (!name(entry.name) || entry.isSymbolicLink()) throw new Error("Unsafe retained evidence entry");
    const relative = join(prefix, entry.name);
    if (entry.isDirectory()) values.push(...await files(directory, relative));
    else if (entry.isFile()) {
      const info = await lstat(join(directory, relative));
      if (!info.isFile() || info.isSymbolicLink() || info.size > 8 * 1024 * 1024)
        throw new Error("Invalid retained evidence file");
      values.push({ path: relative.replaceAll("\\", "/"),
        sha256: sha(await readFile(join(directory, relative))) });
    }
    else throw new Error("Unsupported retained evidence entry");
  }
  return values.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}
const evidence = await json(join(root, "acceptance.json"));
const ledger = await json(join(root, "artifact-hashes.json"));
assert.equal(evidence.schema, "theory-lab/qi40-packaged-producer-acceptance/v2");
assert.equal(ledger.schema, "theory-lab/qi40-retained-artifacts/v1");
assert.equal(sha(await readFile(join(root, "acceptance.json"))), ledger.acceptanceSha256);
assert.deepEqual((await readdir(root)).sort(),
  ["acceptance.json", "artifact-hashes.json", "fixtureStudy", "freshRun", "freshStudy"].sort());
for (const key of ["fixtureStudy", "freshRun", "freshStudy"]) {
  const expected = ledger.files[key];
  assert.ok(Array.isArray(expected));
  const info = await lstat(join(root, key));
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Invalid retained evidence directory");
  assert.deepEqual(await files(join(root, key)),
    expected.toSorted((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0),
    `Retained ${key} bytes differ from the acceptance ledger`);
}

const fixtureRunId = "run-05ce1036d70c466eb4f900944a85c474";
const fixtureResultHash = "01eb644e4a07df9f4aa6f49ce27a61a1e98d920aabd794962f57420ca2d2decf";
assert.equal(evidence.runId, fixtureRunId);
assert.equal(evidence.resultSha256, fixtureResultHash);
const fresh = evidence.freshRun;
assert.ok(fresh && /^[A-Za-z0-9_-]{1,100}$/.test(fresh.runId));
assert.ok(/^[a-f0-9]{64}$/.test(fresh.resultSha256));
const runRoot = join(root, "freshRun");
const [runManifest, job, result] = await Promise.all([
  json(join(runRoot, "manifest.json")), json(join(runRoot, "job.json")), json(join(runRoot, "result.json")),
]);
assert.deepEqual((await readdir(runRoot)).sort(), ["job.json", "manifest.json", "result.json"]);
assert.equal(runManifest.runId, fresh.runId);
assert.equal(runManifest.hashes.result, fresh.resultSha256);
assert.equal(sha(await readFile(join(runRoot, "result.json"))), fresh.resultSha256);
assert.equal(sha(await readFile(join(runRoot, "job.json"))), runManifest.hashes.job);
assert.equal(result.runId, fresh.runId);
assert.equal(job.model.type, "qwz");
assert.equal(result.analysis.kind, "qwz");
assert.equal(result.analysis.chern, fresh.chern);
assert.equal(result.analysis.bulkGap, fresh.bulkGap);
assert.equal(job.model.parameters.mass, fresh.mass);
assert.equal(job.model.parameters.grid, fresh.grid);

async function study(key, sourceRunId, sourceHash, expectedManifestHash, expectedScenes, arrays) {
  const directory = join(root, key);
  const manifestBytes = await readFile(join(directory, "study.json"));
  assert.equal(sha(manifestBytes), expectedManifestHash);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  assert.equal(manifest.schema, "quantum-study-handoff/v1");
  assert.equal(manifest.model, "qwz");
  assert.equal(manifest.runId, sourceRunId);
  assert.equal(manifest.resultSha256, sourceHash);
  assert.deepEqual(manifest.scenes.map(scene => scene.role), ["curvature", "bands"]);
  assert.deepEqual((await readdir(directory)).sort(),
    ["study.json", ...manifest.scenes.map(scene => scene.folder)].sort());
  for (const declared of manifest.scenes) {
    assert.ok(name(declared.folder) && declared.folder.endsWith(".qscene"));
    const sceneRoot = join(directory, declared.folder);
    const sceneBytes = await readFile(join(sceneRoot, "scene.json"));
    const scene = JSON.parse(sceneBytes.toString("utf8"));
    const bundle = await json(join(sceneRoot, "bundle.json"));
    const expected = expectedScenes.find(item => item.role === declared.role);
    assert.ok(expected);
    assert.equal(sha(sceneBytes), expected.sceneSha256);
    assert.equal(sha(sceneBytes), bundle.scene.sha256);
    assert.equal(scene.id, declared.sceneId);
    assert.equal(scene.provenance.runId, sourceRunId);
    assert.equal(scene.provenance.resultSha256, sourceHash);
    assert.deepEqual((await readdir(sceneRoot)).sort(),
      ["bundle.json", "scene.json", ...scene.datasets.map(dataset => dataset.path)].sort());
    for (const dataset of scene.datasets) {
      assert.ok(name(dataset.path));
      const bytes = await readFile(join(sceneRoot, dataset.path));
      assert.equal(bytes.length, dataset.bytes);
      assert.equal(sha(bytes), dataset.sha256);
      const values = arrays?.[dataset.id];
      if (values) {
        assert.equal(bytes.length, values.length * 8);
        assert.deepEqual(Array.from({ length: values.length }, (_, index) => bytes.readDoubleLE(index * 8)), values);
      }
    }
  }
}
await study("fixtureStudy", fixtureRunId, fixtureResultHash, evidence.manifestSha256,
  evidence.scenes, null);
await study("freshStudy", fresh.runId, fresh.resultSha256, fresh.manifestSha256,
  fresh.scenes, {
    curvature: result.analysis.berryCurvature,
    "band-energy-0": result.analysis.lowerBand,
    "band-energy-1": result.analysis.upperBand,
  });
process.stdout.write(`QI-40 retained handoff verified: ${fresh.runId} ${fresh.resultSha256}\n`);
