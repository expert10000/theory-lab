import { contextBridge, ipcRenderer } from "electron";
import type { QuantumBridge } from "../../../packages/contracts";
const bridge: QuantumBridge = {
  run: (job) => ipcRenderer.invoke("quantum:run", job),
  evolve: (job) => ipcRenderer.invoke("quantum:evolve", job),
  cavity: (job) => ipcRenderer.invoke("quantum:cavity", job),
  orbital: (job) => ipcRenderer.invoke("quantum:orbital", job),
  lindblad: (job) => ipcRenderer.invoke("quantum:lindblad", job),
  sweep: (job) => ipcRenderer.invoke("quantum:sweep", job),
  manyBody: (job) => ipcRenderer.invoke("quantum:many-body", job),
  circuit: (job) => ipcRenderer.invoke("quantum:circuit", job),
  topology: (job) => ipcRenderer.invoke("quantum:topology", job),
  openAtlasSource: (id) => ipcRenderer.invoke("quantum:open-atlas-source", id),
  cancel: (jobId) => ipcRenderer.invoke("quantum:cancel", jobId),
  readData: (jobId) => ipcRenderer.invoke("quantum:read-data", jobId),
  onProgress: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, value: unknown) =>
      listener(value as Parameters<typeof listener>[0]);
    ipcRenderer.on("quantum:progress", handler);
    return () => ipcRenderer.removeListener("quantum:progress", handler);
  },
  getStatus: () => ipcRenderer.invoke("quantum:status"),
  getCapabilities: () => ipcRenderer.invoke("quantum:capabilities"),
  getResources: () => ipcRenderer.invoke("quantum:resources"),
  restart: () => ipcRenderer.invoke("quantum:restart"),
  saveWorkspace: (snapshot) => ipcRenderer.invoke("quantum:save-workspace", snapshot),
  loadWorkspace: () => ipcRenderer.invoke("quantum:load-workspace"),
  listRuns: () => ipcRenderer.invoke("quantum:list-runs"),
  getScene: (runId) => ipcRenderer.invoke("quantum:scene", runId),
  exportScene: (runId) => ipcRenderer.invoke("quantum:export-scene", runId),
  exportRun: (runId, format) => ipcRenderer.invoke("quantum:export-run", runId, format),
};
contextBridge.exposeInMainWorld("quantum", Object.freeze(bridge));
