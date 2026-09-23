import { contextBridge, ipcRenderer } from "electron";
import type { QuantumBridge } from "../../../packages/contracts";
const bridge: QuantumBridge = {
  run: (job) => ipcRenderer.invoke("quantum:run", job),
  getStatus: () => ipcRenderer.invoke("quantum:status"),
  getCapabilities: () => ipcRenderer.invoke("quantum:capabilities"),
  restart: () => ipcRenderer.invoke("quantum:restart"),
};
contextBridge.exposeInMainWorld("quantum", Object.freeze(bridge));
