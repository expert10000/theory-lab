/** Exercise Theory Lab's real QWZ handoff to a packaged Math3D executable.
 * Usage: node scripts/accept-qi40-direct-launch.mjs <Lab.exe> <Lab-sha256> <Math3D.exe> <Math3D-sha256> <retained-directory> <new-evidence-directory>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { _electron as electron } from "playwright";

const [labArg, labHash, math3dArg, math3dHash, retainedArg, outputArg] = process.argv.slice(2);
if (process.argv.length !== 8 || !labArg || !math3dArg || !retainedArg || !outputArg ||
    !/^[a-f0-9]{64}$/.test(labHash ?? "") || !/^[a-f0-9]{64}$/.test(math3dHash ?? ""))
  throw new Error("Pass Lab.exe/hash, Math3D.exe/hash, retained directory, and new evidence directory");
if (process.platform !== "win32") throw new Error("The direct launch acceptance requires Windows");
const lab = resolve(labArg);
const math3d = resolve(math3dArg);
const math3dProcessName = basename(math3d);
assert.match(math3dProcessName, /^Math3D(?: Dev)?\.exe$/, "Unsupported Math3D executable name");
const retained = resolve(retainedArg);
const output = resolve(outputArg);
async function shaFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
assert.equal(await shaFile(lab), labHash, "Lab executable hash mismatch");
assert.equal(await shaFile(math3d), math3dHash, "Math3D executable hash mismatch");
const verified = spawnSync(process.execPath, [resolve("scripts/verify-qi40-retained.mjs"), retained],
  { encoding: "utf8", timeout: 30_000 });
if (verified.status !== 0) throw new Error(`Retained input failed: ${verified.stderr || verified.stdout}`);
const source = JSON.parse(await readFile(join(retained, "freshRun", "manifest.json"), "utf8"));
const before = math3dProcesses();
const root = await mkdtemp(join(tmpdir(), "qi40-direct-launch-"));
const profile = join(root, "lab");
await mkdir(join(profile, "runs"), { recursive: true });
await cp(join(retained, "freshRun"), join(profile, "runs", source.runId), { recursive: true });
const env = { ...process.env, QLAB_TEST_PROFILE: profile, QLAB_MATH3D_HOME: math3d,
  MATH3D_E2E: "1", MATH3D_DEV_USER_DATA_DIR: join(root, "math3d"),
  MATH3D_SKIP_AUTOSAVE_RECOVERY: "1" };
delete env.ELECTRON_RUN_AS_NODE;
let app;
try {
  app = await electron.launch({ executablePath: lab, env });
  const page = await app.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 60_000 });
  await assert.rejects(page.evaluate(id => window.quantum.openQwzStudyInMath3D(
    id, "0".repeat(64), "new"), source.runId), /hash|changed/i);
  const handoff = await page.evaluate(({ id, hash }) =>
    window.quantum.openQwzStudyInMath3D(id, hash, "new"),
    { id: source.runId, hash: source.hashes.result });
  assert.equal(handoff.launched, true);
  assert.equal(handoff.manifest.runId, source.runId);
  assert.equal(handoff.manifest.resultSha256, source.hashes.result);
  assert.deepEqual(handoff.manifest.scenes.map(scene => scene.role), ["curvature", "bands"]);
  let launched;
  let renderer;
  for (let attempt = 0; attempt < 40; attempt++) {
    const processes = math3dProcesses();
    launched = processes.find(item => !before.some(old => old.ProcessId === item.ProcessId) &&
      (item.CommandLine?.startsWith(math3d) || item.CommandLine?.startsWith(`"${math3d}"`)) &&
      item.CommandLine?.includes(`--quantum-study ${handoff.directory} new`) &&
      !item.CommandLine?.includes(" --type="));
    renderer = launched && processes.find(item => item.ParentProcessId === launched.ProcessId &&
      item.CommandLine?.includes("--type=renderer"));
    if (launched && renderer) break;
    await new Promise(done => setTimeout(done, 250));
  }
  assert.ok(launched && renderer, "Math3D did not keep a renderer process for the exact study handoff");
  const parentRaw = execFileSync("powershell.exe", ["-NoProfile", "-Command",
    `Get-CimInstance Win32_Process -Filter 'ProcessId = ${Number(launched.ParentProcessId)}' | Select-Object ProcessId,ExecutablePath | ConvertTo-Json -Compress`],
  { encoding: "utf8", timeout: 15_000 });
  const parent = JSON.parse(parentRaw);
  assert.equal(parent.ExecutablePath.toLowerCase(), lab.toLowerCase(),
    "Math3D was not spawned by the packaged Lab process");
  const study = JSON.parse(await readFile(join(handoff.directory, "study.json"), "utf8"));
  assert.deepEqual(study, handoff.manifest);
  await mkdir(output);
  await cp(handoff.directory, join(output, "study"), { recursive: true });
  const files = [];
  async function collect(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = join(prefix, entry.name);
      if (entry.isDirectory()) await collect(join(directory, entry.name), relative);
      else if (entry.isFile()) files.push({ path: relative.replaceAll("\\", "/"),
        sha256: await shaFile(join(directory, entry.name)) });
      else throw new Error("Unsupported handoff evidence entry");
    }
  }
  await collect(join(output, "study"));
  files.sort((a, b) => a.path.localeCompare(b.path));
  const report = { schema: "theory-lab/qi40-direct-launch/v1",
    scope: "packaged-lab-to-unpacked-math3d-process",
    labExecutableSha256: labHash, math3dExecutableSha256: math3dHash,
    retainedAcceptanceSha256: await shaFile(join(retained, "acceptance.json")),
    runId: source.runId, resultSha256: source.hashes.result,
    sourceStudySha256: await shaFile(join(retained, "freshStudy", "study.json")),
    launchedStudySha256: await shaFile(join(output, "study", "study.json")),
    handoffDirectory: handoff.directory,
    process: { pid: launched.ProcessId, parentPid: launched.ParentProcessId,
      rendererPid: renderer.ProcessId, commandLine: launched.CommandLine },
    files };
  await writeFile(join(output, "acceptance.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
  const recheck = spawnSync(process.execPath,
    [resolve("scripts/verify-qi40-direct-launch.mjs"), lab, math3d, retained, output],
    { encoding: "utf8", timeout: 30_000 });
  if (recheck.status !== 0)
    throw new Error(`Direct launch evidence failed verification: ${recheck.stderr || recheck.stdout}`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const item of math3dProcesses().filter(item => !before.some(old => old.ProcessId === item.ProcessId) &&
    (item.CommandLine?.startsWith(math3d) || item.CommandLine?.startsWith(`"${math3d}"`)) &&
    !item.CommandLine?.includes(" --type="))) {
    try { execFileSync("taskkill", ["/PID", String(item.ProcessId), "/T", "/F"], { stdio: "ignore" }); }
    catch { /* The app may already have closed. */ }
  }
  await app?.close();
  if (!root.startsWith(resolve(tmpdir()) + sep) || !basename(root).startsWith("qi40-direct-launch-"))
    throw new Error("Unsafe direct-launch cleanup path");
  await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}

function math3dProcesses() {
  const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command",
    `@(Get-CimInstance Win32_Process -Filter "Name = '${math3dProcessName}'" | Select-Object ProcessId,ParentProcessId,CommandLine) | ConvertTo-Json -Compress`],
  { encoding: "utf8", timeout: 15_000 });
  const value = JSON.parse(raw || "[]");
  return Array.isArray(value) ? value : value ? [value] : [];
}
