// Pont limité entre l'interface et le processus principal.
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  analyse: () => ipcRenderer.invoke('analyse'),
  chooseFolder: kind => ipcRenderer.invoke('choose-folder', kind),
  setOption: (name, value) => ipcRenderer.invoke('set-option', name, value),
  drop: files => ipcRenderer.invoke('drop', [...files].map(f => webUtils.getPathForFile(f)).filter(Boolean)),
  removeSource: p => ipcRenderer.invoke('remove-source', p),
  setRefs: (dir, key, refs) => ipcRenderer.invoke('set-refs', dir, key, refs),
  setReglage: (dossier, reglage) => ipcRenderer.invoke('set-reglage', dossier, reglage),
  thumb: (file, height) => ipcRenderer.invoke('thumb', file, height),
  generate: options => ipcRenderer.invoke('generate', options),
  cancel: () => ipcRenderer.invoke('cancel'),
  openOutput: () => ipcRenderer.invoke('open-output'),
  openLogs: () => ipcRenderer.invoke('open-logs'),
  log: (level, text) => ipcRenderer.invoke('log', level, text),
  addSource: () => ipcRenderer.invoke('add-source'),
  onProgress: fn => ipcRenderer.on('progress', (_, e) => fn(e)),
});
