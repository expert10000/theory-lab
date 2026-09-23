import { contextBridge } from 'electron';
contextBridge.exposeInMainWorld('quantum', Object.freeze({ version: '0.1.0' }));
