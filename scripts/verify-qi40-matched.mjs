/** Independently verify a retained matched two-app QI-40 acceptance bundle.
 * Usage: node scripts/verify-qi40-matched.mjs <candidate-manifest.json> <extraction.json> <acceptance-directory>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const [manifestArg, extractionArg, outputArg] = process.argv.slice(2);
if (process.argv.length !== 5 || !manifestArg || !extractionArg || !outputArg)
  throw new Error("Pass candidate manifest, extraction record, and matched acceptance directory");
const manifestPath = resolve(manifestArg);
const extractionPath = resolve(extractionArg);
const output = resolve(outputArg);
async function shaFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
const [manifest, extraction, report, producer, consumer] = await Promise.all([
  readFile(manifestPath, "utf8").then(JSON.parse),
  readFile(extractionPath, "utf8").then(JSON.parse),
  readFile(join(output, "matched-acceptance.json"), "utf8").then(JSON.parse),
  readFile(join(output, "retained", "acceptance.json"), "utf8").then(JSON.parse),
  readFile(join(output, "consumer", "acceptance.json"), "utf8").then(JSON.parse),
]);
assert.equal(manifest.schema, "math3d/two-app-candidate/v1");
assert.equal(extraction.schema, "theory-lab/qi40-extracted-candidate/v1");
assert.equal(report.schema, "theory-lab/qi40-matched-two-app-acceptance/v1");
assert.equal(report.scope, "unpacked-apps-from-pinned-installers");
assert.equal(producer.schema, "theory-lab/qi40-packaged-producer-acceptance/v2");
assert.equal(consumer.schema, "theory-lab/qi40-math3d-consumer/v1");
assert.equal(report.buildRunId, manifest.buildRunId);
assert.equal(extraction.buildRunId, manifest.buildRunId);
assert.equal(consumer.candidate.buildRunId, manifest.buildRunId);
assert.equal(report.candidateManifestSha256, await shaFile(manifestPath));
assert.equal(extraction.manifestSha256, report.candidateManifestSha256);
assert.equal(report.extractionSha256, await shaFile(extractionPath));
for (const [key, executable] of [["math3d", "Math3D.exe"], ["theoryLab", "Quantum Hamiltonian Lab.exe"]]) {
  const item = manifest[key];
  assert.match(item.installerName, /^[A-Za-z0-9 ._-]+\.exe$/);
  const hash = await shaFile(join(dirname(manifestPath), item.installerName));
  assert.equal(hash, item.installerSha256);
  assert.equal(hash, extraction.applications[key].installerSha256);
  assert.equal(hash, report.installerSha256[key]);
  assert.deepEqual(consumer.candidate[key], item);
  const appRoot = join(dirname(extractionPath), key, "app");
  assert.equal(await shaFile(join(dirname(extractionPath), key, "nsis", "$PLUGINSDIR", "app-64.7z")),
    extraction.applications[key].appArchiveSha256);
  assert.equal(await shaFile(join(appRoot, "resources", "app.asar")),
    extraction.applications[key].appAsarSha256);
  assert.equal(await shaFile(join(appRoot, executable)), extraction.applications[key].executableSha256);
  assert.equal(report.executableSha256[key], extraction.applications[key].executableSha256);
}
assert.equal(producer.executableSha256, report.executableSha256.theoryLab);
assert.equal(consumer.executableSha256, report.executableSha256.math3d);
assert.deepEqual(report.freshRun, producer.freshRun);
assert.equal(consumer.runId, producer.freshRun.runId);
assert.equal(consumer.resultSha256, producer.freshRun.resultSha256);
assert.equal(consumer.stagedViews, 2);
assert.deepEqual(consumer.viewed.toSorted(), ["bands", "curvature"]);
assert.equal(consumer.retained.acceptanceSha256,
  await shaFile(join(output, "retained", "acceptance.json")));
assert.equal(consumer.retained.ledgerSha256,
  await shaFile(join(output, "retained", "artifact-hashes.json")));
assert.equal(report.retainedLedgerSha256, consumer.retained.ledgerSha256);
assert.deepEqual(report.consumerScreenshots, consumer.screenshots);
assert.deepEqual(consumer.screenshots.map(item => item.role).toSorted(), ["bands", "curvature"]);
for (const item of consumer.screenshots) {
  assert.equal(item.file, `${item.role}.png`);
  assert.equal(await shaFile(join(output, "consumer", item.file)), item.sha256,
    `${item.role} screenshot changed`);
}
const check = spawnSync(process.execPath,
  [resolve("scripts/verify-qi40-retained.mjs"), join(output, "retained")],
  { encoding: "utf8", timeout: 30_000 });
if (check.status !== 0) throw new Error(`Retained QWZ verification failed: ${check.stderr || check.stdout}`);
console.log(`QI-40 matched acceptance verified: ${manifest.buildRunId} ${consumer.runId}`);
