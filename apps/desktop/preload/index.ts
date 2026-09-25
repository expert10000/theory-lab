import { contextBridge, ipcRenderer } from "electron";
import type { QuantumBridge } from "../../../packages/contracts";
const bridge: QuantumBridge = {
  run: (job) => ipcRenderer.invoke("quantum:run", job),
  evolve: (job) => ipcRenderer.invoke("quantum:evolve", job),
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
  restart: () => ipcRenderer.invoke("quantum:restart"),
};
contextBridge.exposeInMainWorld("quantum", Object.freeze(bridge));
