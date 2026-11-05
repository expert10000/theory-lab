import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const profile = await mkdtemp(join(tmpdir(), "qlab-qec-smoke-"));
const env = { ...process.env, QLAB_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({ args: ["."], cwd: resolve("."), env });
try {
  const page = await app.firstWindow();
  await page.getByTestId("open-atlas").click();
  const viewer = page.getByTestId("qec-syndrome-viewer");
  await viewer.getByTestId("qec-decoder-result").waitFor({ timeout: 15000 });
  assert.match(await viewer.getByTestId("qec-decoder-result").innerText(), /Residual logical X: flipped/);
  await viewer.getByRole("button", { name: "r2 · 01" }).click();
  assert.match(await viewer.getByTestId("qec-selected-round").innerText(), /new defects at stabilizers \[0\]/);
  console.log("QEC desktop evidence passed");
} finally {
  await app.close();
  if (dirname(profile) === resolve(tmpdir())) await rm(profile, { recursive: true, force: true });
}
