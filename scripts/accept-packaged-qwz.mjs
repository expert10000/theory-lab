/** Verify a packaged Lab candidate's QWZ producer and Math3D launch contract.
 * Usage: node scripts/accept-packaged-qwz.mjs <absolute-Lab-executable> <expected-executable-sha256>
 * The Math3D target is a capture stub; this does not certify its rendering.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve, sep } from "node:path";
import { _electron as electron } from "playwright";

const [executable, expectedExecutableHash] = process.argv.slice(2);
if (process.argv.length !== 4 || !executable || !isAbsolute(executable) ||
    !/^[a-f0-9]{64}$/.test(expectedExecutableHash) || !(await stat(executable)).isFile())
  throw new Error("Pass an absolute packaged Lab executable and its expected SHA-256");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
async function fileHash(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
const executableSha256 = await fileHash(executable);
assert.equal(executableSha256, expectedExecutableHash, "Packaged Lab executable hash changed");

const runId = "run-05ce1036d70c466eb4f900944a85c474";
const resultSha256 = "01eb644e4a07df9f4aa6f49ce27a61a1e98d920aabd794962f57420ca2d2decf";
const golden = {
  curvature: "38f8275bfd0e568251ef44742fe7ef412c958cb066e713558768cc2872af65b5",
  bands: "9759d1e5555fd8c7af7614a08e372593d55398894960f5d96eb41a349555890b",
};
const root = await mkdtemp(join(tmpdir(), "qi40-packaged-lab-"));
const profile = join(root, "profile");
const target = join(root, "fake-math3d");
const capture = join(root, "launch.json");
const fakeExecutable = join(target, "node_modules", "electron", "dist",
  process.platform === "win32" ? "electron.exe" : "electron");
let app;
try {
  await mkdir(join(profile, "runs"), { recursive: true });
  await cp(resolve("packages", "contracts", "fixtures", runId),
    join(profile, "runs", runId), { recursive: true });
  await mkdir(join(target, "node_modules", "electron", "dist"), { recursive: true });
  await mkdir(join(target, "renderer", "dist"), { recursive: true });
  await mkdir(join(target, "dist"), { recursive: true });
  await writeFile(join(target, "package.json"), JSON.stringify({ name: "math3d", main: "dist/main.js" }));
  await writeFile(join(target, "dist", "main.js"),
    "require('node:fs').appendFileSync(process.env.QLAB_MATH3D_CAPTURE, JSON.stringify({ argv: process.argv }) + '\\n');\n");
  await writeFile(join(target, "renderer", "dist", "index.html"), "<!doctype html>\n");
  await copyFile(process.execPath, fakeExecutable);
  const env = { ...process.env, QLAB_TEST_PROFILE: profile, QLAB_MATH3D_HOME: target,
    QLAB_MATH3D_CAPTURE: capture };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.QLAB_PYTHON;
  delete env.PYTHONPATH;
  app = await electron.launch({ executablePath: executable, env });
  const page = await app.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 60_000 });
  await page.getByTestId("result-state").filter({ hasText: "COMPUTED" }).waitFor({ timeout: 30_000 });
  assert.equal(await page.getByTestId("energy-low").textContent(), "-0.640312");
  assert.equal(await page.getByTestId("energy-high").textContent(), "0.640312");
  await assert.rejects(page.evaluate(({ id }) =>
    window.quantum.openQwzStudyInMath3D(id, "0".repeat(64), "new"), { id: runId }), /hash|changed/i);
  const handoff = await page.evaluate(({ id, hash }) =>
    window.quantum.openQwzStudyInMath3D(id, hash, "new"), { id: runId, hash: resultSha256 });
  assert.equal(handoff.launched, true);
  async function waitLaunches(count) {
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        const lines = (await readFile(capture, "utf8")).trim().split("\n");
        if (lines.length >= count) return lines.map(line => JSON.parse(line));
      } catch { /* Target may not have written its capture yet. */ }
      await new Promise(done => setTimeout(done, 100));
    }
    throw new Error(`Math3D capture did not record ${count} launches`);
  }
  const launch = (await waitLaunches(1))[0];
  const flag = launch.argv.indexOf("--quantum-study");
  assert.ok(flag >= 0);
  assert.equal(launch.argv[flag + 1], handoff.directory);
  assert.equal(launch.argv[flag + 2], "new");
  const manifestBytes = await readFile(join(handoff.directory, "study.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  assert.equal(manifest.schema, "quantum-study-handoff/v1");
  assert.equal(manifest.runId, runId);
  assert.equal(manifest.resultSha256, resultSha256);
  assert.deepEqual(manifest.scenes.map(scene => scene.role), ["curvature", "bands"]);
  const scenes = [];
  for (const declared of manifest.scenes) {
    const folder = join(handoff.directory, declared.folder);
    const sceneBytes = await readFile(join(folder, "scene.json"));
    const bundle = JSON.parse(await readFile(join(folder, "bundle.json"), "utf8"));
    const scene = JSON.parse(sceneBytes.toString("utf8"));
    const sceneSha256 = digest(sceneBytes);
    assert.equal(sceneSha256, bundle.scene.sha256);
    assert.equal(sceneSha256, golden[declared.role]);
    assert.equal(scene.id, declared.sceneId);
    assert.equal(scene.provenance.runId, runId);
    assert.equal(scene.provenance.resultSha256, resultSha256);
    for (const dataset of scene.datasets)
      assert.equal(digest(await readFile(join(folder, dataset.path))), dataset.sha256);
    scenes.push({ role: declared.role, sceneSha256 });
  }
  await page.locator('details[data-model-group="topology"] summary').click();
  await page.getByRole("button", { name: "Topological bands" }).click();
  await page.getByTestId("topology-lab").waitFor();
  await page.getByRole("combobox", { name: "Topology model" }).selectOption("qwz");
  await page.getByTestId("run-topology").click();
  await page.getByTestId("qwz-chern").filter({ hasText: "-1" }).waitFor({ timeout: 30_000 });
  const freshRunId = await page.getByTestId("workspace-run-id").innerText();
  assert.notEqual(freshRunId, runId);
  const fresh = await page.evaluate(id => window.quantum.inspectSavedRun(id), freshRunId);
  assert.equal(fresh.summary.operation, "topology");
  assert.equal(fresh.summary.model, "qwz");
  assert.equal(fresh.job.model.parameters.mass, -1);
  assert.equal(fresh.job.model.parameters.grid, 21);
  const freshResult = await page.evaluate(id => window.quantum.getTopologyRun(id), freshRunId);
  assert.equal(freshResult.analysis.kind, "qwz");
  assert.equal(freshResult.analysis.chern, -1);
  assert.equal(freshResult.analysis.bulkGap, 2);
  assert.equal(freshResult.analysis.gapClosed, false);
  const freshResultBytes = await readFile(join(profile, "runs", freshRunId, "result.json"));
  assert.equal(digest(freshResultBytes), fresh.hashes.result);
  await assert.rejects(page.evaluate(({ id }) =>
    window.quantum.openQwzStudyInMath3D(id, "0".repeat(64), "attach"), { id: freshRunId }), /hash|changed/i);
  assert.equal((await waitLaunches(1)).length, 1);
  const freshHandoff = await page.evaluate(({ id, hash }) =>
    window.quantum.openQwzStudyInMath3D(id, hash, "attach"),
    { id: freshRunId, hash: fresh.hashes.result });
  assert.equal(freshHandoff.launched, true);
  const freshLaunch = (await waitLaunches(2))[1];
  const freshFlag = freshLaunch.argv.indexOf("--quantum-study");
  assert.ok(freshFlag >= 0);
  assert.equal(freshLaunch.argv[freshFlag + 1], freshHandoff.directory);
  assert.equal(freshLaunch.argv[freshFlag + 2], "attach");
  const freshManifestBytes = await readFile(join(freshHandoff.directory, "study.json"));
  const freshManifest = JSON.parse(freshManifestBytes.toString("utf8"));
  assert.equal(freshManifest.runId, freshRunId);
  assert.equal(freshManifest.resultSha256, fresh.hashes.result);
  assert.deepEqual(freshManifest.scenes.map(scene => scene.role), ["curvature", "bands"]);
  const freshScenes = [];
  for (const declared of freshManifest.scenes) {
    const folder = join(freshHandoff.directory, declared.folder);
    const sceneBytes = await readFile(join(folder, "scene.json"));
    const bundle = JSON.parse(await readFile(join(folder, "bundle.json"), "utf8"));
    const scene = JSON.parse(sceneBytes.toString("utf8"));
    const sceneSha256 = digest(sceneBytes);
    assert.equal(sceneSha256, bundle.scene.sha256);
    assert.equal(scene.id, declared.sceneId);
    assert.equal(scene.provenance.runId, freshRunId);
    assert.equal(scene.provenance.resultSha256, fresh.hashes.result);
    const expectedArrays = declared.role === "curvature"
      ? { curvature: freshResult.analysis.berryCurvature }
      : { "band-energy-0": freshResult.analysis.lowerBand,
          "band-energy-1": freshResult.analysis.upperBand };
    for (const dataset of scene.datasets) {
      const bytes = await readFile(join(folder, dataset.path));
      assert.equal(digest(bytes), dataset.sha256);
      if (dataset.id in expectedArrays) {
        const actual = Array.from({ length: bytes.length / 8 }, (_, index) => bytes.readDoubleLE(index * 8));
        assert.deepEqual(actual, expectedArrays[dataset.id]);
      }
    }
    freshScenes.push({ role: declared.role, sceneSha256 });
  }
  process.stdout.write(JSON.stringify({
    schema: "theory-lab/qi40-packaged-producer-acceptance/v2",
    executableSha256, runId, resultSha256, manifestSha256: digest(manifestBytes), scenes,
    freshRun: { runId: freshRunId, resultSha256: fresh.hashes.result,
      mass: fresh.job.model.parameters.mass, grid: fresh.job.model.parameters.grid,
      chern: freshResult.analysis.chern, bulkGap: freshResult.analysis.bulkGap,
      manifestSha256: digest(freshManifestBytes), scenes: freshScenes },
    math3d: "capture-stub-only",
  }, null, 2) + "\n");
} finally {
  await app?.close();
  if (!resolve(root).startsWith(resolve(tmpdir()) + sep) || !root.includes("qi40-packaged-lab-"))
    throw new Error("Unsafe packaged QWZ acceptance cleanup path");
  await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}
