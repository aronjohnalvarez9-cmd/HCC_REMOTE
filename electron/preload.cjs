const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hccRemote", {
  getIntuneSettings: () => ipcRenderer.invoke("intune:get-settings"),
  saveIntuneSettings: (settings) =>
    ipcRenderer.invoke("intune:save-settings", settings),
  connectIntune: () => ipcRenderer.invoke("intune:connect"),
  refreshIntune: () => ipcRenderer.invoke("intune:refresh"),
  disconnectIntune: () => ipcRenderer.invoke("intune:disconnect"),
  openIntunePortal: () => ipcRenderer.invoke("intune:open-portal"),
  openVerificationUrl: (url) =>
    ipcRenderer.invoke("intune:open-verification", url),
  onDeviceCode: (callback) => {
    const listener = (_event, response) => callback(response);
    ipcRenderer.on("intune:device-code", listener);
    return () => ipcRenderer.removeListener("intune:device-code", listener);
  },
});
