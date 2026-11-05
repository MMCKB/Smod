const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("SMOD_TRAY", {
  onData: (cb) => ipcRenderer.on("smod:tray:data", (_e, d) => cb(d)),
  onTrack: (cb) => ipcRenderer.on("smod:tray:track", (_e, d) => cb(d)),
  onSub: (cb) => ipcRenderer.on("smod:tray:sub", (_e, d) => cb(d)),
  onSubOut: (cb) => ipcRenderer.on("smod:tray:sub-out", () => cb()),
  onSubSwapOut: (cb) => ipcRenderer.on("smod:tray:sub-swap-out", () => cb()),
  onLyric: (cb) => ipcRenderer.on("smod:tray:lyric", (_e, d) => cb(d)),
  onLyricOut: (cb) => ipcRenderer.on("smod:tray:lyric-out", () => cb()),
  lyricReady: () => ipcRenderer.send("smod:tray:lyric-ready"),
  closeLyric: () => ipcRenderer.send("smod:tray:closeLyric"),
  toggleLyric: () => ipcRenderer.send("smod:tray:toggleLyric"),
  onLyricState: (cb) => ipcRenderer.on("smod:tray:lyric-state", (_e, d) => cb(d)),
  control: (k) => ipcRenderer.send("smod:tray:control", k),
  ready: () => ipcRenderer.send("smod:tray:ready"),
  click: (i) => ipcRenderer.send("smod:tray:click", i),
  openSub: (i, top) => ipcRenderer.send("smod:tray:openSub", i, top),
  back: () => ipcRenderer.send("smod:tray:back"),
  close: () => ipcRenderer.send("smod:tray:close"),
  resize: (h) => ipcRenderer.send("smod:tray:resize", h),
});
