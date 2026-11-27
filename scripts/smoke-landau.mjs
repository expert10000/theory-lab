import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const profile = await mkdtemp(join(tmpdir(), "qlab-landau-desktop-"));
const env = { ...process.env, QLAB_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
let desktop;
async function open() {
  desktop = await electron.launch({ args: ["."], env });
  const page = await desktop.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 45000 });
  await page.getByTestId("open-ute2-landau").click();
  await page.getByTestId("ute2-landau-page").waitFor();
  assert.match(page.url(), /#view\/ute2\//);
  return page;
}
try {
  let page = await open();
  assert.match(await page.getByTestId("ute2-landau-page").textContent(), /not fitted to UTe₂/);
  await page.getByLabel("Landau b1").fill("0");
  assert.equal(await page.getByTestId("run-ute2-landau").isDisabled(), true);
  await page.getByLabel("Landau b1").fill("1");
  await page.getByTestId("run-ute2-landau").click();
  const result = page.getByTestId("ute2-landau-result");
  await result.waitFor({ timeout: 120000 });
  assert.match(await result.textContent(), /Global minimum: Mixed orders/);
  assert.match(await result.textContent(), /0\.595|0\.7715/);
  const rows = await page.evaluate(() => window.quantum.listLandauRuns());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].resultSha256.length, 64);
  const runId = rows[0].runId;
  await desktop.close(); desktop = null;
  page = await open();
  await page.getByRole("button", { name: /Open Mixed orders/ }).click();
  await page.getByTestId("ute2-landau-result").waitFor({ timeout: 120000 });
  assert.match(await page.getByTestId("ute2-landau-result").textContent(), new RegExp(runId));
  const resultFile = join(profile, "landau-runs", runId, "result.json");
  const changed = JSON.parse(await readFile(resultFile, "utf8"));
  changed.globalMinima = ["sc1"];
  await writeFile(resultFile, JSON.stringify(changed, null, 2) + "\n");
  await page.getByRole("button", { name: /Open Mixed orders/ }).click();
  await page.getByRole("alert").filter({ hasText: "integrity check" }).waitFor();
  assert.equal(await page.getByTestId("ute2-landau-result").count(), 0);
  await desktop.close(); desktop = null;
  page = await open();
  assert.equal(await page.getByRole("button", { name: /Open Mixed orders/ }).count(), 0);
  console.log(`Landau desktop restart and changed-source refusal verified: ${runId}`);
} finally {
  if (desktop) await desktop.close();
  await rm(profile, { recursive: true, force: true });
}
