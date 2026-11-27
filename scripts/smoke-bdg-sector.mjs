import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const profile = await mkdtemp(join(tmpdir(), "qlab-bdg-desktop-"));
const env = {...process.env, QLAB_TEST_PROFILE: profile};
delete env.ELECTRON_RUN_AS_NODE;
let desktop;
async function open() {
  desktop = await electron.launch({args:["."], env});
  const page = await desktop.firstWindow();
  await page.getByTestId("worker-status").filter({hasText:"READY"}).waitFor({timeout:45000});
  await page.getByTestId("open-ute2-landau").click();
  await page.getByTestId("ute2-bdg-sector-page").waitFor();
  return page;
}
try {
  let page = await open();
  assert.match(await page.getByTestId("ute2-bdg-sector-page").textContent(), /not a UTe₂ dispersion/);
  await page.getByLabel("BdG points").fill("100");
  assert.equal(await page.getByTestId("run-ute2-bdg").isDisabled(), true);
  await page.getByLabel("BdG points").fill("101");
  await page.getByTestId("run-ute2-bdg").click();
  await page.getByTestId("ute2-bdg-result").waitFor();
  assert.match(await page.getByTestId("ute2-bdg-result").textContent(), /Minimum E\+: 0\.8000/);
  const rows = await page.evaluate(() => window.quantum.listBdGSectorRuns());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].resultSha256.length, 64);
  const runId = rows[0].runId;
  await desktop.close(); desktop = null;
  page = await open();
  await page.getByRole("button", {name:/Open \|Δ\|=0\.8/}).click();
  await page.getByTestId("ute2-bdg-result").waitFor();
  assert.match(await page.getByTestId("ute2-bdg-result").textContent(), new RegExp(runId));
  const file = join(profile, "bdg-sector-runs", runId, "result.json");
  const changed = JSON.parse(await readFile(file,"utf8"));
  changed.samples[50].ePlus += .1;
  await writeFile(file, JSON.stringify(changed,null,2)+"\n");
  await page.getByRole("button", {name:/Open \|Δ\|=0\.8/}).click();
  await page.getByRole("alert").filter({hasText:"integrity check"}).waitFor();
  assert.equal(await page.getByTestId("ute2-bdg-result").count(), 0);
  await desktop.close(); desktop = null;
  page = await open();
  assert.equal(await page.getByRole("button", {name:/Open \|Δ\|=0\.8/}).count(), 0);
  console.log(`BdG desktop restart and changed-source refusal verified: ${runId}`);
} finally {
  if (desktop) await desktop.close();
  await rm(profile,{recursive:true,force:true});
}
