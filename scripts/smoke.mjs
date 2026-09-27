import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({ args: ["."], env });
let preservedRunId = null;
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
      "cavity",
      "evolve",
      "exportRun",
      "getCapabilities",
      "getStatus",
      "lindblad",
      "listRuns",
      "loadWorkspace",
      "onProgress",
      "readData",
      "restart",
      "run",
      "saveWorkspace",
      "sweep",
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
  await page.getByRole("tab", { name: "Backend", exact: true }).click();
  assert.ok(await page.getByTestId("backend-page").isVisible());
  assert.ok(
    await page.getByText("Native NumPy / SciPy", { exact: true }).isVisible(),
  );
  assert.ok(
    await page.getByText("quantum-data/v1", { exact: true }).isVisible(),
  );
  await page.screenshot({
    path: "artifacts/desktop-backend.png",
    fullPage: true,
  });
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
  await page
    .getByRole("combobox", { name: "Spectrum engine" })
    .selectOption("compare");
  await page
    .getByTestId("result-state")
    .filter({ hasText: "OUT OF DATE" })
    .waitFor();
  await page.getByRole("button", { name: "Compare spectrum" }).click();
  await page.getByTestId("spectrum-comparison").waitFor();
  assert.ok(
    Number(await page.getByTestId("max-energy-difference").textContent()) <
      1e-10,
  );
  await page.screenshot({
    path: "artifacts/desktop-spectrum-compare.png",
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Spectrum engine" })
    .selectOption("native");
  await page.getByRole("button", { name: "Run spectrum" }).click();
  await page
    .getByTestId("result-state")
    .filter({ hasText: "COMPUTED" })
    .waitFor();
  assert.ok(await page.getByText(/Native · Δ = 1, Ω = 0.8/).isVisible());
  await page
    .getByRole("combobox", { name: "Spectrum engine" })
    .selectOption("qutip");
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
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1440, 900),
  );
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
  const cursor = page.getByRole("slider", { name: "Time cursor" });
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = 0.0000",
  );
  assert.equal(await page.getByTestId("population-0").textContent(), "1.0000");
  assert.equal(await page.getByTestId("bloch-z").textContent(), "1.0000");
  assert.equal(
    await page.getByTestId("rho-00").textContent(),
    "1.0000 + 0.0000i",
  );
  assert.ok(
    (await page.locator('[data-testid="bloch-canvas"] canvas').count()) +
      (await page.locator(".bloch-fallback").count()) >
      0,
    "Bloch view should render WebGL or its accessible fallback",
  );
  await cursor.focus();
  await cursor.press("End");
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = 20.0000",
  );
  assert.equal(
    await page.getByTestId("chart-time-cursor").getAttribute("x1"),
    "750",
  );
  const p0 = Number(await page.getByTestId("population-0").textContent());
  const p1 = Number(await page.getByTestId("population-1").textContent());
  const z = Number(await page.getByTestId("bloch-z").textContent());
  assert.ok(Math.abs(p0 + p1 - 1) < 0.001);
  assert.ok(Math.abs(p0 - p1 - z) < 0.001);
  const chart = page.getByRole("img", {
    name: /QuTiP population and Pauli/,
  });
  await chart.scrollIntoViewIfNeeded();
  const chartBox = await chart.boundingBox();
  await page.mouse.click(
    chartBox.x + chartBox.width / 2,
    chartBox.y + chartBox.height / 2,
  );
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = 10.0000",
  );
  await page.screenshot({
    path: "artifacts/desktop-dynamics.png",
    fullPage: true,
  });
  await page.getByLabel("Drive frequency ω", { exact: true }).fill("1.1");
  await page
    .getByTestId("dynamics-result-state")
    .filter({ hasText: "OUT OF DATE" })
    .waitFor();
  await page.getByLabel("Samples", { exact: true }).fill("50000");
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
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = -10.0000",
  );
  await page.getByRole("slider", { name: "Time cursor" }).focus();
  await page.getByRole("slider", { name: "Time cursor" }).press("End");
  assert.equal(
    await page.getByTestId("selected-time").textContent(),
    "t = 10.0000",
  );
  await page.screenshot({
    path: "artifacts/desktop-landau-zener.png",
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Dynamics engine" })
    .selectOption("compare");
  await page.getByTestId("run-evolution").click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "COMPLETE" })
    .waitFor({ timeout: 30000 });
  await page.getByTestId("evolution-comparison").waitFor();
  assert.ok(
    Number(await page.getByTestId("max-observable-difference").textContent()) <
      1e-3,
  );
  assert.ok(
    Number(await page.getByTestId("min-state-fidelity").textContent()) >
      0.99999,
  );
  assert.ok(
    Number(await page.getByTestId("max-norm-drift").textContent()) < 1e-5,
  );
  await page.screenshot({
    path: "artifacts/desktop-evolution-compare.png",
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Dynamics engine" })
    .selectOption("native");
  await page.getByTestId("run-evolution").click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "COMPLETE" })
    .waitFor({ timeout: 30000 });
  assert.ok(
    await page
      .getByRole("img", { name: /Native population and Pauli/ })
      .isVisible(),
  );
  await page.getByRole("button", { name: "Stückelberg" }).click();
  await page
    .getByRole("combobox", { name: "Dynamics engine" })
    .selectOption("qutip");
  await page.getByTestId("run-evolution").click();
  await page
    .getByTestId("evolution-state")
    .filter({ hasText: "COMPLETE" })
    .waitFor({ timeout: 30000 });
  assert.equal(
    await page.getByTestId("stuckelberg-crossings").textContent(),
    "±4.000",
  );
  assert.ok(Number(await page.getByTestId("final-p0").textContent()) >= 0);
  await page.screenshot({
    path: "artifacts/desktop-stuckelberg.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Floquet / strong drive" }).click();
  await page.getByTestId("run-evolution").click();
  await page.getByTestId("evolution-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("floquet-analysis").waitFor();
  assert.ok(Number(await page.getByTestId("quasienergy-0").textContent()) <= Number(await page.getByTestId("quasienergy-1").textContent()));
  assert.equal(await page.getByTestId("floquet-map").locator(".floquet-map-grid > div").count(), 117);
  await page.getByTestId("floquet-analysis").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-floquet.png", fullPage: true });
  await page.getByRole("button", { name: "Jaynes–Cummings" }).click();
  await page.getByTestId("run-cavity").click();
  await page.getByTestId("cavity-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("cavity-result").waitFor();
  assert.ok(Number(await page.getByTestId("jc-reference").textContent()) < 1e-4);
  assert.ok(Number(await page.getByTestId("cavity-boundary").textContent()) < 1e-5);
  assert.equal(await page.getByTestId("dressed-spectrum").locator("span").count(), 12);
  await page.getByTestId("cavity-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-jaynes-cummings.png", fullPage: true });
  await page.getByLabel("Coupling g", { exact: true }).fill("0.4");
  await page.getByTestId("cavity-result-state").filter({ hasText: "OUT OF DATE" }).waitFor();
  await page.getByRole("button", { name: "Quantum Rabi" }).click();
  await page.getByRole("combobox", { name: "Cavity engine" }).selectOption("native");
  await page.getByTestId("run-cavity").click();
  await page.getByTestId("cavity-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  assert.ok(Number(await page.getByTestId("cavity-boundary").textContent()) < 0.02);
  await page.getByTestId("cavity-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-quantum-rabi.png", fullPage: true });
  await page.getByRole("button", { name: "Lindblad dynamics" }).click();
  await page.getByTestId("run-lindblad").click();
  await page.getByTestId("lindblad-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("lindblad-result").waitFor();
  assert.ok(Number(await page.getByTestId("minimum-purity").textContent()) < 1);
  assert.ok(Number(await page.getByTestId("open-excited").textContent()) > .99);
  assert.ok(await page.getByTestId("steady-state").getByText("Steady state").isVisible());
  await page.getByTestId("lindblad-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-lindblad.png", fullPage: true });
  await page.getByRole("button", { name: "Parameter sweeps" }).click();
  await page.getByRole("combobox", { name: "Sweep engine" }).selectOption("native");
  await page.getByRole("spinbutton", { name: "X axis points" }).fill("5");
  await page.getByTestId("run-sweep").evaluate(element => element.scrollIntoView({ block: "center" }));
  await page.getByTestId("run-sweep").click();
  await page.getByTestId("sweep-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("sweep-line").waitFor();
  assert.ok(["0", "5"].includes(await page.getByTestId("sweep-reused").textContent()));
  await page.screenshot({ path: "artifacts/desktop-sweep-line.png", fullPage: true });
  await page.getByTestId("run-sweep").evaluate(element => element.scrollIntoView({ block: "center" }));
  await page.getByTestId("run-sweep").click();
  await page.getByTestId("sweep-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  assert.equal(await page.getByTestId("sweep-reused").textContent(), "5");
  await page.getByRole("combobox", { name: "Sweep dimension" }).selectOption("2d");
  await page.getByRole("spinbutton", { name: "Y axis points" }).fill("4");
  await page.getByTestId("run-sweep").evaluate(element => element.scrollIntoView({ block: "center" }));
  await page.getByTestId("run-sweep").click();
  await page.getByTestId("sweep-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  await page.getByTestId("sweep-heatmap").waitFor();
  assert.equal(await page.getByTestId("sweep-heatmap").locator(".sweep-heatmap button").count(), 20);
  await page.screenshot({ path: "artifacts/desktop-sweep-heatmap.png", fullPage: true });
  await page.getByRole("tab", { name: "Presets" }).click();
  await page.getByTestId("preset-page").waitFor();
  assert.equal(await page.locator(".preset-card").count(), 6);
  await page.screenshot({ path: "artifacts/desktop-presets.png", fullPage: true });
  await page.getByRole("button", { name: "Open Resonant Rabi oscillation" }).click();
  await page.getByTestId("preset-loaded").getByText(/Resonant Rabi oscillation/).waitFor();
  await page.getByTestId("evolution-state").filter({ hasText: "PRESET LOADED" }).waitFor();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Drive frequency ω"]')?.value === "0");
  await page.getByTestId("run-evolution").click();
  await page.getByTestId("evolution-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  assert.match(await page.getByTestId("preset-check").textContent(), /ANALYTIC CHECK PASSED/);
  await page.getByRole("tab", { name: "Presets" }).click();
  await page.getByRole("button", { name: "Open Landau–Zener crossing" }).click();
  await page.getByTestId("evolution-state").filter({ hasText: "PRESET LOADED" }).waitFor();
  await page.getByTestId("run-evolution").click();
  await page.getByTestId("evolution-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  assert.match(await page.getByTestId("preset-check").textContent(), /ASYMPTOTIC REFERENCE ONLY/);
  await page.getByRole("tab", { name: "Presets" }).click();
  await page.getByRole("button", { name: "Open Jaynes–Cummings vacuum Rabi" }).click();
  await page.getByTestId("cavity-state").filter({ hasText: "PRESET LOADED" }).waitFor();
  await page.getByTestId("run-cavity").click();
  await page.getByTestId("cavity-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
  assert.match(await page.getByTestId("preset-check").textContent(), /ANALYTIC CHECK PASSED/);
  for (const title of ["T₁ relaxation", "Pure dephasing", "Damped cavity occupation"]) {
    await page.getByRole("tab", { name: "Presets" }).click();
    await page.getByRole("button", { name: `Open ${title}` }).click();
    await page.getByTestId("preset-loaded").getByText(new RegExp(title)).waitFor();
    await page.getByTestId("lindblad-state").filter({ hasText: "PRESET LOADED" }).waitFor();
    await page.getByTestId("run-lindblad").click();
    await page.getByTestId("lindblad-state").filter({ hasText: "COMPLETE" }).waitFor({ timeout: 30000 });
    assert.match(await page.getByTestId("preset-check").textContent(), /ANALYTIC CHECK PASSED/);
  }
  await page.getByTestId("lindblad-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-preset-cavity-loss.png", fullPage: true });
  await page.getByTestId("save-workspace").click();
  await page.getByTestId("workspace-message").filter({ hasText: "Workspace saved" }).waitFor();
  await page.getByLabel("Open initial photons").fill("1");
  await page.getByRole("tab", { name: "Spectrum", exact: true }).click();
  await page.getByTestId("restore-workspace").click();
  await page.getByLabel("Open initial photons").waitFor();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Open initial photons"]')?.value === "2");
  assert.ok(await page.getByTestId("preset-loaded").getByText(/Damped cavity occupation/).isVisible());
  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByTestId("saved-run").first().waitFor();
  const savedRuns = await page.evaluate(() => window.quantum.listRuns());
  assert.ok(savedRuns.length >= 6);
  const latest = savedRuns[0].runId;
  preservedRunId = latest;
  await mkdir("artifacts/exports", { recursive: true });
  for (const [format, extension] of [["csv", "csv"], ["svg", "svg"], ["manifest", "json"]]) {
    const destination = resolve(`artifacts/exports/smoke-${format}.${extension}`);
    await app.evaluate(({ dialog }, output) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: output }); }, destination);
    await page.getByRole("button", { name: `Export ${format.toUpperCase()} ${latest}` }).click();
    await page.getByRole("status").filter({ hasText: `Exported ${format.toUpperCase()}` }).waitFor();
    const exported = await readFile(destination, "utf8");
    assert.ok(exported.length > 50);
    if (format === "svg") assert.match(exported, /<svg xmlns=/);
    if (format === "manifest") assert.equal(JSON.parse(exported).result.runId, latest);
  }
  await page.screenshot({ path: "artifacts/desktop-runs.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Electron → QuTiP/Native labs, sweeps and six Volume VIII presets; durable runs, workspace restore, CSV/SVG/manifest exports, integrity, cancellation, restart and sandbox.",
  );
} finally {
  await app.close();
}
const reopened = await electron.launch({ args: ["."], env });
try {
  const page = await reopened.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 45000 });
  await page.getByRole("tab", { name: "Runs" }).click();
  const runIds = await page.evaluate(() => window.quantum.listRuns().then(runs => runs.map(run => run.runId)));
  assert.ok(runIds.includes(preservedRunId), "saved run must survive app restart");
  await page.getByTestId("restore-workspace").click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Open initial photons"]')?.value === "2");
  assert.ok(await page.getByTestId("preset-loaded").getByText(/Damped cavity occupation/).isVisible());
  console.log("PASS: saved run and all-lab workspace restore survive full Electron restart.");
} finally {
  await reopened.close();
}
