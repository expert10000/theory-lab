/** Installed same-product Lab upgrade/rollback phase. Use a disposable profile. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { _electron as electron } from "playwright";

const [phase, executable, profileArgument, evidenceArgument, seedArgument] = process.argv.slice(2);
assert.ok(["seed", "verify", "rollback"].includes(phase));
assert.ok([executable, profileArgument, evidenceArgument].every(path => path && isAbsolute(path)));
const profile = resolve(profileArgument);
const evidence = resolve(evidenceArgument);
await mkdir(profile, { recursive: true });
const sha = async path => {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
};
const env = { ...process.env, QLAB_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE; delete env.QLAB_PYTHON; delete env.PYTHONPATH;
const app = await electron.launch({ executablePath: executable, cwd: dirname(executable),
  args: [`--user-data-dir=${profile}`], env });
try {
  const page = await app.firstWindow();
  assert.equal(await app.evaluate(({ app }) => app.isPackaged), true);
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 90_000 });
  let seed;
  if (phase === "seed") {
    await page.getByRole("button", { name: /Run spectrum/ }).click();
    await page.getByTestId("workspace-run-id").waitFor({ timeout: 90_000 });
    const run = (await page.evaluate(() => window.quantum.listRuns())).find(row => row.operation === "diagonalize");
    assert.ok(run?.runId);
    const resultPath = join(profile, "runs", run.runId, "result.json");
    seed = { runId: run.runId, resultSha256: await sha(resultPath) };
  } else {
    assert.ok(seedArgument && isAbsolute(seedArgument));
    seed = JSON.parse(await readFile(seedArgument, "utf8")).legacyRun;
    const rows = await page.evaluate(() => window.quantum.listRuns());
    assert.ok(rows.some(row => row.runId === seed.runId));
    const reopened = await page.evaluate(id => window.quantum.getSpectrumRun(id), seed.runId);
    assert.equal(reopened.runId, seed.runId);
    assert.equal(await sha(join(profile, "runs", seed.runId, "result.json")), seed.resultSha256);
  }
  let topology = null;
  if (phase === "verify") {
    await page.getByTestId("open-ute2-landau").click();
    await page.getByTestId("run-ute2-topology").click();
    await page.getByTestId("ute2-topology-status").filter({ hasText: "defined for this toy" }).waitFor({ timeout: 120_000 });
    const [run] = await page.evaluate(() => window.quantum.listUte2TopologyRuns());
    assert.ok(run?.runId);
    const result = await page.evaluate(id => window.quantum.getUte2TopologyRun(id), run.runId);
    assert.equal(result.chern, -1);
    assert.equal(await sha(join(profile, "ute2-topology-runs", run.runId, "result.json")), run.resultSha256);
    topology = { runId: run.runId, resultSha256: run.resultSha256, chern: result.chern, bulkGap: result.bulkGap };
  }
  const record = { schema: "theory-lab/ute2-installed-upgrade-phase/v1", phase, status: "passed",
    executableSha256: await sha(executable), appAsarSha256: await sha(join(dirname(executable), "resources", "app.asar")),
    legacyRun: seed, topology };
  await writeFile(evidence, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(`${phase} passed: ${seed.runId}${topology ? `; ${topology.runId}` : ""}`);
} finally { await app.close(); }
