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
  ipcMain.handle("quantum:run", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (
      worker.status.state !== "READY" ||
      !worker.status.capabilities?.operations.includes("diagonalize")
    )
      throw new Error("QuTiP worker is not ready");
    if (running) throw new Error("A calculation is already running");
    running = true;
    try {
      const result = await worker.request("quantum.run", value);
      if (
        !isQuantumResult(result) ||
        result.jobId !== value.jobId ||
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
