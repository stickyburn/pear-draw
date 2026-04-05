const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bridge", {
	startWorker: (specifier) => ipcRenderer.invoke("pear:startWorker", specifier),
	onWorkerIPC: (specifier, listener) => {
		const wrap = (_evt, data) => listener(data);
		ipcRenderer.on(`pear:worker:ipc:${specifier}`, wrap);
		return () =>
			ipcRenderer.removeListener(`pear:worker:ipc:${specifier}`, wrap);
	},
	writeWorkerIPC: (specifier, data) => {
		return ipcRenderer.invoke(`pear:worker:writeIPC:${specifier}`, data);
	},
});
