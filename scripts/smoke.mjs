import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({ args: ["."], env });
try {
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page
    .getByTestId("worker-status")
    .filter({ hasText: "READY" })
    .waitFor({ timeout: 45000 });
  await page
    .getByTestId("result-state")
    .filter({ hasText: "COMPUTED" })
    .waitFor();
  assert.equal(await page.getByTestId("energy-low").textContent(), "-0.640312");
  assert.equal(await page.getByTestId("energy-high").textContent(), "0.640312");
  const isolation = await page.evaluate(() => ({
    require: typeof window.require,
    process: typeof window.process,
    keys: Object.keys(window.quantum).sort(),
  }));
  assert.deepEqual(isolation, {
    require: "undefined",
    process: "undefined",
    keys: [
      "cancel",
      "evolve",
      "getCapabilities",
      "getStatus",
      "onProgress",
      "readData",
      "restart",
      "run",
    ],
  });
  const prefs = await app.evaluate(({ BrowserWindow }) => {
    const prefs =
      BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return {
      sandbox: prefs.sandbox,
      contextIsolation: prefs.contextIsolation,
      nodeIntegration: prefs.nodeIntegration,
      webSecurity: prefs.webSecurity,
    };
  });
  assert.deepEqual(prefs, {
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    webSecurity: true,
  });
  const rejected = await page.evaluate(async () => {
    try {
      await window.quantum.run({ schema: "quantum-job/v2" });
      return false;
    } catch {
      return true;
    }
  });
  assert.ok(rejected, "IPC must validate renderer input");
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({
    path: "artifacts/desktop-spectrum.png",
    fullPage: true,
  });
  await page.locator("#delta").fill("3");
  await page.locator("#omega").fill("4");
  await page
    .getByTestId("result-state")
    .filter({ hasText: "OUT OF DATE" })
    .waitFor();
  assert.equal(
    await page.getByTestId("energy-low").textContent(),
    "-0.640312",
    "old result must remain labelled with its old parameters",
  );
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="energy-high"]').textContent ===
      "2.500000",
  );
  await page.locator("#delta").fill("");
  assert.ok(
    await page.getByRole("button", { name: "Run spectrum" }).isDisabled(),
  );
  await page.locator("#delta").fill("0");
  await page.locator("#omega").fill("0");
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="energy-high"]').textContent ===
      "0.000000",
  );
  await page.getByRole("tab", { name: "Hamiltonian", exact: true }).click();
  assert.ok(await page.getByText("Every term, explicit.").isVisible());
  await page.getByRole("tab", { name: "Roadmap", exact: true }).click();
  assert.ok(
    await page
      .getByText("Foundation & first spectrum", { exact: true })
      .isVisible(),
  );
  await page.getByRole("tab", { name: "Spectrum", exact: true }).click();
  await page.getByRole("button", { name: "Restore smoke values" }).click();
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="energy-high"]').textContent ===
      "0.640312",
  );
  await page
    .getByRole("button", { name: "Restart worker", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restart worker", exact: true })
    .waitFor();
  await page
    .getByTestId("worker-status")
    .filter({ hasText: "READY" })
    .waitFor();
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page
    .getByTestId("result-state")
    .filter({ hasText: "COMPUTED" })
    .waitFor();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1050, 700),
  );
  await page.waitForFunction(() => innerWidth < 1100);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(
    overflow,
    false,
    "minimum window width should not overflow horizontally",
  );
  const geometry = await page.evaluate(() => ({
    bottom: document.querySelector(".statusbar").getBoundingClientRect().bottom,
    height: innerHeight,
  }));
  assert.ok(
    geometry.bottom <= geometry.height + 1,
    `worker status stays visible at minimum window height: ${JSON.stringify(geometry)}`,
  );
  await page.screenshot({
    path: "artifacts/desktop-compact.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Dynamics", exact: true }).click();
  await page.getByTestId("run-evolution").click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "COMPLETE" })
    .waitFor({ timeout: 30000 });
  assert.ok(
    await page
      .getByRole("img", { name: /QuTiP population and Pauli/ })
      .isVisible(),
  );
  await page.screenshot({
    path: "artifacts/desktop-dynamics.png",
    fullPage: true,
  });
  await page.getByLabel("Frequency ω").fill("1.1");
  await page
    .getByTestId("dynamics-result-state")
    .filter({ hasText: "OUT OF DATE" })
    .waitFor();
  await page.getByLabel("Samples").fill("50000");
  await page.getByLabel("End time T").fill("1000");
  await page.getByTestId("run-evolution").click();
  await page.getByRole("button", { name: "Cancel job" }).click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "CANCELLED" })
    .waitFor({ timeout: 30000 });
  assert.match(await page.getByTestId("worker-status").textContent(), /READY/);
  await page.getByRole("button", { name: "Landau–Zener" }).click();
  await page.getByLabel("Sweep rate v").waitFor();
  await page.getByTestId("run-evolution").click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "COMPLETE" })
    .waitFor({ timeout: 30000 });
  await page.screenshot({
    path: "artifacts/desktop-landau-zener.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Electron → validated IPC → Python → QuTiP → spectrum and evolution; binary data, stale results, cancellation, restart, sandbox and compact layout.",
  );
} finally {
  await app.close();
}
