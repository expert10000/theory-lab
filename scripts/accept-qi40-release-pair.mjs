/** Accept both retained views and the real direct launch from one extracted installer pair.
 * Usage: node scripts/accept-qi40-release-pair.mjs <candidate-manifest.json> <extraction.json> <new-output-directory>
 * This is unpacked-app evidence, not an installed release certification.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const [manifestArg, extractionArg, outputArg] = process.argv.slice(2);
if (process.argv.length !== 5 || !manifestArg || !extractionArg || !outputArg)
  throw new Error("Pass candidate manifest, extraction record, and a new output directory");
if (process.platform !== "win32") throw new Error("QI-40 release-pair acceptance requires Windows");
const manifestPath = resolve(manifestArg);
const extractionPath = resolve(extractionArg);
const output = resolve(outputArg);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const extraction = JSON.parse(await readFile(extractionPath, "utf8"));
assert.equal(manifest.schema, "math3d/two-app-candidate/v1");
assert.equal(extraction.schema, "theory-lab/qi40-extracted-candidate/v1");
assert.equal(manifest.buildRunId, extraction.buildRunId);
const appRoot = dirname(extractionPath);
const lab = join(appRoot, "theoryLab", "app", "Quantum Hamiltonian Lab.exe");
const math3d = join(appRoot, "math3d", "app", "Math3D.exe");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
function run(script, args) {
  const result = spawnSync(process.execPath, [resolve("scripts", script), ...args],
    { encoding: "utf8", timeout: 180_000, maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${script} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  return JSON.parse(result.stdout);
}
await mkdir(output);
const matchedRoot = join(output, "matched");
const directRoot = join(output, "direct");
const matched = run("accept-qi40-matched.mjs", [manifestPath, extractionPath, matchedRoot]);
const direct = run("accept-qi40-direct-launch.mjs", [lab,
  extraction.applications.theoryLab.executableSha256, math3d,
  extraction.applications.math3d.executableSha256,
  join(matchedRoot, "retained"), directRoot]);
assert.equal(matched.schema, "theory-lab/qi40-matched-two-app-acceptance/v1");
assert.equal(direct.schema, "theory-lab/qi40-direct-launch/v1");
assert.equal(matched.buildRunId, manifest.buildRunId);
assert.equal(direct.runId, matched.freshRun.runId);
assert.equal(direct.resultSha256, matched.freshRun.resultSha256);
assert.equal(direct.sourceStudySha256, direct.launchedStudySha256);
assert.equal(direct.labExecutableSha256, matched.executableSha256.theoryLab);
assert.equal(direct.math3dExecutableSha256, matched.executableSha256.math3d);
const report = { schema: "theory-lab/qi40-release-pair-acceptance/v1",
  scope: "unpacked-apps-from-pinned-installers",
  buildRunId: manifest.buildRunId, sourceCandidateRunId: manifest.sourceCandidateRunId ?? null,
  theoryLabSourceCommit: manifest.theoryLab.commit,
  installerSha256: matched.installerSha256,
  executableSha256: matched.executableSha256,
  runId: direct.runId, resultSha256: direct.resultSha256,
  studySha256: direct.launchedStudySha256,
  matchedAcceptanceSha256: sha(await readFile(join(matchedRoot, "matched-acceptance.json"))),
  directAcceptanceSha256: sha(await readFile(join(directRoot, "acceptance.json"))) };
await writeFile(join(output, "acceptance.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
const recheck = spawnSync(process.execPath,
  [resolve("scripts/verify-qi40-release-pair.mjs"), manifestPath, extractionPath, output],
  { encoding: "utf8", timeout: 60_000 });
if (recheck.status !== 0)
  throw new Error(`Release-pair evidence failed verification: ${recheck.error?.message ?? recheck.stderr ?? recheck.stdout}`);
console.log(JSON.stringify(report, null, 2));
