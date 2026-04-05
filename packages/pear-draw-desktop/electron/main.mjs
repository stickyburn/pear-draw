import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain } from "electron";
import { command, flag } from "paparam";
import PearRuntime from "pear-runtime";
import { isLinux, isMac, isWindows } from "which-runtime";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json using dynamic import
const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(
	await import("node:fs").then((fs) => fs.readFileSync(pkgPath, "utf-8")),
);
const { name, productName, version, upgrade } = pkg;

const workers = new Map();
let pear = null;

const appName = productName ?? name;

const cmd = command(
	appName,
	flag("--storage <dir>", "pass custom storage to pear-runtime"),
	flag("--no-updates", "start without OTA updates"),
);

cmd.parse(app.isPackaged ? process.argv.slice(1) : process.argv.slice(2));

const pearStore = cmd.flags.storage;
const updates = cmd.flags.updates;

function getPear() {
	if (pear) return pear;
	const appPath = getAppPath();
	let dir = null;
	if (pearStore) {
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

function getAppPath() {
	if (!app.isPackaged) return null;
	if (isLinux && process.env.APPIMAGE) return process.env.APPIMAGE;
	if (isWindows) return process.execPath;
	return path.join(process.resourcesPath, "..", "..");
}

function sendToAll(name, data) {
	for (const win of BrowserWindow.getAllWindows()) {
		if (!win.isDestroyed()) win.webContents.send(name, data);
	}
}

async function getWorker(specifier) {
	if (workers.has(specifier)) return workers.get(specifier);
	const pearRuntime = getPear();

	// Resolve worker path - specifier is relative from project root (packages/pear-draw-desktop)
	// So we need to go up one level to packages/ then into pear-draw-core
	const workerPath = path.join(__dirname, "..", "..", specifier);

	const worker = pearRuntime.run(workerPath, [pearRuntime.storage]);

	function onBeforeQuit() {
		worker.destroy();
	}

	ipcMain.handle(`pear:worker:writeIPC:${specifier}`, (_evt, data) => {
		try {
			return worker.write(Buffer.from(data));
		} catch (_err) {
			// Worker disconnected, ignore write errors
			return false;
		}
	});

	workers.set(specifier, worker);
	worker.on("data", (data) => {
		sendToAll(`pear:worker:ipc:${specifier}`, data);
	});
	worker.once("exit", (code) => {
		app.removeListener("before-quit", onBeforeQuit);
		ipcMain.removeHandler(`pear:worker:writeIPC:${specifier}`);
		sendToAll(`pear:worker:exit:${specifier}`, code);
		workers.delete(specifier);
	});
	app.on("before-quit", onBeforeQuit);
	return worker;
}

async function createWindow() {
	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			sandbox: true,
			nodeIntegration: false,
			contextIsolation: true,
		},
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

ipcMain.handle("pear:startWorker", async (_evt, filename) => {
	await getWorker(filename);
	return true;
});

const lock = app.requestSingleInstanceLock();

if (!lock) {
	app.quit();
} else {
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

	// Proper cleanup on app quit
	app.on("before-quit", async () => {
		if (pear) {
			await pear.close();
		}
	});
}
