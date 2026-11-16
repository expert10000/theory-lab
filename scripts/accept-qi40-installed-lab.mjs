/** Run the verified QWZ producer from a silently installed Theory Lab setup.
 * Usage: node scripts/accept-qi40-installed-lab.mjs <probe.json> <installer.exe> <packaged-root> <install-root> <new-output-directory>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { checkInstalledProbe, shaFile } from "./qi40-installed-probe.mjs";

const args = process.argv.slice(2);
if (args.length !== 5) throw new Error("Pass probe, installer, packaged root, install root, and new output directory");
const [probePath, installerPath, packagedRoot, installRoot, output] = args.map(arg => resolve(arg));
const { probe, payload } = await checkInstalledProbe(probePath, installerPath, packagedRoot, installRoot);
await mkdir(output);
const retained = join(output, "retained");
const executable = join(installRoot, "Quantum Hamiltonian Lab.exe");
const run = spawnSync(process.execPath, [resolve("scripts/accept-packaged-qwz.mjs"),
  executable, payload.executable, "--retain", retained],
{ encoding: "utf8", timeout: 240_000, maxBuffer: 10 * 1024 * 1024 });
if (run.status !== 0)
  throw new Error("Installed QWZ acceptance failed: " + (run.error?.message ?? run.stderr ?? run.stdout));
const acceptance = JSON.parse(run.stdout);
assert.equal(acceptance.schema, "theory-lab/qi40-packaged-producer-acceptance/v2");
assert.equal(acceptance.executableSha256, payload.executable);
assert.equal(acceptance.math3d, "capture-stub-only");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const acceptanceBytes = await readFile(join(retained, "acceptance.json"));
assert.equal(sha(acceptanceBytes), sha(Buffer.from(run.stdout)));
const report = {
  schema: "theory-lab/qi40-installed-lab-acceptance/v1",
  scope: "installed-theory-lab-with-math3d-capture-stub",
  installerSha256: probe.installerSha256,
  nsisSystemDllSha256: probe.nsisSystemDllSha256,
  installed: payload,
  probeSha256: await shaFile(probePath),
  acceptanceSha256: sha(acceptanceBytes),
  retainedLedgerSha256: sha(await readFile(join(retained, "artifact-hashes.json"))),
  freshRun: acceptance.freshRun,
};
await writeFile(join(output, "acceptance.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
const verify = spawnSync(process.execPath,
  [resolve("scripts/verify-qi40-installed-lab.mjs"), probePath, installerPath,
    packagedRoot, installRoot, output],
  { encoding: "utf8", timeout: 90_000 });
if (verify.status !== 0)
  throw new Error("Installed acceptance verification failed: " + (verify.error?.message ?? verify.stderr ?? verify.stdout));
console.log(JSON.stringify(report, null, 2));
