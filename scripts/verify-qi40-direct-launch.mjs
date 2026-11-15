/** Recheck copied QWZ files and identities from a direct two-app launch.
 * Usage: node scripts/verify-qi40-direct-launch.mjs <Lab.exe> <Math3D.exe> <retained-directory> <direct-evidence-directory>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const [labArg, math3dArg, retainedArg, evidenceArg] = process.argv.slice(2);
if (process.argv.length !== 6 || !labArg || !math3dArg || !retainedArg || !evidenceArg)
  throw new Error("Pass Lab.exe, Math3D.exe, retained directory, and direct evidence directory");
const lab = resolve(labArg);
const math3d = resolve(math3dArg);
const retained = resolve(retainedArg);
const evidence = resolve(evidenceArg);
async function shaFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
const sourceCheck = spawnSync(process.execPath,
  [resolve("scripts/verify-qi40-retained.mjs"), retained],
  { encoding: "utf8", timeout: 30_000 });
if (sourceCheck.status !== 0) throw new Error(`Retained source failed: ${sourceCheck.stderr || sourceCheck.stdout}`);
const report = JSON.parse(await readFile(join(evidence, "acceptance.json"), "utf8"));
const source = JSON.parse(await readFile(join(retained, "freshRun", "manifest.json"), "utf8"));
const study = JSON.parse(await readFile(join(evidence, "study", "study.json"), "utf8"));
assert.equal(report.schema, "theory-lab/qi40-direct-launch/v1");
assert.equal(report.scope, "packaged-lab-to-unpacked-math3d-process");
assert.equal(report.labExecutableSha256, await shaFile(lab));
assert.equal(report.math3dExecutableSha256, await shaFile(math3d));
assert.equal(report.retainedAcceptanceSha256, await shaFile(join(retained, "acceptance.json")));
assert.equal(report.runId, source.runId);
assert.equal(report.resultSha256, source.hashes.result);
assert.equal(study.runId, source.runId);
assert.equal(study.resultSha256, source.hashes.result);
assert.deepEqual(study.scenes.map(scene => scene.role), ["curvature", "bands"]);
assert.equal(report.sourceStudySha256, await shaFile(join(retained, "freshStudy", "study.json")));
assert.equal(report.launchedStudySha256, await shaFile(join(evidence, "study", "study.json")));
assert.equal(report.sourceStudySha256, report.launchedStudySha256);
assert.ok(Number.isSafeInteger(report.process.pid) && report.process.pid > 0);
assert.ok(Number.isSafeInteger(report.process.parentPid) && report.process.parentPid > 0);
assert.ok(Number.isSafeInteger(report.process.rendererPid) && report.process.rendererPid > 0);
assert.equal(typeof report.handoffDirectory, "string");
assert.ok(report.process.commandLine.startsWith(math3d) ||
  report.process.commandLine.startsWith(`"${math3d}"`));
assert.ok(report.process.commandLine.includes(`--quantum-study ${report.handoffDirectory} new`));
async function tree(root, prefix = "") {
  const files = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    assert.match(entry.name, /^[A-Za-z0-9._-]+$/);
    assert.ok(!entry.isSymbolicLink(), "Handoff evidence contains a link");
    const relative = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await tree(root, relative));
    else if (entry.isFile()) files.push({ path: relative.replaceAll("\\", "/"),
      sha256: await shaFile(join(root, relative)) });
    else throw new Error("Unsupported handoff evidence entry");
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
const captured = await tree(join(evidence, "study"));
const sourceFiles = await tree(join(retained, "freshStudy"));
assert.deepEqual(captured, sourceFiles, "Direct handoff differs from retained producer study");
assert.deepEqual(captured, report.files, "Direct handoff file ledger changed");
assert.deepEqual((await readdir(evidence)).sort(), ["acceptance.json", "study"].sort());
console.log(`QI-40 direct launch evidence verified: ${source.runId}`);
