// ─────────────────────────────────────────────────────────────────
// SessionManager — One Corestore, one Hyperswarm, one Autobase.
//
// Merged from the old BoardManager + Board + SessionManager into
// a single class following the canonical Holepunch pattern:
//
//   swarm.on('connection', socket => base.replicate(socket))
//   swarm.join(base.discoveryKey, { server: true, client: true })
//
// This file IS the board — the `.board` getter returns `this`.
// PearDrawService accesses board-like methods directly on this.
// ─────────────────────────────────────────────────────────────────

import Autobase from "autobase";
import b4a from "b4a";
import Corestore from "corestore";
import Hyperswarm from "hyperswarm";
import { apply, hydrateCursors, hydrateView, open } from "./apply.mjs";
import { createInvite, isValidInvite, parseInvite } from "./invite.mjs";
import {
	STATUS_CONNECTING,
	STATUS_ERROR,
	STATUS_IDLE,
	STATUS_READY,
	STATUS_SUSPENDED,
} from "./rpc-commands.mjs";

const DEFAULT_SESSION = {
	status: STATUS_IDLE,
	mode: null,
	boardKey: null,
	localKey: null,
	invite: "",
	error: "",
};

export class SessionManager {
	#storageRoot;
	#store = null;
	#swarm = null;
	#base = null;
	#view = null;
	#key = null;
	#encryptionKey = null;
	#localKey = null;
	#started = false;
	#session = { ...DEFAULT_SESSION };
	#onUpdate;
	#updateHandler = null;
	#writableHandler = null;
	#discovery = null;

	constructor(storageRoot, onUpdate) {
		this.#storageRoot = storageRoot;
		this.#onUpdate = onUpdate;
	}

	// ─── Session state ─────────────────────────────────────────────

	get session() {
		return { ...this.#session };
	}

	/** Returns this as a board-like interface for PearDrawService */
	get board() {
		return this.#base ? this : null;
	}

	get base() {
		return this.#base;
	}

	get writable() {
		return this.#base?.writable ?? false;
	}

	get localKey() {
		return this.#localKey;
	}

	get key() {
		return this.#key;
	}

	get encryptionKey() {
		return this.#encryptionKey;
	}

	#setSession(partial) {
		this.#session = { ...this.#session, ...partial };
		this.#onUpdate?.(this.#session);
	}

	// ─── Corestore + Hyperswarm lifecycle ──────────────────────────

	async #ensureStarted() {
		if (this.#started) return;

		this.#store = new Corestore(`${this.#storageRoot}/corestore`);
		await this.#store.ready();

		this.#swarm = new Hyperswarm({
			keyPair: await this.#store.createKeyPair("hyperswarm"),
		});

		// THE critical Holepunch pattern:
		// base.replicate(socket) — NOT store.replicate(socket)
		// This attaches the Autobase wakeup protocol so the host
		// discovers the guest's local writer core via ProtomuxWakeup.
		this.#swarm.on("connection", (socket) => {
			if (this.#base) {
				this.#base.replicate(socket);
			} else {
				this.#store.replicate(socket);
			}
		});

		this.#started = true;
	}

	// ─── Session lifecycle ─────────────────────────────────────────

	async startSession(_profileName) {
		try {
			this.#setSession({ status: STATUS_CONNECTING, mode: "host", error: "" });
			await this.#ensureStarted();
			await this.#closeBase();

			// null bootstrap = create new Autobase
			this.#base = new Autobase(this.#store, null, {
				open,
				apply,
				valueEncoding: "json",
				optimistic: true, // Allow non-writers to append (join-requests, cursors)
				encrypt: true,
				ackInterval: 1000,
			});
			await this.#base.ready();

			this.#key = b4a.toString(this.#base.key, "hex");
			this.#encryptionKey = b4a.toString(this.#base.encryptionKey, "hex");
			this.#localKey = b4a.toString(this.#base.local.key, "hex");
			this.#view = this.#base.view;

			// Join swarm on this Autobase's discovery key
			this.#discovery = this.#base.discoveryKey;
			this.#swarm.join(this.#discovery, { server: true, client: true });
			await this.#swarm.flush();

			const invite = createInvite(this.#key, this.#encryptionKey);

			this.#setSession({
				status: STATUS_READY,
				mode: "host",
				boardKey: this.#key,
				localKey: this.#localKey,
				invite,
			});

			return invite;
		} catch (err) {
			this.#setSession({
				status: STATUS_ERROR,
				mode: "host",
				error: err.message || "Failed to start session",
			});
			throw err;
		}
	}

	async joinSession(profileName, inviteCode) {
		const invite = inviteCode.trim();
		if (!invite || !isValidInvite(invite)) {
			this.#setSession({
				status: STATUS_ERROR,
				mode: "guest",
				error: "Invalid invite code",
			});
			throw new Error("Invalid invite code");
		}

		try {
			this.#setSession({ status: STATUS_CONNECTING, mode: "guest", error: "" });
			await this.#ensureStarted();
			await this.#closeBase();

			const { boardKey, encryptionKey } = parseInvite(invite);
			const keyBuffer = b4a.from(boardKey, "hex");
			const encBuffer = b4a.from(encryptionKey, "hex");

			// Bootstrap from host's key = join existing Autobase
			this.#base = new Autobase(this.#store, keyBuffer, {
				open,
				apply,
				encryptionKey: encBuffer,
				valueEncoding: "json",
				optimistic: true, // Allow non-writers to append (join-requests, cursors)
				encrypt: true,
				ackInterval: 1000,
			});
			await this.#base.ready();

			this.#key = b4a.toString(this.#base.key, "hex");
			this.#encryptionKey = b4a.toString(this.#base.encryptionKey, "hex");
			this.#localKey = b4a.toString(this.#base.local.key, "hex");
			this.#view = this.#base.view;

			// Join swarm
			this.#discovery = this.#base.discoveryKey;
			this.#swarm.join(this.#discovery, { server: true, client: true });
			await this.#swarm.flush();

			// Listen for writable BEFORE appending (event can fire during apply)
			this.#writableHandler = () => {
				if (this.#base?.writable) {
					this.#setSession({ status: STATUS_READY });
				}
			};
			this.#base.on("writable", this.#writableHandler);

			// Check if already writable (rejoining as existing writer)
			if (this.#base.writable) {
				this.#setSession({
					status: STATUS_READY,
					mode: "guest",
					boardKey: this.#key,
					localKey: this.#localKey,
					invite: "",
				});
				return;
			}

			// Request write access — optimistic append.
			// Host's apply() will see this, call ackWriter + addWriter,
			// and we'll get the "writable" event once the system view syncs.
			// Request write access — optimistic append.
			await this.#base.append(
				{
					type: "join-request",
					key: this.#localKey,
					name: profileName,
					timestamp: Date.now(),
				},
				{ optimistic: true },
			);

			// Only set CONNECTING if writable hasn't already fired (sets READY)
			if (this.#session.status !== STATUS_READY) {
				this.#setSession({
					status: STATUS_CONNECTING,
					mode: "guest",
					boardKey: this.#key,
					localKey: this.#localKey,
					invite: "",
				});
			}
		} catch (err) {
			this.#setSession({
				status: STATUS_ERROR,
				mode: "guest",
				error: err.message || "Failed to join session",
			});
			throw err;
		}
	}

	async disconnect(options = { soft: true }) {
		if (!this.#base) {
			this.#setSession({ ...DEFAULT_SESSION });
			return;
		}

		this.offUpdate();

		if (options.soft) {
			// Soft disconnect — leave swarm topic, pause Autobase, keep in memory
			if (this.#discovery) this.#swarm.leave(this.#discovery);
			this.#base.pause();
			this.#setSession({ status: STATUS_SUSPENDED });
		} else {
			// Hard disconnect — full cleanup
			await this.#closeBase();
			this.#setSession({ ...DEFAULT_SESSION });
		}
	}

	async reconnect() {
		if (!this.#session.boardKey) throw new Error("No session to reconnect");
		if (this.#session.status !== STATUS_SUSPENDED)
			throw new Error("Session is not suspended");

		this.#base.resume();
		this.#swarm.join(this.#discovery, { server: true, client: true });
		await this.#swarm.flush();
		this.#setSession({ status: STATUS_READY });
	}

	// ─── Board-like interface (exposed via .board) ─────────────────
	//
	// PearDrawService accesses these through sessionManager.board.
	// Since .board returns this, these methods live right here.

	onUpdate(callback) {
		if (!this.#base) return;
		this.offUpdate();

		this.#updateHandler = async () => {
			try {
				const objects = await this.getObjects();
				callback(objects);
			} catch (err) {
				console.error("[Session] Update handler error:", err.message);
			}
		};

		this.#base.on("update", this.#updateHandler);
	}

	offUpdate() {
		if (this.#updateHandler && this.#base) {
			this.#base.off("update", this.#updateHandler);
		}
		this.#updateHandler = null;
	}

	onWritable(callback) {
		if (!this.#base) return;
		const handler = () => callback(this.#base.writable);
		this.#base.on("writable", handler);
	}

	async getObjects() {
		if (!this.#view) return [];
		await this.#view.ready();
		return hydrateView(this.#view);
	}

	async getCursors() {
		if (!this.#view) return [];
		await this.#view.ready();
		return hydrateCursors(this.#view);
	}

	async addObject(obj) {
		if (!this.#base?.writable) throw new Error("Board not writable");
		await this.#base.append({
			type: "put",
			id: obj.id,
			value: obj,
			timestamp: Date.now(),
		});
	}

	async updateObject(id, updates) {
		if (!this.#base?.writable) throw new Error("Board not writable");
		await this.#base.append({
			type: "put",
			id,
			value: updates,
			timestamp: Date.now(),
		});
	}

	async deleteObject(id) {
		if (!this.#base?.writable) throw new Error("Board not writable");
		await this.#base.append({
			type: "del",
			id,
			timestamp: Date.now(),
		});
	}

	async clearObjects() {
		if (!this.#base?.writable) throw new Error("Board not writable");
		await this.#base.append({
			type: "clear",
			timestamp: Date.now(),
		});
	}

	async appendCursor(cursorData) {
		if (!this.#base) throw new Error("Board not initialized");
		await this.#base.append(
			{
				type: "cursor",
				peerId: cursorData.peerId,
				profileName: cursorData.profileName,
				x: cursorData.x,
				y: cursorData.y,
				clicking: cursorData.clicking,
				timestamp: Date.now(),
			},
			{ optimistic: true },
		);
	}

	async requestWriteAccess(profileName) {
		if (!this.#base) throw new Error("Board not initialized");
		await this.#base.append(
			{
				type: "join-request",
				key: this.#localKey,
				name: profileName,
				timestamp: Date.now(),
			},
			{ optimistic: true },
		);
	}

	// ─── Cleanup ───────────────────────────────────────────────────

	async #closeBase() {
		this.offUpdate();

		if (this.#writableHandler && this.#base) {
			this.#base.off("writable", this.#writableHandler);
			this.#writableHandler = null;
		}

		if (this.#discovery && this.#swarm) {
			this.#swarm.leave(this.#discovery);
			this.#discovery = null;
		}

		if (this.#base) {
			await this.#base.close().catch(() => {});
			this.#base = null;
			this.#view = null;
		}
	}

	async dispose() {
		await this.#closeBase();

		if (this.#swarm) {
			await this.#swarm.destroy();
			this.#swarm = null;
		}
		if (this.#store) {
			await this.#store.close();
			this.#store = null;
		}

		this.#started = false;
		this.#session = { ...DEFAULT_SESSION };
	}

	// Multi-board removed — single session at a time
	async listBoards() {
		return [];
	}
}
