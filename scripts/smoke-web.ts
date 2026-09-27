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
