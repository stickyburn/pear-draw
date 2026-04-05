import c from "compact-encoding";
import ProtomuxRPC from "protomux-rpc";
import { PearDrawService } from "./pear-draw.mjs";

const storageRoot = Bare.argv[2];

const service = new PearDrawService(storageRoot);

// Wrapper to adapt Bare.IPC for protomux-rpc
class IPCStream {
	#ipc = null;

	constructor(ipc) {
		this.#ipc = ipc;
		this.destroyed = false;
	}

	on(event, fn) {
		if (event === "data") {
			this.#ipc.on("data", (data) => {
				// Data from Bare.IPC is already a buffer, just pass it through
				fn(Buffer.isBuffer(data) ? data : Buffer.from(data));
			});
		} else if (
			event === "close" ||
			event === "error" ||
			event === "end" ||
			event === "drain"
		) {
			this.#ipc.on(event, fn);
		}
		return this;
	}

	write(data) {
		if (this.destroyed) return false;
		this.#ipc.write(data);
		return true;
	}

	end() {
		this.destroy();
	}

	destroy(err) {
		if (this.destroyed) return;
		this.destroyed = true;
		this.#ipc.destroy(err);
	}

	pause() {
		// IPC doesn't support pause/resume natively
	}

	resume() {
		// IPC doesn't support pause/resume natively
	}
}

const stream = new IPCStream(Bare.IPC);
const rpc = new ProtomuxRPC(stream, {
	protocol: "pear-draw-rpc",
});

// Session commands
rpc.respond(
	"session.startHost",
	{
		requestEncoding: c.string,
		responseEncoding: c.string,
	},
	async (profileName) => {
		const invite = await service.startSession(profileName);
		return invite;
	},
);

rpc.respond(
	"session.joinHost",
	{
		requestEncoding: c.json,
		responseEncoding: c.raw,
	},
	async (req) => {
		await service.joinSession(req.profileName, req.inviteCode);
		return Buffer.alloc(0);
	},
);

rpc.respond(
	"session.addObject",
	{
		requestEncoding: c.json,
		responseEncoding: c.raw,
	},
	async (obj) => {
		await service.addObject(obj);
		return Buffer.alloc(0);
	},
);

rpc.respond(
	"session.updateObject",
	{
		requestEncoding: c.json,
		responseEncoding: c.raw,
	},
	async (req) => {
		await service.updateObject(req.id, req.updates);
		return Buffer.alloc(0);
	},
);

rpc.respond(
	"session.updateCursor",
	{
		requestEncoding: c.json,
		responseEncoding: c.raw,
	},
	async (req) => {
		await service.updateCursor(req.peerId, req.data);
		return Buffer.alloc(0);
	},
);

rpc.respond(
	"session.clearBoard",
	{
		requestEncoding: c.raw,
		responseEncoding: c.raw,
	},
	async () => {
		await service.clearBoard();
		return Buffer.alloc(0);
	},
);

// Use polling instead of events - client calls getSnapshot repeatedly
rpc.respond(
	"session.getSnapshot",
	{
		requestEncoding: c.raw,
		responseEncoding: c.json,
	},
	async () => {
		const snapshot = service.getSnapshot();
		return snapshot;
	},
);

rpc.respond(
	"session.subscribe",
	{
		requestEncoding: c.raw,
		responseEncoding: c.raw,
	},
	async () => {
		// In polling mode, subscribe is a no-op
		// Client will poll getSnapshot instead
		return Buffer.alloc(0);
	},
);
