const { contextBridge, ipcRenderer } = require('electron');

// كشف API آمن للواجهة الأمامية
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  version: process.versions.electron,
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  saveFile: (content, fileName) => ipcRenderer.invoke('save-file', { content, fileName })
});
