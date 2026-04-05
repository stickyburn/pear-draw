import ProtomuxRPC from "protomux-rpc";
import c from "compact-encoding";

// Create a proper duplex stream wrapper for the IPC bridge
class IPCStream {
	#write;
	#unsubscribe;
	#handlers = new Map();
	destroyed = false;

	constructor(write, subscribe) {
		this.#write = write;

		this.#unsubscribe = subscribe((data) => {
			// Data from Electron IPC - convert to Uint8Array if needed
			const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
			for (const [event, handlers] of this.#handlers) {
				if (event === "data") {
					for (const h of handlers) h(buf);
				}
			}
		});
	}

	on(event, fn) {
		if (!this.#handlers.has(event)) {
			this.#handlers.set(event, new Set());
		}
		this.#handlers.get(event).add(fn);
		return this;
	}

	write(data) {
		if (this.destroyed) return false;
		this.#write(data);
		return true;
	}

	end() {
		this.destroy();
	}

	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.#unsubscribe?.();
		this.#handlers.clear();
	}

	pause() {
		// Not implemented
	}

	resume() {
		// Not implemented
	}
}

// Helper for empty buffer (works in both Node.js and browser)
function emptyBuffer() {
	return new Uint8Array(0);
}

export class WorkerClient {
	#rpc;
	#stream;
	#snapshotListeners = new Set();
	#pollInterval = null;

	constructor(write, subscribe) {
		this.#stream = new IPCStream(write, subscribe);
		this.#rpc = new ProtomuxRPC(this.#stream, {
			protocol: "pear-draw-rpc",
		});
	}

	startPolling(intervalMs = 100) {
		if (this.#pollInterval) return;
		
		const poll = async () => {
			try {
				const snapshot = await this.getSnapshot();
				for (const listener of this.#snapshotListeners) {
					listener(snapshot);
				}
			} catch (err) {
				// Stop polling on errors (worker disconnected)
				this.stopPolling();
			}
		};
		
		this.#pollInterval = setInterval(poll, intervalMs);
		// Initial poll
		poll();
	}

	stopPolling() {
		if (this.#pollInterval) {
			clearInterval(this.#pollInterval);
			this.#pollInterval = null;
		}
	}

	async startHost(profileName) {
		const result = await this.#rpc.request("session.startHost", profileName, {
			requestEncoding: c.string,
			responseEncoding: c.string,
		});
		return result;
	}

	async joinHost(profileName, inviteCode) {
		const payload = { profileName, inviteCode };
		await this.#rpc.request("session.joinHost", payload, {
			requestEncoding: c.json,
			responseEncoding: c.raw,
		});
	}

	async addObject(obj) {
		await this.#rpc.request("session.addObject", obj, {
			requestEncoding: c.json,
			responseEncoding: c.raw,
		});
	}

	async updateObject(id, updates) {
		await this.#rpc.request("session.updateObject", { id, updates }, {
			requestEncoding: c.json,
			responseEncoding: c.raw,
		});
	}

	async updateCursor(peerId, data) {
		await this.#rpc.request("session.updateCursor", { peerId, data }, {
			requestEncoding: c.json,
			responseEncoding: c.raw,
		});
	}

	async clearBoard() {
		await this.#rpc.request("session.clearBoard", emptyBuffer(), {
			requestEncoding: c.raw,
			responseEncoding: c.raw,
		});
	}

	async getSnapshot() {
		return await this.#rpc.request("session.getSnapshot", emptyBuffer(), {
			requestEncoding: c.raw,
			responseEncoding: c.json,
		});
	}

	async subscribe() {
		// Start polling instead of using events
		this.startPolling();
		await this.#rpc.request("session.subscribe", emptyBuffer(), {
			requestEncoding: c.raw,
			responseEncoding: c.raw,
		});
	}

	onSnapshot(listener) {
		this.#snapshotListeners.add(listener);
		return () => this.#snapshotListeners.delete(listener);
	}

	destroy() {
		this.stopPolling();
		this.#stream.destroy();
		this.#snapshotListeners.clear();
	}
}
