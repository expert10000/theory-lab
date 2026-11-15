/** Regression check for an installed-style Math3D executable and app.asar. */
import assert from "node:assert/strict";
import { copyFile, cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { createPackage } from "@electron/asar";
import { _electron as electron } from "playwright";

if (process.platform !== "win32") throw new Error("Installed Math3D target smoke requires Windows");
const root = await mkdtemp(join(tmpdir(), "qi40-installed-target-"));
const profile = join(root, "profile");
const appSource = join(root, "math3d-source");
const target = join(root, "math3d-installed");
const executable = join(target, "Math3D.exe");
const capture = join(root, "capture.json");
const runId = "run-05ce1036d70c466eb4f900944a85c474";
const resultSha256 = "01eb644e4a07df9f4aa6f49ce27a61a1e98d920aabd794962f57420ca2d2decf";
await mkdir(join(profile, "runs"), { recursive: true });
await cp(resolve("packages", "contracts", "fixtures", runId), join(profile, "runs", runId),
  { recursive: true });
await cp(resolve("node_modules", "electron", "dist"), target, { recursive: true });
await rename(join(target, "electron.exe"), executable);
await mkdir(appSource);
await writeFile(join(appSource, "package.json"), JSON.stringify({ name: "math3d-target-smoke",
  version: "1.0.0", main: "main.cjs" }));
await writeFile(join(appSource, "main.cjs"),
  "require('node:fs').writeFileSync(process.env.QLAB_MATH3D_CAPTURE, JSON.stringify(process.argv)); require('electron').app.whenReady().then(() => require('electron').app.quit());\n");
await createPackage(appSource, join(target, "resources", "app.asar"));
const env = { ...process.env, QLAB_TEST_PROFILE: profile, QLAB_MATH3D_HOME: executable,
  QLAB_MATH3D_CAPTURE: capture };
delete env.ELECTRON_RUN_AS_NODE;
let desktop;
try {
  desktop = await electron.launch({ args: ["."], cwd: resolve("."), env });
  const page = await desktop.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 60_000 });
  await assert.rejects(page.evaluate(id =>
    window.quantum.openQwzStudyInMath3D(id, "0".repeat(64), "new"), runId), /hash|changed/i);
  await assert.rejects(readFile(capture), /ENOENT/);
  const receipt = await page.evaluate(({ id, hash }) =>
    window.quantum.openQwzStudyInMath3D(id, hash, "new"), { id: runId, hash: resultSha256 });
  assert.equal(receipt.launched, true);
  let launched;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { launched = JSON.parse(await readFile(capture, "utf8")); break; }
    catch { await new Promise(done => setTimeout(done, 100)); }
  }
  assert.ok(launched, "Installed-style Math3D executable did not start");
  const flag = launched.indexOf("--quantum-study");
  assert.ok(flag >= 0);
  assert.equal(launched[flag + 1], receipt.directory);
  assert.equal(launched[flag + 2], "new");
  const captured = await readFile(capture, "utf8");
  await desktop.evaluate((_electron, path) => { process.env.QLAB_MATH3D_HOME = path; },
    join(target, "NotMath3D.exe"));
  await assert.rejects(page.evaluate(({ id, hash }) =>
    window.quantum.openQwzStudyInMath3D(id, hash, "new"),
    { id: runId, hash: resultSha256 }), /Selected executable is not Math3D/);
  assert.equal(await readFile(capture, "utf8"), captured);
  const incomplete = join(root, "incomplete-installed");
  await mkdir(incomplete);
  await copyFile(executable, join(incomplete, "Math3D.exe"));
  await desktop.evaluate((_electron, path) => { process.env.QLAB_MATH3D_HOME = path; },
    join(incomplete, "Math3D.exe"));
  await assert.rejects(page.evaluate(({ id, hash }) =>
    window.quantum.openQwzStudyInMath3D(id, hash, "new"),
    { id: runId, hash: resultSha256 }), /ENOENT|Math3D installation is incomplete/);
  assert.equal(await readFile(capture, "utf8"), captured);
  console.log("PASS: installed-style Math3D launches exact QWZ study; wrong hash and invalid targets are refused");
} finally {
  await desktop?.close();
  const safeRoot = resolve(root);
  if (!safeRoot.startsWith(resolve(tmpdir()) + sep) || !safeRoot.includes("qi40-installed-target-"))
    throw new Error("Unsafe installed-target smoke cleanup path");
  await rm(safeRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}
