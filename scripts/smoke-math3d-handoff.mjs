import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { _electron as electron } from "playwright";

const root = await mkdtemp(join(tmpdir(), "qlab-math3d-handoff-"));
const profile = join(root, "lab-profile");
const target = join(root, "fake-math3d");
const executable = join(target, "node_modules", "electron", "dist", process.platform === "win32" ? "electron.exe" : "electron");
const capture = join(root, "launched.json");
await mkdir(profile);
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
  console.log("PASS: saved-run and imported-bundle Math3D launches; modified imports are refused");
} finally {
  await desktop.close();
  const safeRoot = resolve(root);
  if (!safeRoot.startsWith(resolve(tmpdir()) + sep) || !safeRoot.includes("qlab-math3d-handoff-"))
    throw new Error("Unsafe Math3D handoff test cleanup path");
  await rm(safeRoot, { recursive: true, force: true });
}
