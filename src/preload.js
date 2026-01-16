const { contextBridge, ipcRenderer } = require('electron');

// APIs expostas ao renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Informações do sistema
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Diálogos
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // Utilidades
  getClientId: () => ipcRenderer.invoke('get-client-id'),
  createNewWindow: (url) => ipcRenderer.invoke('create-new-window', url),
  
  // Eventos
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback)
});

// Socket.IO client wrapper
contextBridge.exposeInMainWorld('socketAPI', {
  connect: (serverUrl) => {
    const socket = require('socket.io-client')(serverUrl);
    return {
      on: (event, callback) => socket.on(event, callback),
      emit: (event, data) => socket.emit(event, data),
      disconnect: () => socket.disconnect(),
      connected: () => socket.connected
    };
  }
});