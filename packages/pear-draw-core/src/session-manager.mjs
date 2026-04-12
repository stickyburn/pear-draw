// ─────────────────────────────────────────────────────────────────
// Session Manager — Starts, joins, and disconnects P2P sessions
// using Autopass over Corestore. Handles the full lifecycle:
// creating/opening stores, pairing, and cleaning up on disconnect.
//
// Does NOT set session status to "ready" — that's the caller's
// responsibility after hydration is complete.
// ─────────────────────────────────────────────────────────────────

import Autopass from "autopass";
import Corestore from "corestore";

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

	async #createStore(profileName) {
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

	/**
	 * Prepare a host session. Creates Autopass + Corestore, generates invite.
	 * Returns { pass, invite } — caller must attach listeners and set "ready".
	 */
	async prepareHostSession(profileName) {
		try {
			this.#setSession({
				status: "connecting",
				mode: "host",
				invite: "",
				error: "",
			});
			await this.#closeCurrent();

			const store = await this.#createStore(profileName);
			const pass = new Autopass(store);
			await pass.ready();

			const invite = await pass.createInvite();
			this.#pass = pass;
			this.#store = store;
			return invite;
		} catch (err) {
			this.#setSession({
				status: "error",
				mode: "host",
				invite: "",
				error: err.message || "Failed to start session",
			});
			throw err;
		}
	}

	/**
	 * Prepare a join session. Pairs with host via invite code.
	 * Returns nothing — caller must attach listeners and set "ready".
	 */
	async prepareJoinSession(profileName, inviteCode) {
		const invite = inviteCode.trim();
		if (!invite) {
			this.#setSession({
				status: "error",
				mode: "guest",
				invite: "",
				error: "Paste an invite code",
			});
			throw new Error("Invite code not entered");
		}

		let pair = null;
		try {
			this.#setSession({
				status: "connecting",
				mode: "guest",
				invite: "",
				error: "",
			});
			await this.#closeCurrent();

			const store = await this.#createStore(profileName);

			pair = Autopass.pair(store, invite);

			const timeout = new Promise((_, reject) =>
				setTimeout(() => reject(new Error("Pairing timed out")), 15000),
			);

			console.log("[SessionManager] Waiting for pair to finish...");
			const pass = await Promise.race([pair.finished(), timeout]);
			console.log("[SessionManager] Pair finished, awaiting pass.ready()...");
			await pass.ready();
			console.log("[SessionManager] Pass ready, storing...");

			this.#pass = pass;
			this.#store = store;
			console.log("[SessionManager] prepareJoinSession complete");
		} catch (err) {
			console.error("[SessionManager] prepareJoinSession error:", err.message);
			await pair?.close?.().catch(() => {});
			this.#setSession({
				status: "error",
				mode: "guest",
				invite: "",
				error: err.message || "Failed to join session",
			});
			throw err;
		}
	}

	/** Set session status to "ready" — called after hydration completes. */
	setReady(mode, invite = "") {
		this.#setSession({ status: "ready", mode, invite, error: "" });
	}

	/** Disconnect and reset to idle. */
	async disconnect() {
		await this.#closeCurrent();
		this.#session = { ...DEFAULT_SESSION };
		this.onUpdate?.(this.#session);
	}

	/** Dispose — clean up everything. */
	async dispose() {
		await this.#closeCurrent();
		this.#session = { ...DEFAULT_SESSION };
	}
}
