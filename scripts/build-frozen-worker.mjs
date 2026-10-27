import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

if (process.platform !== "win32") throw new Error("The frozen worker package currently targets Windows");
const python = resolve(".venv", "Scripts", "python.exe");
if (!existsSync(python)) throw new Error("Create the pinned .venv with npm run setup:python");
const version = spawnSync(python, ["-m", "PyInstaller", "--version"], { encoding: "utf8" });
if (version.status !== 0 || version.stdout.trim() !== "6.16.0")
  throw new Error("Install pinned packaging tool: .venv\\Scripts\\python.exe -m pip install -r workers/quantum-python/requirements-packaging.txt");
const result = spawnSync(python, ["-m", "PyInstaller", "--noconfirm", "--clean", "--onedir",
  "--name", "quantum-worker", "--distpath", "build/packaged-worker", "--workpath", "build/pyinstaller",
  "--specpath", "build/pyinstaller", "--paths", "workers/quantum-python",
  "--collect-all", "qutip", "--collect-all", "scipy", "--collect-submodules", "quantum_worker",
  "scripts/worker-entry.py"], { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0 || !existsSync(resolve("build/packaged-worker/quantum-worker/quantum-worker.exe")))
  throw new Error("Frozen quantum worker build failed");
