import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const PINNED_SYSTEM_DLL_SHA256 = "1556ee1bf1cb477124e1269b534ed81653ba71994dab7903ee3782b75acc2810";

export function inspectPinnedNsisInstaller(installer, expectedInstallerSha256) {
  if (process.platform !== "win32") throw new Error("QI-40 NSIS component inspection requires Windows");
  const script = fileURLToPath(new URL("./verify-qi40-installer-nsis.ps1", import.meta.url));
  const result = spawnSync("pwsh", ["-NoProfile", "-File", script, "-Installer", installer],
    { encoding: "utf8", timeout: 60_000 });
  if (result.status !== 0)
    throw new Error("Pinned NSIS component check failed: " + (result.error?.message ?? result.stderr ?? result.stdout));
  const component = JSON.parse(result.stdout);
  assert.equal(component.installerSha256, expectedInstallerSha256);
  assert.equal(component.systemDllSha256, PINNED_SYSTEM_DLL_SHA256);
  assert.equal(component.systemDllBytes, 30208);
  return component;
}
