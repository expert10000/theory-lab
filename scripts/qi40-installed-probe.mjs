import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectPinnedNsisInstaller } from "./qi40-nsis-component.mjs";

export async function shaFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function checkInstalledProbe(probePath, installerPath, packagedRoot, installRoot) {
  const probe = JSON.parse(await readFile(probePath, "utf8"));
  assert.equal(probe.schema, "theory-lab/qi40-installed-lab-probe/v1");
  assert.equal(probe.installExitCode, 0);
  assert.equal(probe.failure, null);
  assert.equal(probe.installerSha256, await shaFile(installerPath));
  const component = inspectPinnedNsisInstaller(installerPath, probe.installerSha256);
  assert.equal(probe.nsisSystemDllSha256, component.systemDllSha256);
  const names = {
    executable: "Quantum Hamiltonian Lab.exe",
    appAsar: "resources/app.asar",
    workerExe: "resources/quantum-worker/quantum-worker.exe",
  };
  const payload = {};
  for (const [key, relative] of Object.entries(names)) {
    const installedSha256 = await shaFile(join(installRoot, relative));
    assert.equal(installedSha256, await shaFile(join(packagedRoot, relative)),
      "Installed payload differs from packaged app: " + relative);
    assert.equal(installedSha256, probe.installed[key]);
    payload[key] = installedSha256;
  }
  return { probe, payload };
}
