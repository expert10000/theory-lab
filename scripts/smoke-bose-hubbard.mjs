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
  await page.getByTestId("bose-hubbard-theory").waitFor();
  await page.getByTestId("open-companion-rb87-iii").waitFor();
  assert.equal(await page.getByTestId("open-companion-rb87-iii").isEnabled(),true);
  const chapters = await page.evaluate(() => window.quantum.listCompanionChapters());
  assert.equal(chapters.length,7);
  assert.equal(chapters.every(row=>row.available),true);
  await assert.rejects(page.evaluate(() => window.quantum.openCompanionChapter("../../missing")),/Unknown Companion chapter/);
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
  await page.getByTestId("view-bose-hubbard-scene").click();
  await page.getByTestId("scenes-page").waitFor();
  await page.getByTestId("scene-source").filter({ hasText: "VERIFIED SAVED BOSE–HUBBARD DIMER" }).waitFor();
  await page.getByTestId("scene-run-id").filter({ hasText: summaries[0].resultSha256 }).waitFor();
  assert.match(await page.getByTestId("scenes-page").textContent(), /bosons per site/);
  const scene = await page.evaluate(async ([id]) => window.quantum.getBoseHubbardScene(id, 0), [runId]);
  assert.equal(scene.scene.provenance.resultSha256, summaries[0].resultSha256);
  await page.getByRole("button", { name: /Back to dimer lab/ }).click();
  await page.getByTestId("bose-hubbard-lab").waitFor();
  await page.getByRole("button", { name: /Open N=3, U\/J=2/ }).click();
  await page.getByTestId("view-bose-hubbard-scene").click();
  await page.getByTestId("scene-run-id").filter({ hasText: summaries[0].resultSha256 }).waitFor();
  const resultFile = join(profile, "bose-hubbard-runs", runId, "result.json");
  const altered = JSON.parse(await readFile(resultFile, "utf8"));
  altered.states[0].oneBodyCoherence = .5;
  await writeFile(resultFile, JSON.stringify(altered, null, 2) + "\n");
  await page.getByLabel("Dimer eigenstate").selectOption("1");
  await page.getByRole("status").filter({ hasText: "integrity check" }).waitFor();
  assert.equal(await page.getByTestId("scene-run-id").count(), 0);
  await assert.rejects(page.evaluate(id => window.quantum.getBoseHubbardScene(id,0),runId),/integrity check/);
  console.log(`Bose-Hubbard desktop restart verified: ${runId}`);
} finally {
  if (desktop) await desktop.close();
  await rm(profile, { recursive: true, force: true });
}
