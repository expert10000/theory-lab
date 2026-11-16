/** Independently recheck one fixed two-app unpacked acceptance bundle.
 * Usage: node scripts/verify-qi40-release-pair.mjs <candidate-manifest.json> <extraction.json> <acceptance-directory>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const [manifestArg, extractionArg, outputArg] = process.argv.slice(2);
if (process.argv.length !== 5 || !manifestArg || !extractionArg || !outputArg)
  throw new Error("Pass candidate manifest, extraction record, and acceptance directory");
const manifestPath = resolve(manifestArg);
const extractionPath = resolve(extractionArg);
const output = resolve(outputArg);
const [manifest, extraction, report, matched, direct] = await Promise.all([
  readFile(manifestPath, "utf8").then(JSON.parse),
  readFile(extractionPath, "utf8").then(JSON.parse),
  readFile(join(output, "acceptance.json"), "utf8").then(JSON.parse),
  readFile(join(output, "matched", "matched-acceptance.json"), "utf8").then(JSON.parse),
  readFile(join(output, "direct", "acceptance.json"), "utf8").then(JSON.parse),
]);
assert.equal(report.schema, "theory-lab/qi40-release-pair-acceptance/v1");
assert.equal(report.scope, "unpacked-apps-from-pinned-installers");
assert.equal(manifest.schema, "math3d/two-app-candidate/v1");
assert.equal(extraction.schema, "theory-lab/qi40-extracted-candidate/v1");
assert.equal(report.buildRunId, manifest.buildRunId);
assert.equal(report.buildRunId, extraction.buildRunId);
assert.equal(report.sourceCandidateRunId, manifest.sourceCandidateRunId ?? null);
assert.equal(report.theoryLabSourceCommit, manifest.theoryLab.commit);
assert.deepEqual(report.installerSha256,
  { math3d: manifest.math3d.installerSha256, theoryLab: manifest.theoryLab.installerSha256 });
assert.deepEqual(report.executableSha256,
  { math3d: extraction.applications.math3d.executableSha256,
    theoryLab: extraction.applications.theoryLab.executableSha256 });
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
assert.equal(report.matchedAcceptanceSha256,
  sha(await readFile(join(output, "matched", "matched-acceptance.json"))));
assert.equal(report.directAcceptanceSha256,
  sha(await readFile(join(output, "direct", "acceptance.json"))));
assert.equal(matched.buildRunId, report.buildRunId);
assert.equal(direct.runId, matched.freshRun.runId);
assert.equal(direct.resultSha256, matched.freshRun.resultSha256);
assert.equal(report.runId, direct.runId);
assert.equal(report.resultSha256, direct.resultSha256);
assert.equal(report.studySha256, direct.launchedStudySha256);
assert.equal(direct.sourceStudySha256, direct.launchedStudySha256);
assert.deepEqual((await readdir(output)).sort(), ["acceptance.json", "direct", "matched"].sort());
function verify(script, args) {
  const result = spawnSync(process.execPath, [resolve("scripts", script), ...args],
    { encoding: "utf8", timeout: 60_000 });
  if (result.status !== 0) throw new Error(`${script} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
}
verify("verify-qi40-matched.mjs", [manifestPath, extractionPath, join(output, "matched")]);
const root = dirname(extractionPath);
verify("verify-qi40-direct-launch.mjs", [
  join(root, "theoryLab", "app", "Quantum Hamiltonian Lab.exe"),
  join(root, "math3d", "app", "Math3D.exe"),
  join(output, "matched", "retained"), join(output, "direct")]);
console.log(`QI-40 fixed release-pair evidence verified: ${report.buildRunId} ${report.runId}`);
