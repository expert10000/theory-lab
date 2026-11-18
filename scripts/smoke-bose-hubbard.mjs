import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const profile = await mkdtemp(join(tmpdir(), "qlab-bh-desktop-"));
const env = { ...process.env, QLAB_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
let desktop;
async function openDimer() {
  desktop = await electron.launch({ args: ["."], env });
  const page = await desktop.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 45000 });
  await page.getByTestId("open-atlas").click();
  await page.getByLabel("Search Atlas").fill("bose_hubbard");
  await page.getByRole("button", { name: /Bose-Hubbard model/ }).click();
  await page.getByTestId("bose-hubbard-lab").waitFor();
  return page;
}
try {
  let page = await openDimer();
  await page.getByLabel("Dimer particles N").fill("3");
  await page.getByLabel("Dimer interaction U over J").fill("2");
  await page.getByTestId("run-bose-hubbard").click();
  await page.getByTestId("bose-hubbard-result").waitFor({ timeout: 45000 });
  let summaries = await page.evaluate(() => window.quantum.listBoseHubbardRuns());
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].particles, 3);
  const runId = summaries[0].runId;
  await desktop.close(); desktop = undefined;

  page = await openDimer();
  await page.getByRole("button", { name: /Open N=3, U\/J=2/ }).click();
  await page.getByTestId("bose-hubbard-result").waitFor();
  assert.match(await page.getByTestId("bose-hubbard-result").textContent(), new RegExp(runId));
  summaries = await page.evaluate(() => window.quantum.listBoseHubbardRuns());
  assert.equal(summaries[0].resultSha256.length, 64);
  const resultFile = join(profile, "bose-hubbard-runs", runId, "result.json");
  const altered = JSON.parse(await readFile(resultFile, "utf8"));
  altered.states[0].oneBodyCoherence = .5;
  await writeFile(resultFile, JSON.stringify(altered, null, 2) + "\n");
  await page.getByRole("button", { name: /Open N=3, U\/J=2/ }).click();
  await page.getByRole("alert").filter({ hasText: "integrity check" }).waitFor();
  assert.equal(await page.getByTestId("bose-hubbard-result").count(), 0);
  console.log(`Bose-Hubbard desktop restart verified: ${runId}`);
} finally {
  if (desktop) await desktop.close();
  await rm(profile, { recursive: true, force: true });
}
