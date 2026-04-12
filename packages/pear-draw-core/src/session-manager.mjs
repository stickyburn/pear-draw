// ─────────────────────────────────────────────────────────────────
// Session Manager — Starts, joins, and disconnects P2P sessions
// using Autopass over Corestore.
// ─────────────────────────────────────────────────────────────────

import Autopass from "autopass";
import Corestore from "corestore";
import fs from "bare-fs";

const DEFAULT_SESSION = {
	status: "idle",
	mode: null,
	invite: "",
	error: "",
};

export class SessionManager {
	#storageRoot;
	#pass = null;
	#store = null;
	#session = { ...DEFAULT_SESSION };

	/** @param {(session) => void} onUpdate — called whenever session state changes */
	constructor(storageRoot, onUpdate) {
		this.#storageRoot = storageRoot;
		this.onUpdate = onUpdate;
	}

	get session() {
		return { ...this.#session };
	}

	get pass() {
		return this.#pass;
	}

	#setSession(partial) {
		this.#session = { ...this.#session, ...partial };
		this.onUpdate?.(this.#session);
	}

	async #createStore(profileName, { clean = false } = {}) {
		const safe = profileName.trim().replace(/[^a-zA-Z0-9_-]/g, "-") || "peer";
		const dir = `${this.#storageRoot}/pear-draw/${safe}`;
		if (clean) {
			await this.#closeCurrent();
			try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
		}
		return new Corestore(dir);
	}

	async #closeCurrent() {
		const currentPass = this.#pass;
		const currentStore = this.#store;
		this.#pass = null;
		this.#store = null;
		await currentPass?.close?.().catch(() => {});
		await currentStore?.close?.().catch(() => {});
	}

	async prepareHostSession(profileName) {
		try {
			this.#setSession({ status: "connecting", mode: "host", invite: "", error: "" });
			await this.#closeCurrent();

			const store = await this.#createStore(profileName);
			const pass = new Autopass(store);
			await pass.ready();

			const invite = await pass.createInvite();
			this.#pass = pass;
			this.#store = store;
			return invite;
		} catch (err) {
			this.#setSession({ status: "error", mode: "host", invite: "", error: err.message || "Failed to start session" });
			throw err;
		}
	}

	async prepareJoinSession(profileName, inviteCode) {
		const invite = inviteCode.trim();
		if (!invite) {
			this.#setSession({ status: "error", mode: "guest", invite: "", error: "Paste an invite code" });
			throw new Error("Invite code not entered");
		}

		let pair = null;
		try {
			this.#setSession({ status: "connecting", mode: "guest", invite: "", error: "" });

			// Guest must start from a clean store — stale Autopass pairing
			// data from a previous session conflicts with the new invite.
			const store = await this.#createStore(profileName, { clean: true });
			pair = Autopass.pair(store, invite);

			const timeout = new Promise((_, reject) =>
				setTimeout(() => reject(new Error("Pairing timed out")), 15000),
			);

			const pass = await Promise.race([pair.finished(), timeout]);
			await pass.ready();

			this.#pass = pass;
			this.#store = store;
		} catch (err) {
			await pair?.close?.().catch(() => {});
			this.#setSession({ status: "error", mode: "guest", invite: "", error: err.message || "Failed to join session" });
			throw err;
		}
	}

	setReady(mode, invite = "") {
		this.#setSession({ status: "ready", mode, invite, error: "" });
	}

	async disconnect() {
		await this.#closeCurrent();
		this.#session = { ...DEFAULT_SESSION };
		this.onUpdate?.(this.#session);
	}

	async dispose() {
		await this.#closeCurrent();
		this.#session = { ...DEFAULT_SESSION };
	}
}