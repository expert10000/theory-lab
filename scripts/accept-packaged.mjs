import assert from "node:assert/strict";
import { _electron as electron } from "playwright";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve, sep } from "node:path";

const executable = process.argv[2];
if (!executable || !isAbsolute(executable) || !(await stat(executable)).isFile())
  throw new Error("Pass the absolute path to an installed Quantum Hamiltonian Lab executable");
const profile = await mkdtemp(join(tmpdir(), "qlab-package-acceptance-"));
const env = { ...process.env, QLAB_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
delete env.QLAB_PYTHON;
delete env.PYTHONPATH;
let app;
try {
  app = await electron.launch({ executablePath: executable, env });
  const page = await app.firstWindow();
  await page.getByTestId("worker-status").filter({ hasText: "READY" }).waitFor({ timeout: 60_000 });
  await page.getByTestId("result-state").filter({ hasText: "COMPUTED" }).waitFor({ timeout: 30_000 });
  assert.equal(await page.getByTestId("energy-low").textContent(), "-0.640312");
  assert.equal(await page.getByTestId("energy-high").textContent(), "0.640312");
  process.stdout.write(`Packaged Lab READY; pinned worker computed both smoke energies; isolated profile ${profile}\n`);
} finally {
  await app?.close();
  if (!profile.startsWith(resolve(tmpdir()) + sep) || !profile.includes("qlab-package-acceptance-"))
    throw new Error("Unsafe packaged acceptance cleanup path");
  await rm(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}
