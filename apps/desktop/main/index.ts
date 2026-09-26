import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  type IpcMainInvokeEvent,
} from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { WorkerSupervisor } from "./worker";
import { EvolutionCoordinator } from "./evolution";
import { assertJob, isQuantumResult } from "../../../packages/contracts";

const worker = new WorkerSupervisor(join(__dirname, ".."));
function trusted(event: IpcMainInvokeEvent) {
  if (
    event.senderFrame !== event.sender.mainFrame ||
    event.senderFrame?.url !== pathToFileURL(join(__dirname, "index.html")).href
  )
    throw new Error("Untrusted IPC sender");
}

app.setName("Quantum Hamiltonian Lab");
function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1050,
    minHeight: 700,
    backgroundColor: "#10151d",
    title: "Quantum Hamiltonian Lab",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.webContents.on("will-attach-webview", (event) => event.preventDefault());
  void win.loadFile(join(__dirname, "index.html"));
}
app.whenReady().then(() => {
  let running = false;
  const evolution = new EvolutionCoordinator(
    worker,
    join(app.getPath("userData"), "artifacts"),
    (progress) => {
      for (const win of BrowserWindow.getAllWindows())
        win.webContents.send("quantum:progress", progress);
    },
  );
  ipcMain.handle("quantum:evolve", (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "evolve") throw new Error("Expected evolution job");
    if (running) throw new Error("A spectrum calculation is already running");
    return evolution.run(value);
  });
  ipcMain.handle("quantum:cavity", (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "cavity") throw new Error("Expected cavity job");
    if (running) throw new Error("A spectrum calculation is already running");
    return evolution.run(value);
  });
  ipcMain.handle("quantum:cancel", (event, jobId: unknown) => {
    trusted(event);
    if (typeof jobId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(jobId))
      throw new Error("Invalid job ID");
    return evolution.cancel(jobId);
  });
  ipcMain.handle("quantum:read-data", (event, jobId: unknown) => {
    trusted(event);
    if (typeof jobId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(jobId))
      throw new Error("Invalid job ID");
    return evolution.readData(jobId);
  });
  ipcMain.handle("quantum:run", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "diagonalize")
      throw new Error("Expected spectrum job");
    if (
      worker.status.state !== "READY" ||
      !worker.status.capabilities?.operations.includes("diagonalize") ||
      !worker.status.capabilities.engines[value.engine].available
    )
      throw new Error(`${value.engine} engine is not ready`);
    if (running || evolution.isRunning)
      throw new Error("A calculation is already running");
    running = true;
    try {
      const result = await worker.request("quantum.run", value);
      if (
        !isQuantumResult(result) ||
        result.operation !== "diagonalize" ||
        result.jobId !== value.jobId ||
        result.engine.name !== value.engine ||
        result.model.parameters.delta !== value.model.parameters.delta ||
        result.model.parameters.omega !== value.model.parameters.omega
      )
        throw new Error("Worker returned an invalid or mismatched result");
      return result;
    } finally {
      running = false;
    }
  });
  ipcMain.handle("quantum:status", (event) => {
    trusted(event);
    return worker.status;
  });
  ipcMain.handle("quantum:capabilities", (event) => {
    trusted(event);
    if (!worker.status.capabilities) throw new Error("Worker not ready");
    return worker.status.capabilities;
  });
  ipcMain.handle("quantum:restart", (event) => {
    trusted(event);
    return worker.restart();
  });
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  createWindow();
  void worker.start();
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on("window-all-closed", () => app.quit());
let quitting = false;
app.on("before-quit", (event) => {
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  void worker.stop().finally(() => app.quit());
});
