/** Run both QI-40 acceptance commands against one extracted installer pair.
 * Usage: node scripts/accept-qi40-matched.mjs <candidate-manifest.json> <extraction.json> <new-output-directory>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const [manifestArg, extractionArg, outputArg] = process.argv.slice(2);
if (process.argv.length !== 5 || !manifestArg || !extractionArg || !outputArg)
  throw new Error("Pass candidate manifest, extraction record, and a new output directory");
if (process.platform !== "win32") throw new Error("The matched QI-40 acceptance requires Windows");
const manifestPath = resolve(manifestArg);
const extractionPath = resolve(extractionArg);
const output = resolve(outputArg);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const [manifestBytes, extractionBytes] = await Promise.all([
  readFile(manifestPath), readFile(extractionPath),
]);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const extraction = JSON.parse(extractionBytes.toString("utf8"));
assert.equal(manifest.schema, "math3d/two-app-candidate/v1");
assert.equal(extraction.schema, "theory-lab/qi40-extracted-candidate/v1");
assert.equal(extraction.manifestSha256, sha(manifestBytes));
assert.equal(extraction.buildRunId, manifest.buildRunId);
for (const key of ["math3d", "theoryLab"])
  assert.equal(extraction.applications[key].installerSha256, manifest[key].installerSha256);
const extractedRoot = dirname(extractionPath);
const lab = join(extractedRoot, "theoryLab", "app", "Quantum Hamiltonian Lab.exe");
const math3d = join(extractedRoot, "math3d", "app", "Math3D.exe");
const retained = join(output, "retained");
const consumerEvidence = join(output, "consumer");
function run(script, args) {
  const result = spawnSync(process.execPath, [resolve("scripts", script), ...args],
    { cwd: resolve("."), encoding: "utf8", timeout: 150_000, maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${script} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  return JSON.parse(result.stdout);
}
await mkdir(output);
const producer = run("accept-packaged-qwz.mjs", [lab,
  extraction.applications.theoryLab.executableSha256, "--retain", retained]);
assert.equal(producer.schema, "theory-lab/qi40-packaged-producer-acceptance/v2");
assert.equal(producer.executableSha256, extraction.applications.theoryLab.executableSha256);
const consumer = run("accept-qi40-math3d.mjs", [math3d,
  extraction.applications.math3d.executableSha256, retained,
  "--candidate", manifestPath, "--evidence", consumerEvidence]);
assert.equal(consumer.schema, "theory-lab/qi40-math3d-consumer/v1");
assert.equal(consumer.executableSha256, extraction.applications.math3d.executableSha256);
assert.equal(consumer.runId, producer.freshRun.runId);
assert.equal(consumer.resultSha256, producer.freshRun.resultSha256);
assert.deepEqual(consumer.viewed.toSorted(), ["bands", "curvature"]);
assert.equal(consumer.retained.acceptanceSha256, sha(await readFile(join(retained, "acceptance.json"))));
const report = {
  schema: "theory-lab/qi40-matched-two-app-acceptance/v1",
  scope: "unpacked-apps-from-pinned-installers",
  buildRunId: manifest.buildRunId,
  candidateManifestSha256: sha(manifestBytes),
  extractionSha256: sha(extractionBytes),
  installerSha256: { math3d: manifest.math3d.installerSha256,
    theoryLab: manifest.theoryLab.installerSha256 },
  executableSha256: { math3d: consumer.executableSha256,
    theoryLab: producer.executableSha256 },
  freshRun: producer.freshRun,
  retainedLedgerSha256: consumer.retained.ledgerSha256,
  consumerScreenshots: consumer.screenshots,
};
await writeFile(join(output, "matched-acceptance.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify(report, null, 2));
