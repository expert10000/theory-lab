/** Independently recheck installed Theory Lab producer evidence on its runner.
 * Usage: node scripts/verify-qi40-installed-lab.mjs <probe.json> <installer.exe> <packaged-root> <install-root> <acceptance-directory>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { checkInstalledProbe, shaFile } from "./qi40-installed-probe.mjs";

const args = process.argv.slice(2);
if (args.length !== 5) throw new Error("Pass probe, installer, packaged root, install root, and acceptance directory");
const [probePath, installerPath, packagedRoot, installRoot, output] = args.map(arg => resolve(arg));
const { probe, payload } = await checkInstalledProbe(probePath, installerPath, packagedRoot, installRoot);
const report = JSON.parse(await readFile(join(output, "acceptance.json"), "utf8"));
const retained = join(output, "retained");
const acceptanceBytes = await readFile(join(retained, "acceptance.json"));
const acceptance = JSON.parse(acceptanceBytes);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
assert.equal(report.schema, "theory-lab/qi40-installed-lab-acceptance/v1");
assert.equal(report.scope, "installed-theory-lab-with-math3d-capture-stub");
assert.equal(report.installerSha256, probe.installerSha256);
assert.equal(report.nsisSystemDllSha256, probe.nsisSystemDllSha256);
assert.deepEqual(report.installed, payload);
assert.equal(report.probeSha256, await shaFile(probePath));
assert.equal(report.acceptanceSha256, sha(acceptanceBytes));
assert.equal(report.retainedLedgerSha256, sha(await readFile(join(retained, "artifact-hashes.json"))));
assert.equal(acceptance.schema, "theory-lab/qi40-packaged-producer-acceptance/v2");
assert.equal(acceptance.executableSha256, payload.executable);
assert.equal(acceptance.math3d, "capture-stub-only");
assert.deepEqual(report.freshRun, acceptance.freshRun);
assert.deepEqual((await readdir(output)).sort(), ["acceptance.json", "retained"]);
const verify = spawnSync(process.execPath, [resolve("scripts/verify-qi40-retained.mjs"), retained],
  { encoding: "utf8", timeout: 60_000 });
if (verify.status !== 0)
  throw new Error("Retained QWZ verification failed: " + (verify.error?.message ?? verify.stderr ?? verify.stdout));
console.log("Installed Theory Lab acceptance verified: " + report.installerSha256);
