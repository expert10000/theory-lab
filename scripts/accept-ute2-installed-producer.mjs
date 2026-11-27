/** Fresh installed Lab producer receipt for the bounded class-D toy. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { _electron as electron } from "playwright";

const [executable, outputArgument] = process.argv.slice(2);
if (!executable || !isAbsolute(executable) || !outputArgument || !isAbsolute(outputArgument))
  throw new Error("Pass absolute installed Lab executable and new evidence directory");
const output = resolve(outputArgument), profile = join(output, "profile"), exports = join(output, "exports");
await mkdir(output); await mkdir(profile); await mkdir(exports);
const hashFile = async path => {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
};
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const env = { ...process.env, QLAB_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE; delete env.QLAB_PYTHON; delete env.PYTHONPATH;
const launch = () => electron.launch({ executablePath: executable, cwd: dirname(executable),
  args: [`--user-data-dir=${profile}`], env });
let app = await launch();
try {
  let page = await app.firstWindow();
  assert.equal(await app.evaluate(({ app }) => app.isPackaged), true);
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 90_000 });
  await page.getByTestId("open-ute2-landau").click();
  await page.getByTestId("ute2-topology-page").waitFor();
  await page.getByTestId("run-ute2-topology").click();
  await page.getByTestId("ute2-topology-status").filter({ hasText: "defined for this toy" }).waitFor({ timeout: 120_000 });
  const bulkRows = await page.evaluate(() => window.quantum.listUte2TopologyRuns());
  assert.equal(bulkRows.length, 1);
  const bulk = bulkRows[0];
  const bulkResult = await page.evaluate(id => window.quantum.getUte2TopologyRun(id), bulk.runId);
  assert.equal(bulkResult.chern, -1); assert.equal(bulkResult.invariantStatus, "defined");
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }); }, exports);
  await page.getByTestId("export-ute2-topology-scene").click();
  await page.getByRole("status").filter({ hasText: "Exported verified scene bundle" }).waitFor({ timeout: 60_000 });
  const bulkScene = join(exports, `ute2-topology-${bulk.resultSha256.slice(0, 24)}.qscene`);
  const bulkJson = JSON.parse(await readFile(join(bulkScene, "scene.json"), "utf8"));
  assert.equal(bulkJson.provenance.runId, bulk.runId);
  assert.equal(bulkJson.provenance.resultSha256, bulk.resultSha256);
  assert.equal(bulkJson.topology.invariants[0].value, -1);
  await page.getByTestId("run-ute2-edge").click();
  await page.getByTestId("ute2-edge-status").filter({ hasText: "localized in-gap pair" }).waitFor({ timeout: 120_000 });
  const edgeRows = await page.evaluate(() => window.quantum.listUte2EdgeRuns());
  assert.equal(edgeRows.length, 1);
  const edge = edgeRows[0];
  assert.equal(edge.source.resultSha256, bulk.resultSha256);
  await page.getByTestId("export-ute2-edge-scene").click();
  await page.getByRole("status").filter({ hasText: "Exported verified scene bundle" }).last().waitFor({ timeout: 60_000 });
  const edgeScene = join(exports, `ute2-edge-${edge.resultSha256.slice(0, 24)}.qscene`);
  const edgeJson = JSON.parse(await readFile(join(edgeScene, "scene.json"), "utf8"));
  assert.equal(edgeJson.provenance.parameters.bulkResultSha256, bulk.resultSha256);
  assert.equal(edgeJson.objects.length, 2);
  await page.screenshot({ path: join(output, "lab-topology.png"), fullPage: true });
  await app.close();
  app = await launch(); page = await app.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 90_000 });
  await page.getByTestId("open-ute2-landau").click();
  await page.getByRole("button", { name: /Open μ=-2, Δₚ=0\.8 · defined/ }).click();
  await page.getByTestId("ute2-topology-status").filter({ hasText: "defined for this toy" }).waitFor();
  assert.equal((await page.getByTestId("ute2-topology-result").innerText()).includes(bulk.runId), true);
  const resultFile = join(profile, "ute2-topology-runs", bulk.runId, "result.json");
  assert.equal(await hashFile(resultFile), bulk.resultSha256);
  const record = { schema: "theory-lab/ute2-installed-producer/v1", status: "passed", sourceCommit,
    executableSha256: await hashFile(executable), workerSha256: await hashFile(join(dirname(executable), "resources", "quantum-worker", "quantum-worker.exe")),
    appAsarSha256: await hashFile(join(dirname(executable), "resources", "app.asar")),
    bulk: { runId: bulk.runId, resultSha256: bulk.resultSha256, scene: bulkScene,
      sceneSha256: await hashFile(join(bulkScene, "scene.json")), chern: -1, bulkGap: bulkResult.bulkGap },
    edge: { runId: edge.runId, resultSha256: edge.resultSha256, scene: edgeScene,
      sceneSha256: await hashFile(join(edgeScene, "scene.json")), parentResultSha256: bulk.resultSha256 },
    retainedResultSha256: await hashFile(resultFile), profile };
  await writeFile(join(output, "producer.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(`Installed Lab class-D producer passed: ${bulk.runId} → ${bulkScene}`);
} finally { await app.close(); }
