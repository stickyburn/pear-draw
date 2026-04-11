import RPC from "bare-rpc";
import c from "compact-encoding";
import { BridgeTransport } from "./bridge-transport.mjs";
import {
	CMD_ADD_OBJECT,
	CMD_CLEAR_BOARD,
	CMD_DELETE_OBJECT,
	CMD_DISCONNECT,
	CMD_GET_SNAPSHOT,
	CMD_JOIN_HOST,
	CMD_START_HOST,
	CMD_UPDATE_CURSOR,
	CMD_UPDATE_OBJECT,
	EVT_SNAPSHOT,
} from "./rpc-commands.mjs";

const SPECIFIER = "pear-draw-core/src/worker.mjs";

export class PearDrawClient {
	#transport = null;
	#rpc = null;
	#snapshotListeners = new Set();

	constructor() {
		// Intentionally empty — call init() to start the worker and set up RPC
	}

	async init() {
		if (this.#rpc) return;

		if (typeof window === "undefined" || !window.bridge) {
			throw new Error(
				"PearDrawClient requires window.bridge (renderer context)",
			);
		}

		// Start the worker FIRST so it's in the workers map before we set up IPC
		console.log("[Renderer] Calling startWorker...");
		await window.bridge.startWorker(SPECIFIER);
		console.log("[Renderer] startWorker completed");

		// Create duplex stream transport (starts listening for incoming data)
		this.#transport = new BridgeTransport(SPECIFIER, window.bridge);

		// Create RPC over transport, handle incoming events from the worker
		this.#rpc = new RPC(this.#transport, (req) => {
			try {
				if (req.command === EVT_SNAPSHOT) {
					// Data is c.raw.utf8 encoded (length-prefixed string)
					const dataStr = c.decode(c.raw.utf8, req.data);
					const snapshot = JSON.parse(dataStr);
					for (const listener of this.#snapshotListeners) {
						listener(snapshot);
					}
				}
			} catch (err) {
				console.error("[WorkerClient] Error handling event:", err, "data:", req.data?.toString()?.slice(0, 100));
			}
		});
	}

	async #sendRequest(command, data) {
		console.log("[Renderer] Sending request:", command, JSON.stringify(data)?.slice(0, 100));
		const req = this.#rpc.request(command);
		// Stringify to avoid compact-encoding issues with nested objects
		req.send(JSON.stringify(data));
		const reply = await req.reply();
		// Data is c.raw.utf8 encoded (length-prefixed string)
		const replyStr = c.decode(c.raw.utf8, reply);
		console.log("[Renderer] Raw reply:", replyStr?.slice(0, 100));
		const result = JSON.parse(replyStr);
		console.log("[Renderer] Got reply for:", command);
		return result;
	}

	async startHost(profileName) {
		await this.init();
		return this.#sendRequest(CMD_START_HOST, { profileName });
	}

	async joinHost(profileName, inviteCode) {
		await this.init();
		return this.#sendRequest(CMD_JOIN_HOST, { profileName, inviteCode });
	}

	async addObject(obj) {
		await this.init();
		return this.#sendRequest(CMD_ADD_OBJECT, { obj });
	}

	async updateObject(id, updates) {
		await this.init();
		return this.#sendRequest(CMD_UPDATE_OBJECT, { id, updates });
	}

	async deleteObject(id) {
		await this.init();
		return this.#sendRequest(CMD_DELETE_OBJECT, { id });
	}

	async updateCursor(peerId, data) {
		await this.init();
		return this.#sendRequest(CMD_UPDATE_CURSOR, { peerId, data });
	}

	async clearBoard() {
		await this.init();
		return this.#sendRequest(CMD_CLEAR_BOARD, {});
	}

	async disconnect() {
		await this.init();
		return this.#sendRequest(CMD_DISCONNECT, {});
	}

	async getSnapshot() {
		await this.init();
		return this.#sendRequest(CMD_GET_SNAPSHOT, {});
	}

	async subscribe() {
		await this.init();
		return this.getSnapshot();
	}

	onSnapshot(listener) {
		this.#snapshotListeners.add(listener);
		return () => this.#snapshotListeners.delete(listener);
	}

	destroy() {
		this.#snapshotListeners.clear();
		if (this.#transport) {
			this.#transport.destroy();
			this.#transport = null;
		}
		this.#rpc = null;
	}
}
