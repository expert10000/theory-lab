/** Confirm installed Lab refuses a changed saved bulk result and its dependent strip. */
import assert from "node:assert/strict";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { _electron as electron } from "playwright";

const [executable, producerPath, outputArgument] = process.argv.slice(2);
if (![executable, producerPath, outputArgument].every(path => path && isAbsolute(path)))
  throw new Error("Pass absolute installed Lab executable, producer receipt, and new output directory");
const producer = JSON.parse(await readFile(producerPath, "utf8"));
assert.equal(producer.status, "passed");
const output = resolve(outputArgument), profile = join(output, "profile");
await mkdir(output);
await cp(producer.profile, profile, { recursive: true });
const resultPath = join(profile, "ute2-topology-runs", producer.bulk.runId, "result.json");
const changed = JSON.parse(await readFile(resultPath, "utf8"));
changed.bulkGap += 0.1;
await writeFile(resultPath, JSON.stringify(changed, null, 2) + "\n");
const env = { ...process.env, QLAB_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE; delete env.QLAB_PYTHON; delete env.PYTHONPATH;
const app = await electron.launch({ executablePath: executable, cwd: dirname(executable),
  args: [`--user-data-dir=${profile}`], env });
try {
  assert.equal(await app.evaluate(({ app }) => app.isPackaged), true);
  const page = await app.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 90_000 });
  const bulkRows = await page.evaluate(() => window.quantum.listUte2TopologyRuns());
  const edgeRows = await page.evaluate(() => window.quantum.listUte2EdgeRuns());
  assert.equal(bulkRows.some(row => row.runId === producer.bulk.runId), false);
  assert.equal(edgeRows.some(row => row.runId === producer.edge.runId), false);
  await assert.rejects(page.evaluate(id => window.quantum.getUte2TopologyRun(id), producer.bulk.runId), /integrity/i);
  await assert.rejects(page.evaluate(id => window.quantum.getUte2EdgeRun(id), producer.edge.runId), /integrity/i);
  await writeFile(join(output, "mutation.json"), JSON.stringify({
    schema: "theory-lab/ute2-installed-source-mutation/v1", status: "passed",
    bulkRunId: producer.bulk.runId, edgeRunId: producer.edge.runId,
    changedFile: "ute2-topology-runs/<runId>/result.json",
    bulkWithheld: true, dependentStripWithheld: true,
  }, null, 2) + "\n", { flag: "wx" });
  console.log("Installed Lab refused changed bulk source and dependent finite strip");
} finally { await app.close(); }
