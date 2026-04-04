import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script — exposes safe IPC bridge to renderer process.
 * The renderer (web content) can call these functions
 * without direct access to Node.js APIs.
 */
contextBridge.exposeInMainWorld('ouro', {
  submitSignal: (text: string) => ipcRenderer.invoke('submit-signal', text),
  getStatus: () => ipcRenderer.invoke('get-status'),
  captureClipboard: () => ipcRenderer.invoke('capture-clipboard'),
  onSignalResult: (callback: (data: any) => void) => {
    ipcRenderer.on('signal-result', (event, data) => callback(data));
  },
  platform: process.platform,
  version: '0.1.0',
});
