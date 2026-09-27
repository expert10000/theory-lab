import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { startGateway } from "../apps/gateway/server";

const root = process.cwd();
const token = "web-smoke-token-0123456789-abcdef";
const dataDir = await mkdtemp(join(tmpdir(), "qlab-web-"));
const gateway = await startGateway({ root, dataDir, webDir: join(root, "dist", "web"), token, port: 0 });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const initial = await page.goto(gateway.origin);
  assert.equal(initial?.status(), 200, `Gateway served HTTP ${initial?.status()}`);
  await page.getByLabel("Gateway access token").waitFor({ timeout: 5000 }).catch(async () => {
    throw new Error(`Web app did not render: ${await page.locator("body").innerText()} | ${errors.join("; ")}`);
  });
  await page.getByRole("button", { name: /Hamiltonian Atlas/ }).click();
  await page.getByTestId("web-atlas").waitFor();
  await page.getByLabel("Search Atlas").fill("Su-Schrieffer-Heeger");
  await page.getByRole("button", { name: /Su-Schrieffer-Heeger model/ }).click();
  assert.match(await page.getByTestId("web-atlas-detail").innerText(), /reference/i);
  assert.ok((await page.getByRole("link", { name: /View pinned source/ }).getAttribute("href"))!.includes("61791aff00c0f35a82ec6f2271deded5cc5e99d6"));
  assert.equal(await page.getByTestId("web-atlas-load").count(), 0, "SSH is not yet a web control in the Atlas milestone");
  await page.getByRole("button", { name: /Two-level spectrum/ }).click();
  await page.getByLabel("Gateway access token").fill(token);
  await page.getByRole("button", { name: "Connect" }).click();
  await page.getByText(/worker ready/).waitFor();
  await page.getByRole("button", { name: "Run calculation" }).click();
  await page.getByText("Eigenenergy spectrum").waitFor();
  assert.match(await page.locator(".energy-list").innerText(), /0\.640312/);
  await page.getByRole("button", { name: /Rabi dynamics/ }).click();
  await page.getByRole("button", { name: "Run calculation" }).click();
  await page.getByText("Population dynamics").waitFor();
  assert.ok((await page.locator(".chart polyline").getAttribute("points"))!.length > 100);
  await page.getByRole("button", { name: /Hamiltonian Atlas/ }).click();
  await page.getByLabel("Search Atlas").fill("two_level_pauli");
  await page.getByRole("button", { name: /Generic two-level Pauli Hamiltonian/ }).click();
  await page.getByTestId("web-atlas-load").click();
  assert.equal(await page.locator("#delta").inputValue(), "2");
  assert.equal(await page.locator("#omega").inputValue(), "0");
  await page.getByRole("button", { name: /Worker & API/ }).click();
  await page.getByTestId("worker-dashboard").waitFor();
  await page.getByText("worker-resources/v1").waitFor();
  await page.getByText("Installed engines").waitFor();
  assert.match(await page.locator(".worker-dashboard").innerText(), /GET \/api\/resources/);
  assert.match(await page.locator(".worker-dashboard").innerText(), /POST \/api\/jobs/);
  const callCount = /Activity (\d+) authenticated calls/.exec(await page.locator(".worker-dashboard").innerText());
  assert.ok(callCount && Number(callCount[1]) >= 2);
  if (process.env.QLAB_REMOTE_SSH_TARGET)
    assert.ok((await page.locator(".worker-dashboard").innerText()).includes(process.env.QLAB_REMOTE_SSH_TARGET));
  assert.equal(errors.length, 0, errors.join("\n"));
  await mkdir(join(root, "artifacts"), { recursive: true });
  await page.screenshot({ path: join(root, "artifacts", "web-smoke.png"), fullPage: true });
  await gateway.worker.stop();
  await page.getByRole("button", { name: "Refresh snapshot" }).click();
  await page.locator(".metric").first().getByText("STOPPED", { exact: true }).waitFor();
  console.log("Web smoke passed: authenticated React → gateway → worker → verified result → UI");
} finally {
  await browser?.close();
  await gateway.close();
  await rm(dataDir, { recursive: true, force: true });
}
