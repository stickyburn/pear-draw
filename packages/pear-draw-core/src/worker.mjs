import RPC from "bare-rpc";
import c from "compact-encoding";
import { PearDrawService } from "./pear-draw.mjs";
import {
	CMD_ADD_OBJECT,
	CMD_CLEAR_BOARD,
	CMD_CURSOR_LEAVE,
	CMD_CURSOR_MOVE,
	CMD_DELETE_OBJECT,
	CMD_DISCONNECT,
	CMD_GET_SNAPSHOT,
	CMD_JOIN_HOST,
	CMD_RECONNECT,
	CMD_START_HOST,
	CMD_SUSPEND,
	CMD_UPDATE_CURSOR,
	CMD_UPDATE_OBJECT,
	EVT_CURSOR_LEAVE,
	EVT_CURSOR_REMOVE,
	EVT_CURSOR_UPDATE,
	EVT_SNAPSHOT,
} from "./rpc-commands.mjs";

const storageRoot = Bare.argv[2];
const service = new PearDrawService(storageRoot);

// --- Set up RPC command router ---------------------------------------------
// valueEncoding: null disables compact-encoding so we handle
// serialization manually with JSON — matching the bare-rpc README pattern
// where req.data is a Buffer and req.reply() auto-encodes strings.
const router = new RPC.CommandRouter({ valueEncoding: null });

router.respond(CMD_START_HOST, async (req) => {
	const data = JSON.parse(c.decode(c.raw.utf8, req.data));
	const invite = await service.startSession(data.profileName);
	return JSON.stringify(invite);
});

router.respond(CMD_JOIN_HOST, async (req) => {
	const data = JSON.parse(c.decode(c.raw.utf8, req.data));
	await service.joinSession(data.profileName, data.inviteCode);
	return JSON.stringify({ success: true });
});

router.respond(CMD_ADD_OBJECT, async (req) => {
	const raw = c.decode(c.raw.utf8, req.data);
	const data = JSON.parse(raw);
	await service.addObject(data.obj);
	return JSON.stringify({ success: true });
});

router.respond(CMD_UPDATE_OBJECT, async (req) => {
	const data = JSON.parse(c.decode(c.raw.utf8, req.data));
	await service.updateObject(data.id, data.updates);
	return JSON.stringify({ success: true });
});

router.respond(CMD_DELETE_OBJECT, async (req) => {
	const data = JSON.parse(c.decode(c.raw.utf8, req.data));
	await service.deleteObject(data.id);
	return JSON.stringify({ success: true });
});

router.respond(CMD_UPDATE_CURSOR, async (req) => {
	const data = JSON.parse(c.decode(c.raw.utf8, req.data));
	// Legacy command — delegate to the new ephemeral moveCursor
	await service.moveCursor(data.peerId, data.data);
	return JSON.stringify({ success: true });
});

router.respond(CMD_CURSOR_MOVE, async (req) => {
	const data = JSON.parse(c.decode(c.raw.utf8, req.data));
	await service.moveCursor(data.peerId, data);
	return JSON.stringify({ success: true });
});

router.respond(CMD_CURSOR_LEAVE, async (req) => {
	const data = JSON.parse(c.decode(c.raw.utf8, req.data));
	await service.leaveCursor(data.peerId);
	return JSON.stringify({ success: true });
});

router.respond(CMD_CLEAR_BOARD, async () => {
	await service.clearBoard();
	return JSON.stringify({ success: true });
});

router.respond(CMD_DISCONNECT, async (req) => {
	const data = req.data ? JSON.parse(c.decode(c.raw.utf8, req.data)) : {};
	await service.disconnect({ soft: data.soft !== false });
	return JSON.stringify({ success: true });
});

router.respond(CMD_RECONNECT, async () => {
	await service.reconnect();
	return JSON.stringify({ success: true });
});

router.respond(CMD_SUSPEND, async () => {
	await service.disconnect({ soft: true });
	return JSON.stringify({ success: true });
});

router.respond(CMD_GET_SNAPSHOT, () => {
	const snapshot = service.getSnapshot();
	return JSON.stringify(snapshot);
});

// --- Create RPC over Bare.IPC ----------------------------------------------
const rpc = new RPC(Bare.IPC, router);

// --- Subscribe to snapshot updates and push as events ----------------------
service.subscribe((snapshot) => {
	try {
		const evt = rpc.event(EVT_SNAPSHOT);
		evt.send(JSON.stringify(snapshot));
	} catch (err) {
		console.error("[Worker] Error sending snapshot event:", err);
	}
});

// --- Subscribe to cursor events and push as separate events ---------------
service.onCursorUpdate((data) => {
	try {
		const eventType = data.type === "leave" ? EVT_CURSOR_LEAVE
			: data.type === "remove" ? EVT_CURSOR_REMOVE
			: EVT_CURSOR_UPDATE;
		const evt = rpc.event(eventType);
		evt.send(JSON.stringify(data.type === "update" ? data.cursor : data));
	} catch (err) {
		console.error("[Worker] Error sending cursor event:", err);
	}
});


Bare.on("uncaughtException", (err) => console.error("[Worker] Uncaught exception:", err));
Bare.on("unhandledRejection", (err) => console.error("[Worker] Unhandled rejection:", err));

// --- Graceful shutdown ----------------------------------------------------
// SIGTERM is sent by Electron before force-killing. We flush all Autobase/
// Corestore state so the next launch can recover the board cleanly.
let shuttingDown = false;

async function gracefulShutdown() {
	if (shuttingDown) return;
	shuttingDown = true;
	console.log("[Worker] Graceful shutdown — flushing state...");
	try {
		await service.dispose();
		console.log("[Worker] State flushed, exiting.");
	} catch (err) {
		console.error("[Worker] Error during shutdown:", err);
	}
	Bare.exit(0);
}

// Try process.on('SIGTERM') first (works if bare-process is loaded)
if (typeof process !== "undefined" && typeof process.on === "function") {
	process.on("SIGTERM", () => gracefulShutdown());
}
// Also listen on the IPC channel end — sidecar _predestroy() ends the IPC
Bare.IPC.on("end", () => gracefulShutdown());
