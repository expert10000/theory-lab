import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  session,
  type IpcMainInvokeEvent,
} from "electron";
import { join, isAbsolute } from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { WorkerSupervisor } from "./worker";
import { EvolutionCoordinator } from "./evolution";
import { RunStore } from "./runs";
import { SpectrumStudyStore } from "./spectrum-studies";
import { readSceneBundle, writeSceneBundle } from "../../../packages/quantum-scene/bundle";
import {openStreamBundle} from "../../../packages/quantum-scene/stream-bundle";
import { assertExampleRequest, sceneExample } from "../../../packages/quantum-scene/examples";
import { consistentTopologyResult } from "../../../packages/models/topology";
import { consistentTwoLevelSpectrum } from "../../../packages/models/two-level-spectrum";
import { consistentOscillatorResult } from "../../../packages/models/oscillator";
import { consistentAnharmonicResult } from "../../../packages/models/oscillator-anharmonic";
import { atlasEntry, atlasUrl } from "../../../packages/atlas";
import { assertJob, assertWorkspaceSnapshot, isQuantumResult,
  type RunExportFormat, type WorkspaceSnapshot } from "../../../packages/contracts";

const worker = new WorkerSupervisor(join(__dirname, ".."));
const sceneStreams=new Map<string,Awaited<ReturnType<typeof openStreamBundle>>>();
function trusted(event: IpcMainInvokeEvent) {
  // Renderer history changes only the fragment; the bundled file itself must remain exact.
  const documentUrl=event.senderFrame?.url.split("#",1)[0];
  if (
    event.senderFrame !== event.sender.mainFrame ||
    documentUrl !== pathToFileURL(join(__dirname, "index.html")).href
  )
    throw new Error("Untrusted IPC sender");
}

app.setName("Quantum Hamiltonian Lab");
// Acceptance uses a fresh profile; ordinary launches retain the existing path.
if(process.env.QLAB_TEST_PROFILE){
  if(!isAbsolute(process.env.QLAB_TEST_PROFILE))throw new Error("Test profile must be an absolute existing directory");
  app.setPath("userData",process.env.QLAB_TEST_PROFILE);
}
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
  const artifactDir = join(app.getPath("userData"), "artifacts");
  const runs = new RunStore(join(app.getPath("userData"), "runs"), artifactDir);
  const spectrumStudies = new SpectrumStudyStore(join(app.getPath("userData"), "spectrum-studies"), runs);
  const workspaceFile = join(app.getPath("userData"), "workspace.json");
  const evolution = new EvolutionCoordinator(
    worker,
    artifactDir,
    (progress) => {
      for (const win of BrowserWindow.getAllWindows())
        win.webContents.send("quantum:progress", progress);
    },
  );
  ipcMain.handle("quantum:evolve", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "evolve") throw new Error("Expected evolution job");
    if (running) throw new Error("A spectrum calculation is already running");
    const result = await evolution.run(value);
    await runs.record(value, result);
    return result;
  });
  ipcMain.handle("quantum:cavity", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "cavity") throw new Error("Expected cavity job");
    if (running) throw new Error("A spectrum calculation is already running");
    const result = await evolution.run(value);
    await runs.record(value, result);
    return result;
  });
  ipcMain.handle("quantum:oscillator-evolve", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if(value.operation!=="oscillator_evolve")throw new Error("Expected oscillator evolution job");
    if(running)throw new Error("A spectrum calculation is already running");
    const result=await evolution.run(value);
    await runs.record(value,result);
    return result;
  });
  ipcMain.handle("quantum:oscillator-drive", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if(value.operation!=="oscillator_drive")throw new Error("Expected monochromatic oscillator drive");
    if(running)throw new Error("A spectrum calculation is already running");
    const result=await evolution.run(value);
    await runs.record(value,result);
    return result;
  });
  ipcMain.handle("quantum:oscillator-pulse", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if(value.operation!=="oscillator_pulse")throw new Error("Expected Gaussian oscillator pulse");
    if(running)throw new Error("A spectrum calculation is already running");
    const result=await evolution.run(value);
    await runs.record(value,result);
    return result;
  });
  ipcMain.handle("quantum:oscillator-damped", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if(value.operation!=="oscillator_damped")throw new Error("Expected damped oscillator job");
    if(running)throw new Error("A spectrum calculation is already running");
    const result=await evolution.run(value);
    await runs.record(value,result);
    return result;
  });
  ipcMain.handle("quantum:oscillator-parametric", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if(value.operation!=="oscillator_parametric")throw new Error("Expected parametric oscillator job");
    if(running)throw new Error("A spectrum calculation is already running");
    const result=await evolution.run(value);
    await runs.record(value,result);
    return result;
  });
  ipcMain.handle("quantum:orbital", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "orbital") throw new Error("Expected orbital job");
    if (running) throw new Error("A spectrum calculation is already running");
    const result = await evolution.run(value);
    await runs.record(value, result);
    return result;
  });
  ipcMain.handle("quantum:lindblad", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "lindblad") throw new Error("Expected Lindblad job");
    if (running) throw new Error("A spectrum calculation is already running");
    const result = await evolution.run(value);
    await runs.record(value, result);
    return result;
  });
  ipcMain.handle("quantum:sweep", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "sweep") throw new Error("Expected sweep job");
    if (running) throw new Error("A spectrum calculation is already running");
    const result = await evolution.run(value);
    await runs.record(value, result);
    return result;
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
        JSON.stringify(result.model) !== JSON.stringify(value.model) ||
        !consistentTwoLevelSpectrum(value, result, true)
      )
        throw new Error("Worker returned an invalid or mismatched result");
      await runs.record(value, result);
      return result;
    } finally {
      running = false;
    }
  });
  ipcMain.handle("quantum:many-body", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "many_body") throw new Error("Expected many-body job");
    if (worker.status.state !== "READY" ||
        !worker.status.capabilities?.operations.includes("many_body") ||
        !worker.status.capabilities.engines[value.engine]?.available)
      throw new Error(`${value.engine} many-body engine is not ready`);
    if (running || evolution.isRunning) throw new Error("A calculation is already running");
    running = true;
    try {
      const result = await worker.request("quantum.run", value, 60000);
      if (!isQuantumResult(result) || result.operation !== "many_body" ||
          result.jobId !== value.jobId || result.engine.name !== value.engine ||
          JSON.stringify(result.model) !== JSON.stringify(value.model))
        throw new Error("Worker returned an invalid or mismatched many-body result");
      await runs.record(value, result);
      return result;
    } finally { running = false; }
  });
  ipcMain.handle("quantum:circuit", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "circuit") throw new Error("Expected circuit job");
    if (worker.status.state !== "READY" ||
        !worker.status.capabilities?.operations.includes("circuit") ||
        !worker.status.capabilities.engines[value.engine]?.available)
      throw new Error(`${value.engine} circuit engine is not ready`);
    if (running || evolution.isRunning) throw new Error("A calculation is already running");
    running = true;
    try {
      const result = await worker.request("quantum.run", value, 60000);
      if (!isQuantumResult(result) || result.operation !== "circuit" ||
          result.jobId !== value.jobId || result.engine.name !== value.engine ||
          JSON.stringify(result.model) !== JSON.stringify(value.model))
        throw new Error("Worker returned an invalid or mismatched circuit result");
      await runs.record(value, result);
      return result;
    } finally { running = false; }
  });
  ipcMain.handle("quantum:oscillator", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "oscillator") throw new Error("Expected oscillator job");
    if (worker.status.state !== "READY" || !worker.status.capabilities?.operations.includes("oscillator") ||
        !worker.status.capabilities.engines[value.engine].available) throw new Error(`${value.engine} oscillator engine is not ready`);
    if (running || evolution.isRunning) throw new Error("A calculation is already running");
    running = true;
    try {
      const result = await worker.request("quantum.run", value);
      if (!isQuantumResult(result) || result.operation !== "oscillator" || !consistentOscillatorResult(value, result))
        throw new Error("Worker returned an invalid or inconsistent oscillator result");
      await runs.record(value, result);
      return result;
    } finally { running = false; }
  });
  ipcMain.handle("quantum:oscillator-anharmonic", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if(value.operation!=="oscillator_anharmonic")throw new Error("Expected anharmonic oscillator job");
    if(worker.status.state!=="READY"||!worker.status.capabilities?.operations.includes("oscillator_anharmonic")||
       !worker.status.capabilities.engines[value.engine].available)throw new Error("Anharmonic oscillator engine is not ready");
    if(running||evolution.isRunning)throw new Error("A calculation is already running");
    running=true;
    try{
      const result=await worker.request("quantum.run",value,60000);
      if(!isQuantumResult(result)||result.operation!=="oscillator_anharmonic"||!consistentAnharmonicResult(value,result))
        throw new Error("Worker returned an inconsistent anharmonic spectrum");
      await runs.record(value,result);
      return result;
    }finally{running=false;}
  });
  ipcMain.handle("quantum:topology", async (event, value: unknown) => {
    trusted(event);
    assertJob(value);
    if (value.operation !== "topology") throw new Error("Expected topology job");
    if (worker.status.state !== "READY" || !worker.status.capabilities?.operations.includes("topology") ||
        !worker.status.capabilities.engines.native.available) throw new Error("Native topology engine is not ready");
    if (running || evolution.isRunning) throw new Error("A calculation is already running");
    running = true;
    try {
      const result = await worker.request("quantum.run", value, 60000);
      if (!isQuantumResult(result) || result.operation !== "topology" ||
          result.jobId !== value.jobId || result.engine.name !== "native" ||
          JSON.stringify(result.model) !== JSON.stringify(value.model) ||
          !consistentTopologyResult(value, result))
        throw new Error("Worker returned an invalid or mismatched topology result");
      await runs.record(value, result);
      return result;
    } finally { running = false; }
  });
  ipcMain.handle("quantum:open-atlas-source", async (event, id: unknown) => {
    trusted(event);
    if (typeof id !== "string") throw new Error("Invalid Atlas ID");
    const entry = atlasEntry(id);
    if (!entry) throw new Error("Unknown Atlas entry");
    await shell.openExternal(atlasUrl(entry));
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
  ipcMain.handle("quantum:resources", (event) => {
    trusted(event);
    return worker.resources();
  });
  ipcMain.handle("quantum:restart", (event) => {
    trusted(event);
    return worker.restart();
  });
  ipcMain.handle("quantum:save-workspace", async (event, value: unknown) => {
    trusted(event);
    assertWorkspaceSnapshot(value);
    const snapshot: WorkspaceSnapshot = { ...value, savedAt: new Date().toISOString() };
    await mkdir(app.getPath("userData"), { recursive: true });
    const temporary = `${workspaceFile}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(snapshot, null, 2) + "\n", { flag: "wx" });
    await rename(temporary, workspaceFile);
  });
  ipcMain.handle("quantum:load-workspace", async (event) => {
    trusted(event);
    let text: string;
    try { text = await readFile(workspaceFile, "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
    const value: unknown = JSON.parse(text);
    assertWorkspaceSnapshot(value);
    return value;
  });
  ipcMain.handle("quantum:list-runs", (event) => {
    trusted(event);
    return runs.list();
  });
  ipcMain.handle("quantum:spectrum-run", (event, runId:unknown) => {
    trusted(event);
    if(typeof runId!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(runId))throw new Error("Invalid spectrum run ID");
    return runs.spectrum(runId);
  });
  ipcMain.handle("quantum:rabi-run", (event, runId:unknown) => {
    trusted(event);
    if(typeof runId!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(runId))throw new Error("Invalid Rabi run ID");
    return runs.rabi(runId);
  });
  ipcMain.handle("quantum:save-spectrum-study", (event, result:unknown) => {
    trusted(event);
    return spectrumStudies.save(result);
  });
  ipcMain.handle("quantum:get-spectrum-study", (event, studyId:unknown) => {
    trusted(event);
    if(typeof studyId!=="string")throw new Error("Invalid spectrum study ID");
    return spectrumStudies.get(studyId);
  });
  ipcMain.handle("quantum:list-spectrum-studies", (event) => {
    trusted(event);
    return spectrumStudies.list();
  });
  ipcMain.handle("quantum:scene", (event, runId: unknown, view: unknown) => {
    trusted(event);
    if (typeof runId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(runId)) throw new Error("Invalid scene run ID");
    if(view!==undefined&&view!=="standard"&&view!=="bands") throw new Error("Unsupported scene view");
    return runs.scene(runId,view);
  });
  const sceneDigest = async (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
  ipcMain.handle("quantum:scene-example", (event, request: unknown) => {
    trusted(event); assertExampleRequest(request);
    return sceneExample(request, sceneDigest);
  });
  ipcMain.handle("quantum:export-scene-example", async (event, request: unknown) => {
    trusted(event); assertExampleRequest(request);
    const payload = await sceneExample(request, sceneDigest);
    const selection = await dialog.showOpenDialog({title:"Choose parent folder for a geometry fixture bundle",properties:["openDirectory"]});
    if(selection.canceled || !selection.filePaths[0]) return null;
    return writeSceneBundle(payload,selection.filePaths[0]);
  });
  ipcMain.handle("quantum:export-scene", async (event, runId: unknown, view: unknown,format:unknown) => {
    trusted(event);
    if (typeof runId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(runId)) throw new Error("Invalid scene run ID");
    // Validate saved metadata/data before prompting. Never accept renderer paths/data.
    if(view!==undefined&&view!=="standard"&&view!=="bands") throw new Error("Unsupported scene view");
    if(format!==undefined&&format!=="regular"&&format!=="stream")throw new Error("Unsupported scene bundle format");
    await runs.scene(runId,view);
    const selection = await dialog.showOpenDialog({ title: "Choose parent folder for a new scene bundle", properties: ["openDirectory"] });
    if (selection.canceled || !selection.filePaths[0]) return null;
    return runs.exportScene(runId, selection.filePaths[0],view,format);
  });
  ipcMain.handle("quantum:import-scene-stream",async(event,...args:unknown[])=>{
    trusted(event);if(args.length)throw new Error("Stream import accepts no renderer paths");
    const selection=await dialog.showOpenDialog({title:"Open a chunked multilevel .qscene folder",properties:["openDirectory"]});if(selection.canceled||!selection.filePaths[0])return null;
    const source=await openStreamBundle(selection.filePaths[0]),id=randomUUID();while(sceneStreams.size>=2)sceneStreams.delete(sceneStreams.keys().next().value!);sceneStreams.set(id,source);return{id,manifest:source.manifest};
  });
  ipcMain.handle("quantum:scene-chunk",async(event,id:unknown,path:unknown)=>{trusted(event);if(typeof id!=="string"||typeof path!=="string"||!sceneStreams.has(id))throw new Error("Unknown scene stream handle");return sceneStreams.get(id)!.read(path);});
  ipcMain.handle("quantum:release-scene-stream",(event,id:unknown)=>{trusted(event);if(typeof id!=="string")throw new Error("Invalid scene stream handle");sceneStreams.delete(id);});
  ipcMain.handle("quantum:import-scene", async (event, ...args: unknown[]) => {
    trusted(event);
    if (args.length) throw new Error("Scene import accepts no renderer paths or arguments");
    const selection = await dialog.showOpenDialog({ title: "Open a verified .qscene folder", properties: ["openDirectory"] });
    if (selection.canceled || !selection.filePaths[0]) return null;
    return readSceneBundle(selection.filePaths[0]);
  });
  ipcMain.handle("quantum:export-run", async (event, runId: unknown, format: unknown) => {
    trusted(event);
    if (typeof runId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(runId) ||
        typeof format !== "string" || !["csv", "svg", "manifest"].includes(format)) throw new Error("Invalid run export request");
    const kind = format as RunExportFormat;
    const extension = kind === "manifest" ? "json" : kind;
    const selection = await dialog.showSaveDialog({ title: `Export ${kind.toUpperCase()} run`,
      defaultPath: join(app.getPath("documents"), `${runId}.${extension}`),
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }] });
    if (selection.canceled || !selection.filePath) return null;
    await runs.export(runId, kind, selection.filePath);
    return selection.filePath;
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
