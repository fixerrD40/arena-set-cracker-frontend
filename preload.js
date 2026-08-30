const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isElectron: true,
  sqliteRead: (fileName) => ipcRenderer.invoke('desktop:sqliteRead', fileName),
  sqliteWrite: (fileName, data) => ipcRenderer.invoke('desktop:sqliteWrite', fileName, data),
  artExists: (relativePath) => ipcRenderer.invoke('desktop:artExists', relativePath),
  artDownload: (url, destinationPath) =>
    ipcRenderer.invoke('desktop:artDownload', url, destinationPath),
  artRemoveDir: (relativePath) => ipcRenderer.invoke('desktop:artRemoveDir', relativePath),
  drizzleBootstrapSql: () => ipcRenderer.invoke('desktop:drizzleBootstrapSql')
});
