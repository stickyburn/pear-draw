import RPC from "bare-rpc";
import c from "compact-encoding";
import { PearDrawService } from "./pear-draw.mjs";
import {
	CMD_ADD_OBJECT,
	CMD_CLEAR_BOARD,
	CMD_GET_SNAPSHOT,
	CMD_JOIN_HOST,
	CMD_START_HOST,
	CMD_UPDATE_CURSOR,
	CMD_UPDATE_OBJECT,
	EVT_SNAPSHOT,
} from "./rpc-commands.mjs";

const storageRoot = Bare.argv[2];

const service = new PearDrawService(storageRoot);

// --- Set up RPC command router ---------------------------------------------

const router = new RPC.CommandRouter();

router.respond(
	CMD_START_HOST,
	{ requestEncoding: c.any, responseEncoding: c.any },
	async (_req, data) => {
		console.log("[Worker] startHost:", data.profileName);
		const invite = await service.startSession(data.profileName);
		console.log("[Worker] startHost result:", invite);
		return invite;
	},
);

router.respond(
	CMD_JOIN_HOST,
	{ requestEncoding: c.any, responseEncoding: c.any },
	async (_req, data) => {
		await service.joinSession(data.profileName, data.inviteCode);
		return { success: true };
	},
);

router.respond(
	CMD_ADD_OBJECT,
	{ requestEncoding: c.any, responseEncoding: c.any },
	async (_req, data) => {
		await service.addObject(data.obj);
		return { success: true };
	},
);

router.respond(
	CMD_UPDATE_OBJECT,
	{ requestEncoding: c.any, responseEncoding: c.any },
	async (_req, data) => {
		await service.updateObject(data.id, data.updates);
		return { success: true };
	},
);

router.respond(
	CMD_UPDATE_CURSOR,
	{ requestEncoding: c.any, responseEncoding: c.any },
	async (_req, data) => {
		await service.updateCursor(data.peerId, data.data);
		return { success: true };
	},
);

router.respond(
	CMD_CLEAR_BOARD,
	{ requestEncoding: c.any, responseEncoding: c.any },
	async () => {
		await service.clearBoard();
		return { success: true };
	},
);

router.respond(
	CMD_GET_SNAPSHOT,
	{ requestEncoding: c.any, responseEncoding: c.any },
	() => {
		return service.getSnapshot();
	},
);

// --- Create RPC over Bare.IPC

const rpc = new RPC(Bare.IPC, router);

// --- Subscribe to snapshot updates and push as events

service.subscribe((snapshot) => {
	const evt = rpc.event(EVT_SNAPSHOT);
	evt.send(snapshot, c.any);
});

// Signal ready
console.log("Worker: PearDraw worker ready (bare-rpc)");
