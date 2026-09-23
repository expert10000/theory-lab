import { contextBridge, ipcRenderer } from 'electron';
import type { QuantumBridge } from '../../../packages/contracts';
const bridge: Omit<QuantumBridge, 'run'> = {
  getStatus: () => ipcRenderer.invoke('quantum:status'),
  getCapabilities: () => ipcRenderer.invoke('quantum:capabilities'),
  restart: () => ipcRenderer.invoke('quantum:restart'),
};
contextBridge.exposeInMainWorld('quantum', Object.freeze(bridge));
