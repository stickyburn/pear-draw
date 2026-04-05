const Autopass = require("autopass");
const Corestore = require("corestore");

const DEFAULT_SESSION = {
	status: "idle",
	mode: null,
	invite: "",
	error: "",
};

class PearDrawService {
	#storageRoot;
	#pass = null;
	#store = null;
	#session = { ...DEFAULT_SESSION };
	#objects = [];
	#cursors = [];
	#listeners = new Set();

	constructor(storageRoot) {
		this.#storageRoot = storageRoot;
	}

	getSnapshot() {
		return {
			session: { ...this.#session },
			objects: [...this.#objects],
			cursors: [...this.#cursors],
		};
	}

	subscribe(listener) {
		this.#listeners.add(listener);
		listener(this.getSnapshot());
		return () => this.#listeners.delete(listener);
	}

	async #closeCurrent() {
		const currentPass = this.#pass;
		const currentStore = this.#store;

		this.#pass = null;
		this.#store = null;

		await currentPass?.close?.().catch(() => {});
		await currentStore?.close?.().catch(() => {});
	}

	async startSession(profileName) {
		try {
			this.#session = {
				status: "connecting",
				mode: "host",
				invite: "",
				error: "",
			};
			this.#objects = [];
			this.#cursors = [];
			this.#emit();

			await this.#closeCurrent();

			const store = await this.#createStore(profileName);
			const pass = new Autopass(store);
			await pass.ready();

			const invite = await pass.createInvite();
			await this.#attach(pass, store, "host", invite);

			return invite;
		} catch (err) {
			this.#session = {
				status: "error",
				mode: "host",
				invite: "",
				error: err.message || "Failed to start session",
			};
			this.#emit();
			throw err;
		}
	}

	async joinSession(profileName, inviteCode) {
		const invite = inviteCode.trim();
		if (!invite) {
			this.#session = {
				status: "error",
				mode: "guest",
				invite: "",
				error: "Paste an invite code",
			};
			this.#emit();
			throw new Error("Invite code not entered");
		}

		let pair = null;
		try {
			this.#session = {
				status: "connecting",
				mode: "guest",
				invite: "",
				error: "",
			};
			this.#emit();
			this.#objects = [];
			this.#cursors = [];

			await this.#closeCurrent();

			const store = await this.#createStore(profileName);
			pair = Autopass.pair(store, invite);

			const timeout = new Promise((_, reject) =>
				setTimeout(() => reject(new Error("Pairing timed out")), 15000),
			);

			const pass = await Promise.race([pair.finished(), timeout]);
			await pass.ready();

			await this.#attach(pass, store, "guest");
		} catch (err) {
			await pair?.close?.().catch(() => {});

			this.#session = {
				status: "error",
				mode: "guest",
				invite: "",
				error: err.message || "Failed to join session",
			};
			this.#emit();
			throw err;
		}
	}

	async #createStore(profileName) {
		const safe = profileName.trim().replace(/[^a-zA-Z0-9_-]/g, "-") || "peer";
		return new Corestore(`${this.#storageRoot}/pear-draw/${safe}`);
	}

	async #attach(pass, store, mode, invite = "") {
		this.#pass = pass;
		this.#store = store;

		const onUpdate = () => this.#hydrate(pass);

		pass.on("update", onUpdate);
		await this.#hydrate(pass);

		this.#session = {
			status: "ready",
			mode,
			invite,
			error: "",
		};
		this.#emit();
	}

	async #hydrate(pass) {
		const records = await pass.list().toArray();
		const objects = [];
		const cursors = [];

		for (const rec of records) {
			try {
				if (rec.key.startsWith("object:")) {
					const value =
						typeof rec.value === "string" ? JSON.parse(rec.value) : rec.value;
					objects.push({
						id: rec.key,
						...value,
					});
				} else if (rec.key.startsWith("cursor:")) {
					const value =
						typeof rec.value === "string" ? JSON.parse(rec.value) : rec.value;
					cursors.push({
						peerId: rec.key.replace("cursor:", ""),
						...value,
					});
				}
			} catch {
				// Skip invalid records
			}
		}

		objects.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

		this.#objects = objects;
		this.#cursors = cursors;
		this.#emit();
	}

	#emit() {
		const snap = this.getSnapshot();
		for (const listener of this.#listeners) listener(snap);
	}

	async addObject(obj) {
		if (!this.#pass) throw new Error("No active session");

		const key = `object:${Date.now()}:${Math.random().toString(16).slice(2, 8)}`;
		const record = {
			id: key,
			...obj,
		};

		this.#objects = [...this.#objects, record];
		this.#emit();

		try {
			await this.#pass.add(key, JSON.stringify(obj));
		} catch (err) {
			this.#objects = this.#objects.filter((o) => o.id !== key);
			this.#emit();
			throw err;
		}
	}

	async updateObject(key, obj) {
		if (!this.#pass) throw new Error("No active session");

		await this.#pass.add(key, JSON.stringify(obj));

		this.#objects = this.#objects.map((o) =>
			o.id === key ? { ...o, ...obj, id: key } : o,
		);
		this.#emit();
	}

	async clearBoard() {
		if (!this.#pass) throw new Error("No active session");

		try {
			const records = await this.#pass.list().toArray();

			for (const record of records) {
				if (record.key.startsWith("object:")) {
					await this.#pass.remove(record.key);
				}
			}

			this.#objects = [];
			this.#emit();
		} catch (err) {
			console.error("Clear failed:", err);
			throw err;
		}
	}

	async updateCursor(peerId, cursorData) {
		if (!this.#pass) return;

		const key = `cursor:${peerId}`;
		const record = {
			peerId,
			...cursorData,
			updatedAt: Date.now(),
		};

		this.#cursors = this.#cursors.filter((c) => c.peerId !== peerId);
		this.#cursors.push(record);
		this.#emit();

		try {
			await this.#pass.add(key, JSON.stringify(cursorData));
		} catch (err) {
			console.error("Cursor update failed:", err);
		}
	}

	tick() {
		const now = Date.now();
		this.#cursors = this.#cursors.filter((c) => now - c.updatedAt < 5000);
	}

	async dispose() {
		await this.#closeCurrent();
		this.#listeners.clear();
	}
}

module.exports = { PearDrawService };
