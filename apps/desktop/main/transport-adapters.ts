import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchRemoteArtifact, remoteConfig, safeAbsolute, sshLaunch, validateArtifactMetadata,
  verifyRemoteBytes, type RemoteConfig } from "./remote";

export type ExternalTransport = { kind: "ssh" | "wsl" | "docker";
  target: string; root: string; python: string; artifacts: string };
export type TransportConfig = ExternalTransport | null;
const identifier = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;

/** One explicit transport at a time; command arguments and paths are bounded before launch. */
export function transportConfig(env: NodeJS.ProcessEnv): TransportConfig {
  const selected = [env.QLAB_REMOTE_SSH_TARGET && "ssh", env.QLAB_WSL_DISTRO && "wsl",
    env.QLAB_DOCKER_CONTAINER && "docker"].filter(Boolean);
  if (selected.length > 1) throw new Error("Select only one QLAB worker transport");
  if (selected[0] === "ssh") return { kind: "ssh", ...remoteConfig(env)! };
  if (!selected.length) return null;
  const kind = selected[0] as "wsl" | "docker";
  const target = kind === "wsl" ? env.QLAB_WSL_DISTRO! : env.QLAB_DOCKER_CONTAINER!;
  if (!identifier.test(target)) throw new Error(`Invalid ${kind.toUpperCase()} target`);
  const prefix = kind === "wsl" ? "QLAB_WSL" : "QLAB_DOCKER";
  const root = env[`${prefix}_ROOT`];
  if (!root) throw new Error(`${prefix}_ROOT is required`);
  const checkedRoot = safeAbsolute(root);
  return { kind, target, root: checkedRoot,
    python: safeAbsolute(env[`${prefix}_PYTHON`] || `${checkedRoot}/.venv/bin/python`),
    artifacts: safeAbsolute(env[`${prefix}_ARTIFACTS`] || `${checkedRoot}/.qlab-artifacts`) };
}

export function transportLaunch(config: ExternalTransport): { command: string; args: string[] } {
  if (config.kind === "ssh") return sshLaunch(config as RemoteConfig);
  const modulePath = `${config.root}/workers/quantum-python`;
  if (config.kind === "wsl") return { command: "wsl.exe", args: ["--distribution", config.target,
    "--exec", "sh", "-c", `cd ${config.root} && exec env PYTHONPATH=${modulePath} PYTHONIOENCODING=utf-8 ${config.python} -u -m quantum_worker.main`] };
  return { command: "docker", args: ["exec", "-i", "--workdir", config.root,
    "--env", `PYTHONPATH=${modulePath}`, "--env", "PYTHONIOENCODING=utf-8", config.target,
    config.python, "-u", "-m", "quantum_worker.main"] };
}

/** Stream artifact bytes over stdout so the declared cap applies before local disk writes. */
export function transportArtifactRead(config: ExternalTransport, source: string): { command: string; args: string[] } {
  if (config.kind === "wsl") return { command: "wsl.exe",
    args: ["--distribution", config.target, "--exec", "cat", source] };
  if (config.kind === "docker") return { command: "docker",
    args: ["exec", config.target, config.python, "-c",
      "import shutil,sys; shutil.copyfileobj(open(sys.argv[1], 'rb'), sys.stdout.buffer, 65536)", source] };
  throw new Error("SSH copying uses SCP");
}

async function command(command: string, args: string[], maxBytes: number, timeoutMs: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = []; let length = 0, diagnostic = "", settled = false;
    const finish = (error?: Error) => { if (settled) return; settled = true; clearTimeout(timer);
      if (error) reject(error); else resolve(Buffer.concat(chunks)); };
    const timer = setTimeout(() => { child.kill(); finish(new Error("Artifact transfer timed out")); }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { length += chunk.length;
      if (length > maxBytes) { child.kill(); finish(new Error("Artifact transfer exceeded declared bytes")); }
      else chunks.push(chunk); });
    child.stderr.on("data", chunk => { diagnostic = (diagnostic + chunk.toString()).slice(-1000); });
    child.on("error", error => finish(error));
    child.on("exit", code => finish(code === 0 ? undefined : new Error(`Artifact transfer failed (${code}): ${diagnostic}`)));
  });
}

type Copier = (config: ExternalTransport, jobId: string, temporary: string, maxBytes: number, timeoutMs: number) => Promise<void>;
async function copyArtifact(config: ExternalTransport, jobId: string, temporary: string, maxBytes: number, timeoutMs: number) {
  const source = `${config.artifacts}/${jobId}.f64`;
  const read = transportArtifactRead(config, source);
  const bytes = await command(read.command, read.args, maxBytes, timeoutMs);
  await writeFile(temporary, bytes, { flag: "wx" });
}

export async function fetchTransportArtifact(config: ExternalTransport, jobId: string,
  expected: { path: string; bytes: number; sha256: string }, localDir: string,
  timeoutMs = 120000, copier: Copier = copyArtifact): Promise<void> {
  if (config.kind === "ssh") return fetchRemoteArtifact(config as RemoteConfig, jobId, expected, localDir, timeoutMs);
  validateArtifactMetadata(jobId, expected);
  await mkdir(localDir, { recursive: true });
  const temporary = join(localDir, `${jobId}.${randomUUID()}.part`);
  try {
    await copier(config, jobId, temporary, expected.bytes, timeoutMs);
    verifyRemoteBytes(await readFile(temporary), expected);
    await rename(temporary, join(localDir, expected.path));
  } finally { await rm(temporary, { force: true }); }
}
