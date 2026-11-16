/** Stage a replacement Theory Lab installer with an existing pinned Math3D candidate.
 * Usage: node scripts/stage-qi40-pair.mjs <prior-candidate-manifest> <Lab-installer> <Lab-source-commit> <new-output-directory>
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const [priorArg, labArg, labCommit, outputArg] = process.argv.slice(2);
if (process.argv.length !== 6 || !priorArg || !labArg || !/^[a-f0-9]{40}$/.test(labCommit ?? "") || !outputArg)
  throw new Error("Pass prior candidate manifest, Lab installer, 40-digit Lab source commit, and new output directory");
const priorPath = resolve(priorArg);
const labPath = resolve(labArg);
const output = resolve(outputArg);
if (process.platform !== "win32") throw new Error("QI-40 NSIS component inspection requires Windows");
const prior = JSON.parse(await readFile(priorPath, "utf8"));
assert.equal(prior.schema, "math3d/two-app-candidate/v1");
for (const item of [prior.math3d, prior.theoryLab])
  assert.match(item.installerName, /^[A-Za-z0-9 ._-]+\.exe$/);
assert.equal(basename(labPath), prior.theoryLab.installerName);
async function hash(path) {
  const sha = createHash("sha256");
  for await (const chunk of createReadStream(path)) sha.update(chunk);
  return sha.digest("hex");
}
const oldMath3D = join(dirname(priorPath), prior.math3d.installerName);
assert.equal(await hash(oldMath3D), prior.math3d.installerSha256,
  "Prior Math3D installer changed");
const labSha256 = await hash(labPath);
assert.notEqual(labSha256, prior.theoryLab.installerSha256,
  "Replacement Theory Lab installer is identical to the old candidate");
const pinnedSystemSha256 = "1556ee1bf1cb477124e1269b534ed81653ba71994dab7903ee3782b75acc2810";
function inspectSystemDll(installer, expectedInstallerSha256) {
  const result = spawnSync("pwsh", ["-NoProfile",
    "-File", resolve("scripts/verify-qi40-installer-nsis.ps1"), "-Installer", installer],
  { encoding: "utf8", timeout: 60_000 });
  if (result.status !== 0)
    throw new Error("Pinned NSIS component check failed: " + (result.error?.message ?? result.stderr ?? result.stdout));
  const component = JSON.parse(result.stdout);
  assert.equal(component.installerSha256, expectedInstallerSha256);
  assert.equal(component.systemDllSha256, pinnedSystemSha256);
  assert.equal(component.systemDllBytes, 30208);
  return component.systemDllSha256;
}
assert.equal(inspectSystemDll(oldMath3D, prior.math3d.installerSha256),
  inspectSystemDll(labPath, labSha256), "Candidate installers use different NSIS System.dll components");
await mkdir(output);
await copyFile(oldMath3D, join(output, prior.math3d.installerName));
await copyFile(labPath, join(output, prior.theoryLab.installerName));
assert.equal(await hash(join(output, prior.math3d.installerName)), prior.math3d.installerSha256);
assert.equal(await hash(join(output, prior.theoryLab.installerName)), labSha256);
const manifest = { schema: "math3d/two-app-candidate/v1",
  createdAtUtc: new Date().toISOString(), buildRunId: `local-${labSha256.slice(0, 16)}`,
  sourceCandidateRunId: prior.buildRunId,
  nsisSystemDllSha256: pinnedSystemSha256,
  math3d: prior.math3d,
  theoryLab: { ...prior.theoryLab, commit: labCommit, installerSha256: labSha256 } };
await writeFile(join(output, "candidate-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify(manifest, null, 2));
