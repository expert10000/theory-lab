/** Exercise a retained QWZ study in an unpacked, hash-pinned Math3D candidate.
 * Usage: node scripts/accept-qi40-math3d.mjs <Math3D.exe> <exe-sha256> <retained-directory>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { _electron as electron } from "playwright";

const [exeArg, expectedHash, retainedArg] = process.argv.slice(2);
if (process.argv.length !== 5 || !exeArg || !/^[a-f0-9]{64}$/.test(expectedHash ?? "") || !retainedArg)
  throw new Error("Pass Math3D.exe, its lowercase SHA-256, and a retained QI-40 directory");
if (process.platform !== "win32") throw new Error("The packaged Math3D acceptance requires Windows");
const executable = resolve(exeArg);
const retained = resolve(retainedArg);
const verified = spawnSync(process.execPath, [resolve("scripts/verify-qi40-retained.mjs"), retained],
  { encoding: "utf8", timeout: 30_000 });
if (verified.status !== 0) throw new Error(`Retained input failed verification: ${verified.stderr || verified.stdout}`);
const hash = createHash("sha256");
for await (const chunk of createReadStream(executable)) hash.update(chunk);
assert.equal(hash.digest("hex"), expectedHash, "Math3D executable hash mismatch");
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
    } else {
      assert.ok(detail.includes("QWZ supplied energy bands"), "Bands view was not shown");
      assert.ok(detail.includes(`Supplied bulk gap: ${acceptance.freshRun.bulkGap} normalized energy`));
      assert.ok(detail.includes(`band-energy-0: ${acceptance.freshRun.grid ** 2} × 1`));
      assert.ok(detail.includes(`band-energy-1: ${acceptance.freshRun.grid ** 2} × 1`));
      assert.match(detail, /Source axes: kx, ky, energy/);
    }
    viewed.push(scene.role);
    await page.getByRole("button", { name: "Close", exact: true }).last().click();
  }
  console.log(JSON.stringify({ schema: "theory-lab/qi40-math3d-consumer/v1", executableSha256: expectedHash,
    runId: study.runId, resultSha256: study.resultSha256, stagedViews: 2, viewed }, null, 2));
} finally {
  if (app) await app.close();
  await rm(profile, { recursive: true, force: true });
}
