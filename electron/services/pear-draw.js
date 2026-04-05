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
	#strokes = [];
	#listeners = new Set();

	constructor(storageRoot) {
		this.#storageRoot = storageRoot;
	}

	getSnapshot() {
		return {
			session: { ...this.#session },
			strokes: [...this.#strokes],
		};
	}

	subscribe(listener) {
		this.#listeners.add(listener);
		listener(this.getSnapshot());
		return () => this.#listeners.delete(listener);
	}

	async startSession(profileName) {
		try {
			this.#session = {
				status: "connecting",
				mode: "host",
				invite: "",
				error: "",
			};
			this.#strokes = [];
			this.#emit();

			await this.#closeCurrent();

			const store = this.#createStore(profileName);
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
			this.#strokes = [];

			await this.#closeCurrent();

			const store = this.#createStore(profileName);
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

	async addStroke(stroke) {
		if (!this.#pass) return;

		const key = `stroke:${Date.now()}:${Math.random().toString(16).slice(2, 8)}`;
		const record = { ...stroke, id: key };

		this.#strokes = [...this.#strokes, record];
		this.#emit();

		try {
			await this.#pass.add(
				key,
				JSON.stringify({
					points: record.points,
					color: record.color,
					width: record.width,
					createdAt: record.createdAt,
					author: record.author,
				}),
			);
		} catch (err) {
			this.#strokes = this.#strokes.filter((s) => s.id !== key);
			this.#emit();
			throw err;
		}
	}

	async clearBoard() {
		if (!this.#pass) throw new Error("No active session");

		try {
			const records = await this.#pass.list().toArray();

			for (const record of records) {
				if (record.key.startsWith("stroke:")) {
					await this.#pass.remove(record.key);
				}
			}

			this.#strokes = [];
			this.#emit();
		} catch (err) {
			console.error("Clear failed:", err);
			throw err;
		}
	}

	async dispose() {
		await this.#closeCurrent();
		this.#listeners.clear();
	}

	#emit() {
		const snap = this.getSnapshot();
		for (const listener of this.#listeners) listener(snap);
	}

	#createStore(profileName) {
		const safe = profileName.trim().replace(/[^a-zA-Z0-9_-]/g, "-") || "peer";
		return new Corestore(`${this.#storageRoot}/pear-draw/${safe}`);
	}

	async #closeCurrent() {
		const currentPass = this.#pass;
		const currentStore = this.#store;

		this.#pass = null;
		this.#store = null;

		await currentPass?.close?.().catch(() => {});
		await currentStore?.close?.().catch(() => {});
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
		const strokes = [];

		for (const rec of records) {
			if (!rec.key.startsWith("stroke:")) continue;

			try {
				const value = JSON.parse(rec.value);

				if (!Array.isArray(value?.points) || value.points.length < 2) continue;

				strokes.push({
					id: rec.key,
					color: value.color || "#60a5fa",
					width: Number.isFinite(value.width) ? value.width : 3,
					points: value.points,
					createdAt: Number.isFinite(value.createdAt)
						? value.createdAt
						: Date.now(),
					author: value.author || "peer",
				});
			} catch {}
		}

		strokes.sort((a, b) => a.createdAt - b.createdAt);

		this.#strokes = strokes;
		this.#emit();
	}
}

module.exports = { PearDrawService };
