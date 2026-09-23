import { app, BrowserWindow, session } from 'electron';
import { join } from 'node:path';

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
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
