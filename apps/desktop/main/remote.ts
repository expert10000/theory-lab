import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";

export interface RemoteConfig {
  target: string;
  root: string;
  python: string;
  artifacts: string;
}
const absolute = /^\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\/?$/;
function safeAbsolute(value: string): string {
  if (!absolute.test(value) || value.split("/").includes(".."))
    throw new Error("Remote paths must be absolute POSIX paths without spaces or '..'");
  return value.replace(/\/$/, "");
}
export function remoteConfig(env: NodeJS.ProcessEnv): RemoteConfig | null {
  const target = env.QLAB_REMOTE_SSH_TARGET;
  if (!target) return null;
  if (!/^(?:[A-Za-z_][A-Za-z0-9_.-]*@)?[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(target) || target.startsWith("-"))
    throw new Error("QLAB_REMOTE_SSH_TARGET must be a host alias or user@host");
  if (!env.QLAB_REMOTE_ROOT) throw new Error("QLAB_REMOTE_ROOT is required for SSH transport");
  const root = safeAbsolute(env.QLAB_REMOTE_ROOT);
  return { target, root,
    python: safeAbsolute(env.QLAB_REMOTE_PYTHON || `${root}/.venv/bin/python`),
    artifacts: safeAbsolute(env.QLAB_REMOTE_ARTIFACTS || `${root}/.qlab-remote-artifacts`) };
}
export const sshOptions = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "ConnectTimeout=10"];
export function sshLaunch(config: RemoteConfig): { command: string; args: string[] } {
  const modulePath = `${config.root}/workers/quantum-python`;
  // All interpolated paths are strictly validated above; SSH still needs one remote command string.
  const command = `cd ${config.root} && exec env PYTHONPATH=${modulePath} PYTHONIOENCODING=utf-8 ${config.python} -u -m quantum_worker.main`;
  return { command: "ssh", args: ["-T", ...sshOptions, config.target, command] };
}
export function verifyRemoteBytes(bytes: Uint8Array, expected: { bytes: number; sha256: string }): void {
  if (bytes.byteLength !== expected.bytes || createHash("sha256").update(bytes).digest("hex") !== expected.sha256)
    throw new Error("Remote artifact failed SHA-256 integrity check");
}
type Copier = (config: RemoteConfig, jobId: string, temporary: string, timeoutMs: number) => Promise<void>;
async function copyByScp(config: RemoteConfig, jobId: string, temporary: string, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("scp", ["-B", ...sshOptions, `${config.target}:${config.artifacts}/${jobId}.f64`, temporary],
      { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    let diagnostic = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("Remote artifact transfer timed out")); }, timeoutMs);
    child.stderr.on("data", chunk => { diagnostic = (diagnostic + chunk.toString()).slice(-1000); });
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("exit", code => { clearTimeout(timer);
      if (code === 0) resolve(); else reject(new Error(`Remote artifact transfer failed (${code}): ${diagnostic}`)); });
  });
}
export async function fetchRemoteArtifact(config: RemoteConfig, jobId: string, expected: {
  path: string; bytes: number; sha256: string;
}, localDir: string, timeoutMs = 120000, copier: Copier = copyByScp): Promise<void> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(jobId) || expected.path !== `${jobId}.f64` ||
      !Number.isInteger(expected.bytes) || expected.bytes < 16 || expected.bytes > 8_000_000 ||
      !/^[a-f0-9]{64}$/.test(expected.sha256))
    throw new Error("Invalid remote artifact metadata");
  await mkdir(localDir, { recursive: true });
  const temporary = join(localDir, `${jobId}.${randomUUID()}.part`);
  try {
    await copier(config, jobId, temporary, timeoutMs);
    const bytes = await readFile(temporary);
    verifyRemoteBytes(bytes, expected);
    await rename(temporary, join(localDir, expected.path));
  } finally { await rm(temporary, { force: true }); }
}
