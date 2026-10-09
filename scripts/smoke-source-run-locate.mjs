import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { _electron as electron } from "playwright";

const root = await mkdtemp(join(tmpdir(), "qlab-source-run-locate-"));
const profile = join(root, "profile");
await mkdir(profile);
const env = { ...process.env, QLAB_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const launch = (args = ["."]) => electron.launch({ args, cwd: resolve("."), env });
let desktop = await launch();
try {
  let page = await desktop.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 45000 });
  await page.getByRole("button", { name: /Rabi dynamics/ }).click();
  await page.getByRole("combobox", { name: "Dynamics engine" }).selectOption("native");
  await page.getByTestId("run-evolution").click();
  await page.getByTestId("evolution-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  const runId = (await page.getByTestId("workspace-run-id").innerText()).trim();
  const scene = await page.evaluate(id => window.quantum.getScene(id, "standard"), runId);
  const hash = scene.scene.provenance.resultSha256;
  assert.match(hash, /^[a-f0-9]{64}$/);
  await desktop.close();

  desktop = await launch([".", "--quantum-source-run", runId, hash]);
  page = await desktop.firstWindow();
  await page.getByTestId("workspace-message").filter({ hasText: `Verified Rabi dynamics evolution reopened · ${runId}` })
    .waitFor({ timeout: 30000 });
  assert.equal((await page.getByTestId("workspace-run-id").innerText()).trim(), runId);
  const consumed = await page.evaluate(() => window.quantum.consumeSourceRun());
  assert.equal(consumed, null, "launch identity is consumed exactly once");
  await desktop.close();

  desktop = await launch([".", "--quantum-source-run", runId, "0".repeat(64)]);
  page = await desktop.firstWindow();
  await page.getByTestId("workspace-message").filter({ hasText: /Source run unavailable:.*hash does not match/ })
    .waitFor({ timeout: 30000 });
  await desktop.close();

  desktop = await launch([".", "--quantum-source-run", "run-missing", hash]);
  page = await desktop.firstWindow();
  await page.getByTestId("workspace-message").filter({ hasText: /Source run unavailable:/ })
    .waitFor({ timeout: 30000 });
  await desktop.close();

  const resultPath = join(profile, "runs", runId, "result.json");
  const savedText = await readFile(resultPath, "utf8");
  await writeFile(resultPath, `${savedText} `);
  desktop = await launch([".", "--quantum-source-run", runId, hash]);
  page = await desktop.firstWindow();
  await page.getByTestId("workspace-message").filter({ hasText: /Source run unavailable:.*integrity/ })
    .waitFor({ timeout: 30000 });
  await desktop.close();
  await writeFile(resultPath, savedText);
  console.log("PASS: exact source-run reopen, one-use intent, wrong hash, missing run and tamper refusal");
} finally {
  await desktop.close().catch(() => {});
  const safeRoot = resolve(root);
  if (!safeRoot.startsWith(resolve(tmpdir()) + sep) || !safeRoot.includes("qlab-source-run-locate-"))
    throw new Error("Unsafe source-run acceptance cleanup path");
  await rm(safeRoot, { recursive: true, force: true });
}
