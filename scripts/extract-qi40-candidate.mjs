/** Hash and unpack both applications from a QI-40 candidate artifact on Windows.
 * Usage: node scripts/extract-qi40-candidate.mjs <candidate-manifest.json> <new-output-directory>
 * Requires 7z on PATH. Extraction is not an installation test.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const [manifestArg, outputArg] = process.argv.slice(2);
if (process.argv.length !== 4 || !manifestArg || !outputArg)
  throw new Error("Pass candidate-manifest.json and a new output directory");
if (process.platform !== "win32") throw new Error("QI-40 NSIS extraction requires Windows");
const manifestPath = resolve(manifestArg);
const output = resolve(outputArg);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
assert.equal(manifest.schema, "math3d/two-app-candidate/v1");
async function shaFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
const entries = [
  { key: "math3d", executable: "Math3D.exe" },
  { key: "theoryLab", executable: "Quantum Hamiltonian Lab.exe" },
];
for (const { key } of entries) {
  const item = manifest[key];
  assert.match(item.installerName, /^[A-Za-z0-9 ._-]+\.exe$/);
  assert.match(item.installerSha256, /^[a-f0-9]{64}$/);
  assert.equal(await shaFile(join(dirname(manifestPath), item.installerName)), item.installerSha256,
    `${key} installer hash mismatch`);
}
await mkdir(output);
const record = { schema: "theory-lab/qi40-extracted-candidate/v1",
  buildRunId: manifest.buildRunId, manifestSha256: await shaFile(manifestPath), applications: {} };
for (const { key, executable } of entries) {
  const outer = join(output, key, "nsis");
  const app = join(output, key, "app");
  await mkdir(outer, { recursive: true });
  await mkdir(app, { recursive: true });
  const installer = join(dirname(manifestPath), manifest[key].installerName);
  const extract = args => {
    const result = spawnSync("7z", args, { encoding: "utf8", timeout: 180_000, maxBuffer: 2 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`7z extraction failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  };
  extract(["x", installer, `-o${outer}`, "-y", "$PLUGINSDIR/app-64.7z"]);
  const archive = join(outer, "$PLUGINSDIR", "app-64.7z");
  extract(["x", archive, `-o${app}`, "-y"]);
  record.applications[key] = { installerSha256: manifest[key].installerSha256,
    appArchiveSha256: await shaFile(archive), executableSha256: await shaFile(join(app, executable)),
    appAsarSha256: await shaFile(join(app, "resources", "app.asar")),
    executable: `${key}/app/${executable}` };
}
await writeFile(join(output, "extraction.json"), `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify(record, null, 2));
