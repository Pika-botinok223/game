'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('avemaria', {
  isElectron: true,
  quit: () => ipcRenderer.send('avemaria:quit'),
  toggleFullscreen: () => ipcRenderer.send('avemaria:toggle-fullscreen'),
});
