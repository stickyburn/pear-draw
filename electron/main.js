const { app, BrowserWindow, ipcMain } = require("electron");
const os = require("node:os");
const path = require("node:path");
const PearRuntime = require("pear-runtime");

const { isMac, isLinux, isWindows } = require("which-runtime");
const { command, flag } = require("paparam");
const pkg = require("../package.json");
const { name, productName, version, upgrade } = pkg;
const { PearDrawService } = require("./services/pear-draw.js");

const protocol = name;

let pear = null;
let drawService = null;

const appName = productName ?? name;

const cmd = command(
	appName,
	flag("--storage <dir>", "pass custom storage to pear-runtime"),
	flag("--no-updates", "start without OTA updates"),
);

cmd.parse(app.isPackaged ? process.argv.slice(1) : process.argv.slice(2));

const pearStore = cmd.flags.storage;
const updates = cmd.flags.updates;

ipcMain.on("pkg", (evt) => {
	evt.returnValue = pkg;
});

function getPear() {
	if (pear) return pear;
	const appPath = getAppPath();
	let dir = null;
	if (pearStore) {
		console.log(`pear store: ${pearStore}`);
		dir = pearStore;
	} else if (appPath === null) {
		dir = path.join(os.tmpdir(), "pear", appName);
	} else {
		dir = isMac
			? path.join(os.homedir(), "Library", "Application Support", appName)
			: isLinux
				? path.join(os.homedir(), ".config", appName)
				: path.join(os.homedir(), "AppData", "Local", appName);
	}

	const extension = isLinux ? ".AppImage" : isMac ? ".app" : ".msix";
	pear = new PearRuntime({
		dir,
		app: appPath,
		updates,
		version,
		upgrade,
		name: productName + extension,
	});
	pear.on("error", console.error);
	return pear;
}

function getDrawService() {
	if (drawService) return drawService;
	const pear = getPear();
	drawService = new PearDrawService(pear.storage);
	return drawService;
}

function sendToAll(name, data) {
	for (const win of BrowserWindow.getAllWindows()) {
		if (!win.isDestroyed()) win.webContents.send(name, data);
	}
}

function getAppPath() {
	if (!app.isPackaged) return null;
	if (isLinux && process.env.APPIMAGE) return process.env.APPIMAGE;
	if (isWindows) return process.execPath;
	return path.join(process.resourcesPath, "..", "..");
}

async function createWindow() {
	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "..", "electron", "preload.js"),
			sandbox: true,
			nodeIntegration: false,
			contextIsolation: true,
		},
	});

	const pear = getPear();

	const onUpdating = () => {
		if (!win.isDestroyed()) win.webContents.send("pear:event:updating");
	};

	const onUpdated = () => {
		if (!win.isDestroyed()) win.webContents.send("pear:event:updated");
	};

	pear.updater.on("updating", onUpdating);
	pear.updater.on("updated", onUpdated);

	win.on("closed", () => {
		pear.updater.removeListener("updating", onUpdating);
		pear.updater.removeListener("updated", onUpdated);
	});

	const devServerUrl = process.env.PEAR_DEV_SERVER_URL;

	if (devServerUrl) {
		await win.loadURL(devServerUrl);
		win.webContents.openDevTools();
		return;
	}

	await win.loadFile(
		path.join(__dirname, "..", "renderer", "dist", "index.html"),
	);
}

ipcMain.handle("pear:applyUpdate", () => getPear().updater.applyUpdate());

ipcMain.handle("app:restart", () => {
	if (isLinux && process.env.APPIMAGE) {
		app.relaunch({
			execPath: process.env.APPIMAGE,
			args: [
				"--appimage-extract-and-run",
				...process.argv
					.slice(1)
					.filter((arg) => arg !== "--appimage-extract-and-run"),
			],
		});
	} else {
		app.relaunch();
	}
	app.exit(0);
});

// Draw-specific IPC handlers
ipcMain.handle("draw:startHost", async (_evt, profileName) => {
	const service = getDrawService();
	const invite = await service.startSession(profileName);
	return invite;
});

ipcMain.handle("draw:joinHost", async (_evt, profileName, invite) => {
	const service = getDrawService();
	await service.joinSession(profileName, invite);
});

ipcMain.handle("draw:addStroke", async (_evt, stroke) => {
	const service = getDrawService();
	await service.addStroke(stroke);
});

ipcMain.handle("draw:clearBoard", async () => {
	const service = getDrawService();
	await service.clearBoard();
});

ipcMain.handle("draw:getSnapshot", () => {
	const service = getDrawService();
	return service.getSnapshot();
});

// Set up snapshot broadcast on subscription
let snapshotBroadcastSetup = false;
ipcMain.handle("draw:subscribe", () => {
	if (!snapshotBroadcastSetup) {
		const service = getDrawService();
		service.subscribe((snapshot) => {
			sendToAll("draw:snapshot", snapshot);
		});
		snapshotBroadcastSetup = true;
	}
	return true;
});

function handleDeepLink(url) {
	console.log("deep link:", url);
}

app.setAsDefaultProtocolClient(protocol);

app.on("open-url", (evt, url) => {
	evt.preventDefault();
	handleDeepLink(url);
});

const lock = app.requestSingleInstanceLock();

if (!lock) {
	app.quit();
} else {
	app.on("second-instance", (_evt, args) => {
		const url = args.find((arg) => arg.startsWith(`${protocol}://`));
		if (url) handleDeepLink(url);
	});

	app.whenReady().then(() => {
		createWindow().catch((err) => {
			console.error("Failed to create window:", err);
			app.quit();
		});

		app.on("activate", () => {
			if (BrowserWindow.getAllWindows().length === 0) {
				createWindow().catch((err) => {
					console.error("Failed to create window:", err);
				});
			}
		});
	});

	app.on("window-all-closed", () => {
		if (process.platform !== "darwin") {
			app.quit();
		}
	});
}
