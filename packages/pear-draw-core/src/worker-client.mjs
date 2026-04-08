import RPC from "bare-rpc";
import c from "compact-encoding";
import { BridgeTransport } from "./bridge-transport.mjs";
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

		// Create duplex stream transport (starts listening for incoming data)
		this.#transport = new BridgeTransport(SPECIFIER, window.bridge);

		// Create RPC over transport, handle incoming events from the worker
		this.#rpc = new RPC(this.#transport, (req) => {
			try {
				if (req.command === EVT_SNAPSHOT) {
					const snapshot = c.decode(c.any, req.data);
					for (const listener of this.#snapshotListeners) {
						listener(snapshot);
					}
				}
			} catch (err) {
				console.error("[WorkerClient] Error handling event:", err);
			}
		});

		// Start the worker — transport is already listening, so no data is lost
		await window.bridge.startWorker(SPECIFIER);
	}

	async #sendRequest(command, data) {
		const req = this.#rpc.request(command);
		req.send(data, c.any);
		return req.reply(c.any);
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

	async updateCursor(peerId, data) {
		await this.init();
		return this.#sendRequest(CMD_UPDATE_CURSOR, { peerId, data });
	}

	async clearBoard() {
		await this.init();
		return this.#sendRequest(CMD_CLEAR_BOARD, {});
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
