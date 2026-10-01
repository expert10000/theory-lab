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
  oscillator: (job) => ipcRenderer.invoke("quantum:oscillator", job),
  oscillatorEvolve: (job) => ipcRenderer.invoke("quantum:oscillator-evolve", job),
  oscillatorDrive: (job) => ipcRenderer.invoke("quantum:oscillator-drive", job),
  oscillatorPulse: (job) => ipcRenderer.invoke("quantum:oscillator-pulse", job),
  oscillatorDamped: (job) => ipcRenderer.invoke("quantum:oscillator-damped", job),
  oscillatorParametric: (job) => ipcRenderer.invoke("quantum:oscillator-parametric", job),
  oscillatorAnharmonic: (job) => ipcRenderer.invoke("quantum:oscillator-anharmonic", job),
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
  getScene: (runId, view) => ipcRenderer.invoke("quantum:scene", runId, view),
  exportScene: (runId, view, format) => ipcRenderer.invoke("quantum:export-scene", runId, view, format),
  importSceneStream: () => ipcRenderer.invoke("quantum:import-scene-stream"),
  readSceneChunk: (id,path) => ipcRenderer.invoke("quantum:scene-chunk",id,path),
  releaseSceneStream: id => ipcRenderer.invoke("quantum:release-scene-stream",id),
  importScene: () => ipcRenderer.invoke("quantum:import-scene"),
  getSceneExample: (request) => ipcRenderer.invoke("quantum:scene-example", request),
  exportSceneExample: (request) => ipcRenderer.invoke("quantum:export-scene-example", request),
  exportRun: (runId, format) => ipcRenderer.invoke("quantum:export-run", runId, format),
};
contextBridge.exposeInMainWorld("quantum", Object.freeze(bridge));
