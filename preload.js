const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    setCloseBehavior: (mode) => ipcRenderer.send('set-close-behavior', mode),
    onMaximized: (callback) => ipcRenderer.on('window-maximized', callback),
    onCloseBehaviorUpdated: (callback) => ipcRenderer.on('close-behavior-updated', callback),
});