import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { app, BrowserWindow, dialog } from "electron";

const CONFIG_SCHEMA = "theory-lab/math3d-target/v1";
const CONFIG_FILE = "math3d-target.json";

async function targetExecutable(directory: string): Promise<string> {
  if (!isAbsolute(directory) || directory.includes("\0") || resolve(directory) !== directory)
    throw new Error("Choose an absolute Math3D checkout folder");
  const packageFile = join(directory, "package.json");
  const packageInfo = JSON.parse(await readFile(packageFile, "utf8")) as { name?: string };
  if (packageInfo.name !== "math3d") throw new Error("Selected folder is not a Math3D checkout");
  const executable = process.platform === "win32"
    ? join(directory, "node_modules", "electron", "dist", "electron.exe")
    : process.platform === "darwin"
      ? join(directory, "node_modules", "electron", "dist", "Electron.app", "Contents", "MacOS", "Electron")
      : join(directory, "node_modules", "electron", "dist", "electron");
  for (const file of [executable, join(directory, "dist", "main.js"), join(directory, "renderer", "dist", "index.html")]) {
    if (!(await stat(file)).isFile()) throw new Error(`Math3D is not built: ${file}`);
  }
  return executable;
}

async function savedTarget(): Promise<string | null> {
  const file = join(app.getPath("userData"), CONFIG_FILE);
  try {
    const info = await stat(file);
    if (!info.isFile() || info.size > 4096) return null;
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    return record.schema === CONFIG_SCHEMA && typeof record.directory === "string" ? record.directory : null;
  } catch { return null; }
}

async function rememberTarget(directory: string): Promise<void> {
  const parent = app.getPath("userData");
  const temp = join(parent, `${CONFIG_FILE}.${randomUUID()}.tmp`);
  try {
    await writeFile(temp, JSON.stringify({ schema: CONFIG_SCHEMA, directory }) + "\n", { flag: "wx" });
    await rename(temp, join(parent, CONFIG_FILE));
  } finally { await unlink(temp).catch(() => {}); }
}

export async function chooseMath3DTarget(win: BrowserWindow): Promise<{ directory: string; executable: string } | null> {
  const configured = process.env.QLAB_MATH3D_HOME || await savedTarget();
  if (configured) {
    try { return { directory: configured, executable: await targetExecutable(configured) }; }
    catch (error) { if (process.env.QLAB_MATH3D_HOME) throw error; }
  }
  const choice = await dialog.showOpenDialog(win, {
    title: "Choose your Math3D checkout folder (once)", properties: ["openDirectory"],
  });
  if (choice.canceled || !choice.filePaths[0]) return null;
  const directory = resolve(choice.filePaths[0]);
  const executable = await targetExecutable(directory);
  await rememberTarget(directory);
  return { directory, executable };
}

export async function launchMath3D(target: { directory: string; executable: string }, sceneDirectory: string): Promise<void> {
  if (!isAbsolute(sceneDirectory) || !sceneDirectory.toLowerCase().endsWith(".qscene"))
    throw new Error("Invalid scene handoff folder");
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.VITE_DEV_SERVER_URL;
  await new Promise<void>((done, fail) => {
    const child = spawn(target.executable, [target.directory, "--quantum-scene", sceneDirectory], {
      cwd: target.directory, env, detached: true, stdio: "ignore", windowsHide: true,
    });
    child.once("error", fail);
    child.once("spawn", () => { child.unref(); done(); });
  });
}
