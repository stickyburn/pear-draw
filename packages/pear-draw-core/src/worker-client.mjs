import RPC from "bare-rpc";
import c from "compact-encoding";
import { BridgeTransport } from "./bridge-transport.mjs";
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

const SPECIFIER = "pear-draw-core/src/worker.mjs";

export class PearDrawClient {
	#transport = null;
	#rpc = null;
	#snapshotListeners = new Set();
	#cursorUpdateListeners = new Set();
	#cursorRemoveListeners = new Set();
	#cursorLeaveListeners = new Set();

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
		await window.bridge.startWorker(SPECIFIER);

		// Create duplex stream transport (starts listening for incoming data)
		this.#transport = new BridgeTransport(SPECIFIER, window.bridge);

		// Create RPC over transport, handle incoming events from the worker
		this.#rpc = new RPC(this.#transport, (req) => {
			try {
				if (req.command === EVT_SNAPSHOT) {
					const dataStr = c.decode(c.raw.utf8, req.data);
					const snapshot = JSON.parse(dataStr);
					for (const listener of this.#snapshotListeners) {
						listener(snapshot);
					}
				} else if (req.command === EVT_CURSOR_UPDATE) {
					const dataStr = c.decode(c.raw.utf8, req.data);
					const cursor = JSON.parse(dataStr);
					for (const listener of this.#cursorUpdateListeners) {
						listener(cursor);
					}
				} else if (req.command === EVT_CURSOR_LEAVE) {
					const dataStr = c.decode(c.raw.utf8, req.data);
					const data = JSON.parse(dataStr);
					for (const listener of this.#cursorLeaveListeners) {
						listener(data);
					}
				} else if (req.command === EVT_CURSOR_REMOVE) {
					const dataStr = c.decode(c.raw.utf8, req.data);
					const data = JSON.parse(dataStr);
					for (const listener of this.#cursorRemoveListeners) {
						listener(data);
					}
				}
			} catch (err) {
				console.error("[WorkerClient] Error handling event:", err, "data:", req.data?.toString()?.slice(0, 100));
			}
		});
	}

	async #sendRequest(command, data) {
		const req = this.#rpc.request(command);
		// Stringify to avoid compact-encoding issues with nested objects
		req.send(JSON.stringify(data));
		const reply = await req.reply();
		// Data is c.raw.utf8 encoded (length-prefixed string)
		const replyStr = c.decode(c.raw.utf8, reply);
		const result = JSON.parse(replyStr);
		return result;
	}

	async #sendFireAndForget(command, data) {
		try {
			const req = this.#rpc.request(command);
			req.send(JSON.stringify(data));
			// Don't await reply for low-latency cursor updates
			req.reply().catch(() => {});
		} catch {
			// Fire-and-forget — silently ignore errors
		}
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

	/** Legacy cursor update (calls CMD_UPDATE_CURSOR, which wraps to moveCursor on service) */
	async updateCursor(peerId, data) {
		await this.init();
		return this.#sendRequest(CMD_UPDATE_CURSOR, { peerId, data });
	}

	/** Ephemeral cursor: send local cursor position (fire-and-forget for low latency) */
	moveCursor(peerId, data) {
		if (!this.#rpc) return;
		this.#sendFireAndForget(CMD_CURSOR_MOVE, { peerId, ...data });
	}

	/** Ephemeral cursor: local pointer left the canvas */
	leaveCursor(peerId) {
		if (!this.#rpc) return;
		this.#sendFireAndForget(CMD_CURSOR_LEAVE, { peerId });
	}

	async clearBoard() {
		await this.init();
		return this.#sendRequest(CMD_CLEAR_BOARD, {});
	}

	/**
	 * Disconnect from the current session.
	 * @param {Object} options
	 * @param {boolean} options.soft - If true, suspend instead of full disconnect (default: true)
	 */
	async disconnect(options = { soft: true }) {
		await this.init();
		return this.#sendRequest(CMD_DISCONNECT, { soft: options.soft !== false });
	}

	/**
	 * Reconnect to a suspended session.
	 * Instantly resumes without re-pairing.
	 */
	async reconnect() {
		await this.init();
		return this.#sendRequest(CMD_RECONNECT, {});
	}

	/**
	 * Suspend the current session (alias for disconnect({ soft: true })).
	 */
	async suspend() {
		await this.init();
		return this.#sendRequest(CMD_SUSPEND, {});
	}

	/**
	 * Check if the current session can be reconnected.
	 * Returns the session status from the snapshot.
	 */
	async canReconnect() {
		await this.init();
		const snapshot = await this.getSnapshot();
		return snapshot.session?.status === 'suspended';
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

	onCursorUpdate(listener) {
		this.#cursorUpdateListeners.add(listener);
		return () => this.#cursorUpdateListeners.delete(listener);
	}

	onCursorRemove(listener) {
		this.#cursorRemoveListeners.add(listener);
		return () => this.#cursorRemoveListeners.delete(listener);
	}

	onCursorLeave(listener) {
		this.#cursorLeaveListeners.add(listener);
		return () => this.#cursorLeaveListeners.delete(listener);
	}

	destroy() {
		this.#snapshotListeners.clear();
		this.#cursorUpdateListeners.clear();
		this.#cursorRemoveListeners.clear();
		this.#cursorLeaveListeners.clear();
		if (this.#transport) {
			this.#transport.destroy();
			this.#transport = null;
		}
		this.#rpc = null;
	}
}