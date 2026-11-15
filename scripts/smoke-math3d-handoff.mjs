import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, cp, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { _electron as electron } from "playwright";

const root = await mkdtemp(join(tmpdir(), "qlab-math3d-handoff-"));
const profile = join(root, "lab-profile");
const target = join(root, "fake-math3d");
const executable = join(target, "node_modules", "electron", "dist", process.platform === "win32" ? "electron.exe" : "electron");
const capture = join(root, "launched.json");
const qwzRunId = "run-05ce1036d70c466eb4f900944a85c474";
const qwzResultSha256 = "01eb644e4a07df9f4aa6f49ce27a61a1e98d920aabd794962f57420ca2d2decf";
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
await mkdir(profile);
await mkdir(join(profile, "runs"));
await cp(resolve("packages", "contracts", "fixtures", qwzRunId),
  join(profile, "runs", qwzRunId), { recursive: true });
await mkdir(join(target, "node_modules", "electron", "dist"), { recursive: true });
await mkdir(join(target, "renderer", "dist"), { recursive: true });
await mkdir(join(target, "dist"), { recursive: true });
await writeFile(join(target, "package.json"), JSON.stringify({ name: "math3d", main: "dist/main.js" }));
await writeFile(join(target, "dist", "main.js"),
  "require('node:fs').appendFileSync(process.env.QLAB_MATH3D_CAPTURE, JSON.stringify({ argv: process.argv }) + '\\n');\n");
await writeFile(join(target, "renderer", "dist", "index.html"), "<!doctype html>\n");
await copyFile(process.execPath, executable);
const env = { ...process.env, QLAB_TEST_PROFILE: profile, QLAB_MATH3D_HOME: target, QLAB_MATH3D_CAPTURE: capture };
delete env.ELECTRON_RUN_AS_NODE;
const desktop = await electron.launch({ args: ["."], cwd: resolve("."), env });
try {
  const page = await desktop.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 45000 });
  await page.getByRole("button", { name: /Rabi dynamics/ }).click();
  await page.getByRole("combobox", { name: "Dynamics engine" }).selectOption("native");
  await page.getByTestId("run-evolution").click();
  await page.getByTestId("evolution-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  const runId = await page.getByTestId("workspace-run-id").innerText();
  const source = await page.evaluate((id) => window.quantum.getScene(id, "standard"), runId);
  await assert.rejects(page.evaluate(({ id }) => window.quantum.openInMath3D(id, "standard", "0".repeat(64)), { id: runId }),
    /changed after preview/);
  await page.getByTestId("view-in-scenes").click();
  await page.getByTestId("scenes-page").waitFor();
  await page.getByTestId("open-in-math3d").click();
  await page.getByRole("status").filter({ hasText: "Math3D launched" }).waitFor({ timeout: 15000 });
  for (let attempt = 0; attempt < 50; attempt++) {
    try { await stat(capture); break; } catch { await new Promise(done => setTimeout(done, 100)); }
  }
  const launches = async () => (await readFile(capture, "utf8")).trim().split("\n").map(line => JSON.parse(line));
  const launched = (await launches())[0];
  const flag = launched.argv.indexOf("--quantum-scene");
  assert.ok(flag >= 0);
  const sceneDirectory = launched.argv[flag + 1];
  assert.ok(sceneDirectory.endsWith(".qscene"));
  const scene = JSON.parse(await readFile(join(sceneDirectory, "scene.json"), "utf8"));
  assert.equal(scene.provenance.runId, runId);
  assert.equal(scene.provenance.resultSha256, source.scene.provenance.resultSha256);
  assert.equal(JSON.parse(await readFile(join(sceneDirectory, "bundle.json"), "utf8")).schema,
    "quantum-scene-bundle/v1");
  await desktop.evaluate(({ dialog }, folder) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] });
  }, sceneDirectory);
  await page.getByTestId("import-scene").click();
  await page.getByRole("status").filter({ hasText: "Opened verified scene bundle" }).waitFor();
  await page.getByTestId("open-in-math3d").click();
  await page.getByRole("status").filter({ hasText: "Math3D launched with the verified imported scene" }).waitFor();
  for (let attempt = 0; attempt < 50 && (await launches()).length < 2; attempt++)
    await new Promise(done => setTimeout(done, 100));
  assert.equal((await launches()).length, 2);
  const importedLaunch = (await launches())[1];
  assert.equal(importedLaunch.argv[importedLaunch.argv.indexOf("--quantum-scene") + 1], sceneDirectory);
  await writeFile(join(sceneDirectory, "scene.json"), JSON.stringify(scene) + " ");
  await page.getByTestId("open-in-math3d").click();
  await page.getByRole("status").filter({ hasText: /integrity|size|SHA|hash|changed|mismatch/i }).waitFor();
  await new Promise(done => setTimeout(done, 500));
  assert.equal((await launches()).length, 2);
  await assert.rejects(page.evaluate(({ id }) =>
    window.quantum.openQwzStudyInMath3D(id, "0".repeat(64), "new"), { id: qwzRunId }), /hash|changed/i);
  assert.equal((await launches()).length, 2);
  const study = await page.evaluate(({ id, hash }) =>
    window.quantum.openQwzStudyInMath3D(id, hash, "new"), { id: qwzRunId, hash: qwzResultSha256 });
  assert.equal(study.launched, true);
  for (let attempt = 0; attempt < 50 && (await launches()).length < 3; attempt++)
    await new Promise(done => setTimeout(done, 100));
  const studyLaunch = (await launches())[2];
  const studyFlag = studyLaunch.argv.indexOf("--quantum-study");
  assert.ok(studyFlag >= 0);
  assert.equal(studyLaunch.argv[studyFlag + 1], study.directory);
  assert.equal(studyLaunch.argv[studyFlag + 2], "new");
  const studyBytes = await readFile(join(study.directory, "study.json"));
  const manifest = JSON.parse(studyBytes.toString("utf8"));
  assert.equal(manifest.runId, qwzRunId);
  assert.equal(manifest.resultSha256, qwzResultSha256);
  assert.deepEqual(manifest.scenes.map(item => item.role), ["curvature", "bands"]);
  for (const declared of manifest.scenes) {
    const folder = join(study.directory, declared.folder);
    const sceneBytes = await readFile(join(folder, "scene.json"));
    const bundle = JSON.parse(await readFile(join(folder, "bundle.json"), "utf8"));
    const savedScene = JSON.parse(sceneBytes.toString("utf8"));
    assert.equal(sha256(sceneBytes), bundle.scene.sha256);
    assert.equal(savedScene.id, declared.sceneId);
    assert.equal(savedScene.provenance.runId, qwzRunId);
    assert.equal(savedScene.provenance.resultSha256, qwzResultSha256);
  }
  console.log("PASS: single-scene and two-view QWZ Math3D launches; modified imports and wrong source hashes are refused");
} finally {
  await desktop.close();
  const safeRoot = resolve(root);
  if (!safeRoot.startsWith(resolve(tmpdir()) + sep) || !safeRoot.includes("qlab-math3d-handoff-"))
    throw new Error("Unsafe Math3D handoff test cleanup path");
  await rm(safeRoot, { recursive: true, force: true });
}
