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

// Single dynamic handler for ALL worker IPC
// Registered at startup - handlers are always ready before workers spawn
ipcMain.handle("pear:worker:writeIPC", async (_evt, { specifier, data }) => {
	console.log("[Main] writeWorkerIPC called for:", specifier, "workers:", [...workers.keys()]);
	const worker = workers.get(specifier);
	if (!worker) {
		throw new Error(`Worker ${specifier} not running`);
	}
	try {
		return worker.write(Buffer.from(data));
	} catch (_err) {
		return false;
	}
});

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
	console.log("[Main] getWorker called for:", specifier);
	if (workers.has(specifier)) return workers.get(specifier);
	const pearRuntime = getPear();

	// Resolve worker path - specifier is relative from project root (packages/pear-draw-desktop)
	// So we need to go up one level to packages/ then into pear-draw-core
	const workerPath = path.join(__dirname, "..", "..", specifier);

	const worker = pearRuntime.run(workerPath, [pearRuntime.storage]);

	function onBeforeQuit() {
		worker.destroy();
	}

	workers.set(specifier, worker);
	console.log("[Main] Worker added to map:", specifier);
	
	// Capture worker stdout/stderr for debugging
	worker.stdout?.on("data", (data) => {
		console.log("[Worker stdout]", data.toString().trim());
	});
	worker.stderr?.on("data", (data) => {
		console.error("[Worker stderr]", data.toString().trim());
	});
	
	worker.on("data", (data) => {
		sendToAll(`pear:worker:ipc:${specifier}`, data);
	});
	worker.once("exit", (code) => {
		console.log("[Main] Worker exited:", specifier, "code:", code);
		app.removeListener("before-quit", onBeforeQuit);
		sendToAll(`pear:worker:exit:${specifier}`, code);
		workers.delete(specifier);
	});
	worker.on("error", (err) => {
		console.error("[Main] Worker error:", specifier, err);
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
	console.log("[Main] startWorker handler called for:", filename);
	await getWorker(filename);
	console.log("[Main] startWorker handler completed for:", filename);
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
