import { app, BrowserWindow, ipcMain, session, type IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WorkerSupervisor } from './worker';

const worker = new WorkerSupervisor(join(__dirname, '..'));
function trusted(event: IpcMainInvokeEvent) {
  if (event.senderFrame !== event.sender.mainFrame || event.senderFrame?.url !== pathToFileURL(join(__dirname, 'index.html')).href) throw new Error('Untrusted IPC sender');
}

app.setName('Quantum Hamiltonian Lab');
function createWindow() {
  const win = new BrowserWindow({
    width: 1380, height: 900, minWidth: 1050, minHeight: 700,
    backgroundColor: '#10151d', title: 'Quantum Hamiltonian Lab', autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  void win.loadFile(join(__dirname, 'index.html'));
}
app.whenReady().then(() => {
  ipcMain.handle('quantum:status', event => { trusted(event); return worker.status; });
  ipcMain.handle('quantum:capabilities', event => { trusted(event); if (!worker.status.capabilities) throw new Error('Worker not ready'); return worker.status.capabilities; });
  ipcMain.handle('quantum:restart', event => { trusted(event); return worker.restart(); });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  createWindow();
  void worker.start();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
let quitting = false;
app.on('before-quit', event => {
  if (quitting) return;
  event.preventDefault(); quitting = true;
  void worker.stop().finally(() => app.quit());
});
