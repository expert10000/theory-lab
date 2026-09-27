import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

if (!process.env.QLAB_REMOTE_SSH_TARGET || !process.env.QLAB_REMOTE_ROOT)
  throw new Error("Set QLAB_REMOTE_SSH_TARGET and QLAB_REMOTE_ROOT for SSH UI smoke");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({ args: ["."], env });
try {
  const page = await app.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY · SSH" }).waitFor({ timeout: 45000 });
  await page.getByRole("tab", { name: "Backend", exact: true }).click();
  const connection = page.getByTestId("ssh-connection");
  await connection.getByText(process.env.QLAB_REMOTE_SSH_TARGET, { exact: true }).waitFor();
  assert.ok((await connection.innerText()).includes(process.env.QLAB_REMOTE_ROOT));
  await page.getByTestId("worker-resources").getByText("Logical CPU cores").waitFor();
  await mkdir("artifacts", { recursive: true });
  await connection.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/desktop-backend-ssh.png" });
  console.log("SSH Backend UI passed: active target, remote root and worker resources visible");
} finally { await app.close(); }
