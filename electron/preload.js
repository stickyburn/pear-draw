const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("bridge", {
	pkg() {
		return ipcRenderer.sendSync("pkg");
	},
	applyUpdate: () => ipcRenderer.invoke("pear:applyUpdate"),
	appRestart: () => ipcRenderer.invoke("app:restart"),
	onPearEvent: (name, listener) => {
		const wrap = (_evt, eventName) => listener(eventName);
		ipcRenderer.on(`pear:event:${name}`, wrap);
		return () => ipcRenderer.removeListener(`pear:event:${name}`, wrap);
	},
	startHost: (profileName) => ipcRenderer.invoke("draw:startHost", profileName),
	joinHost: (profileName, invite) =>
		ipcRenderer.invoke("draw:joinHost", profileName, invite),
	addObject: (obj) => ipcRenderer.invoke("draw:addObject", obj),
	updateObject: (id, obj) => ipcRenderer.invoke("draw:updateObject", id, obj),
	updateCursor: (peerId, cursorData) =>
		ipcRenderer.invoke("draw:updateCursor", peerId, cursorData),
	clearBoard: () => ipcRenderer.invoke("draw:clearBoard"),
	getSnapshot: () => ipcRenderer.invoke("draw:getSnapshot"),
	subscribe: () => ipcRenderer.invoke("draw:subscribe"),
	onSnapshot: (listener) => {
		const wrap = (_evt, snapshot) => listener(snapshot);
		ipcRenderer.on("draw:snapshot", wrap);
		return () => ipcRenderer.removeListener("draw:snapshot", wrap);
	},
});
