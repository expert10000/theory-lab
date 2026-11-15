/** Exercise a retained QWZ study in an unpacked, hash-pinned Math3D candidate.
 * Usage: node scripts/accept-qi40-math3d.mjs <Math3D.exe> <exe-sha256> <retained-directory>
 *   [--candidate <candidate-manifest.json> --evidence <new-directory>]
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { _electron as electron } from "playwright";

const [exeArg, expectedHash, retainedArg, ...options] = process.argv.slice(2);
if (!exeArg || !/^[a-f0-9]{64}$/.test(expectedHash ?? "") || !retainedArg ||
    (options.length !== 0 && (options.length !== 4 || options[0] !== "--candidate" || options[2] !== "--evidence")))
  throw new Error("Pass Math3D.exe, lowercase SHA-256, retained directory, and optional --candidate manifest --evidence new-dir");
if (process.platform !== "win32") throw new Error("The packaged Math3D acceptance requires Windows");
const executable = resolve(exeArg);
const retained = resolve(retainedArg);
const verified = spawnSync(process.execPath, [resolve("scripts/verify-qi40-retained.mjs"), retained],
  { encoding: "utf8", timeout: 30_000 });
if (verified.status !== 0) throw new Error(`Retained input failed verification: ${verified.stderr || verified.stdout}`);
async function shaFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
assert.equal(await shaFile(executable), expectedHash, "Math3D executable hash mismatch");
let candidate;
if (options.length) {
  const manifestPath = resolve(options[1]);
  candidate = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(candidate.schema, "math3d/two-app-candidate/v1");
  for (const item of [candidate.math3d, candidate.theoryLab]) {
    assert.match(item.installerName, /^[A-Za-z0-9 ._-]+\.exe$/);
    assert.equal(await shaFile(join(dirname(manifestPath), item.installerName)), item.installerSha256,
      `${item.installerName} hash mismatch`);
  }
}
const study = JSON.parse(await readFile(join(retained, "freshStudy", "study.json"), "utf8"));
const acceptance = JSON.parse(await readFile(join(retained, "acceptance.json"), "utf8"));
assert.deepEqual(study.scenes.map(scene => scene.role), ["curvature", "bands"]);
const profile = await mkdtemp(join(tmpdir(), "qi40-math3d-"));
const env = { ...process.env, MATH3D_E2E: "1", MATH3D_DEV_USER_DATA_DIR: profile,
  MATH3D_SKIP_AUTOSAVE_RECOVERY: "1" };
delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  app = await electron.launch({ executablePath: executable,
    args: ["--quantum-study", join(retained, "freshStudy"), "new"], env });
  const page = await app.firstWindow();
  await page.getByRole("button", { name: "Open in new Project" }).waitFor({ timeout: 20_000 });
  assert.ok((await page.locator("body").innerText()).includes(study.runId));
  await page.getByRole("button", { name: "Open in new Project" }).click();
  await page.getByRole("button", { name: "Verify and view scene" }).first().waitFor({ timeout: 20_000 });
  const staged = await page.locator("body").innerText();
  assert.match(staged, /Both exact QWZ views staged/);
  assert.match(staged, /Quantum scenes \(2\)/);
  assert.equal(await page.getByRole("button", { name: "Verify and view scene" }).count(), 2);
  const viewed = [];
  const screenshots = [];
  for (const [index, scene] of study.scenes.entries()) {
    await page.getByRole("button", { name: "Verify and view scene" }).nth(index).click();
    const bundlePath = join(retained, "freshStudy", scene.folder);
    await page.getByText(`Bundle: ${bundlePath}`, { exact: true }).waitFor({ timeout: 20_000 });
    const detail = await page.locator("body").innerText();
    assert.match(detail, /Verified quantum-scene\/v1 · qwz/);
    assert.ok(detail.includes(study.resultSha256));
    if (scene.role === "curvature") {
      assert.match(detail, /Current verified view: Berry curvature/);
      assert.ok(detail.includes(`Producer Chern number: ${acceptance.freshRun.chern} · verified`));
      assert.ok(detail.includes(`curvature-grid: ${acceptance.freshRun.grid ** 2} × 3`));
      assert.match(detail, /Source axes: kx, ky, Berry curvature/);
      assert.match(detail, /Source coordinate units: rad \/ lattice constant, rad \/ lattice constant, dimensionless \(a=1\)/);
    } else {
      assert.ok(detail.includes("QWZ supplied energy bands"), "Bands view was not shown");
      assert.ok(detail.includes(`Supplied bulk gap: ${acceptance.freshRun.bulkGap} normalized energy`));
      assert.ok(detail.includes(`band-energy-0: ${acceptance.freshRun.grid ** 2} × 1`));
      assert.ok(detail.includes(`band-energy-1: ${acceptance.freshRun.grid ** 2} × 1`));
      assert.match(detail, /Source axes: kx, ky, energy/);
      assert.match(detail, /Source coordinate units: rad \/ lattice constant, rad \/ lattice constant, normalized energy \(hbar=1\)/);
    }
    viewed.push(scene.role);
    if (candidate) {
      await page.waitForTimeout(750);
      screenshots.push({ role: scene.role, bytes: await page.screenshot({ fullPage: true }) });
    }
    await page.getByRole("button", { name: "Close", exact: true }).last().click();
  }
  const report = { schema: "theory-lab/qi40-math3d-consumer/v1", executableSha256: expectedHash,
    runId: study.runId, resultSha256: study.resultSha256, stagedViews: 2, viewed };
  if (candidate) {
    report.candidate = { buildRunId: candidate.buildRunId, math3d: candidate.math3d,
      theoryLab: candidate.theoryLab };
    report.retained = { acceptanceSha256: await shaFile(join(retained, "acceptance.json")),
      ledgerSha256: await shaFile(join(retained, "artifact-hashes.json")) };
    report.screenshots = screenshots.map(({ role, bytes }) => ({ role, file: `${role}.png`,
      sha256: createHash("sha256").update(bytes).digest("hex") }));
    const output = resolve(options[3]);
    await mkdir(output);
    for (const { role, bytes } of screenshots) await writeFile(join(output, `${role}.png`), bytes);
    await writeFile(join(output, "acceptance.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (app) await app.close();
  await rm(profile, { recursive: true, force: true });
}
