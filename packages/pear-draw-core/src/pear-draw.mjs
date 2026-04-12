// ─────────────────────────────────────────────────────────────────
// PearDrawService — Orchestrator for P2P collaborative drawing.
// Composes SessionManager, ObjectStore, and CursorManager.
//
// Architecture:
//   - SessionManager manages P2P session lifecycle (Autopass/Corestore)
//   - ObjectStore is a pure data store for canvas objects (no events)
//   - CursorManager is a pure data store for cursor positions (no events)
//   - PearDrawService is the SOLE emitter: all state changes flow
//     through #emit() which notifies listeners via EVT_SNAPSHOT
//   - Cursor events are emitted via separate onCursorUpdate listeners
//
// Sync strategy:
//   - Objects are written to Autopass for durable P2P sync
//   - Cursor positions are ephemeral: written to Autopass for P2P
//     propagation but loaded from Autopass records on hydrate
//   - Trail data (EMA smoothing, age) is computed purely in the
//     renderer's CursorInterpolator — never stored or synced
// ─────────────────────────────────────────────────────────────────

import { CursorManager } from "./cursor-manager.mjs";
import { ObjectStore } from "./object-store.mjs";
import { SessionManager } from "./session-manager.mjs";

class PearDrawService {
	#storageRoot;
	#sessionManager;
	#objectStore;
	#cursorManager;
	#listeners = new Set();
	#cursorListeners = new Set();
	#pass = null; // active Autopass instance (set during attach)

	constructor(storageRoot) {
		this.#storageRoot = storageRoot;
		this.#sessionManager = new SessionManager(storageRoot, () => this.#emit());
		this.#objectStore = new ObjectStore();
		this.#cursorManager = new CursorManager();
	}

	// ─── Snapshot ─────────────────────────────────────────────────

	getSnapshot() {
		return {
			session: this.#sessionManager.session,
			objects: this.#objectStore.getObjects(),
		};
	}

	subscribe(listener) {
		this.#listeners.add(listener);
		const snap = this.getSnapshot();
		listener(snap);
		return () => this.#listeners.delete(listener);
	}

	onCursorUpdate(listener) {
		this.#cursorListeners.add(listener);
		return () => this.#cursorListeners.delete(listener);
	}

	#emit() {
		const snap = this.getSnapshot();
		for (const listener of this.#listeners) listener(snap);
	}

	#emitCursors(data) {
		for (const listener of this.#cursorListeners) {
			try {
				listener(data);
			} catch {}
		}
	}

	// ─── Session Lifecycle ────────────────────────────────────────

	async startSession(profileName) {
		// Clear stale data before starting a new session
		this.#objectStore.clear();
		this.#cursorManager.clear();
		this.#emit();

		try {
			const invite = await this.#sessionManager.prepareHostSession(profileName);
			await this.#attach(this.#sessionManager.pass, "host", invite);
			return invite;
		} catch (err) {
			this.#emit();
			throw err;
		}
	}

	async joinSession(profileName, inviteCode) {
		// Clear stale data before joining a new session
		this.#objectStore.clear();
		this.#cursorManager.clear();
		this.#emit();

		try {
			await this.#sessionManager.prepareJoinSession(profileName, inviteCode);
			await this.#attach(this.#sessionManager.pass, "guest");
		} catch (err) {
			this.#emit();
			throw err;
		}
	}

	async disconnect() {
		await this.#sessionManager.disconnect();
		this.#objectStore.clear();
		this.#cursorManager.clear();
		this.#pass = null;
		this.#emit();
	}

	// ─── Object CRUD ─────────────────────────────────────────────

	async addObject(obj) {
		if (!obj) {
			console.error("[Service] addObject received undefined object!");
			throw new Error("Cannot add undefined object");
		}
		if (!this.#pass) {
			console.error("[Service] No active session!");
			throw new Error("No active session");
		}

		const key = obj.id;
		this.#objectStore.add(obj);
		this.#emit();

		try {
			await this.#pass.add(key, JSON.stringify(obj));
		} catch (err) {
			console.error("[Service] autopass.add error:", err);
			this.#objectStore.rollbackAdd(key);
			this.#emit();
			throw err;
		}
	}

	async updateObject(key, obj) {
		if (!this.#pass) throw new Error("No active session");

		await this.#pass.add(key, JSON.stringify(obj));
		this.#objectStore.update(key, obj);
		this.#emit();
	}

	async deleteObject(id) {
		if (!this.#pass) throw new Error("No active session");

		try {
			await this.#pass.remove(id);
		} catch {
			// Object may have already been removed
		}
		this.#objectStore.remove(id);
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
			this.#objectStore.clear();
			this.#emit();
		} catch (err) {
			throw err;
		}
	}

	// ─── Cursor Operations ────────────────────────────────────────
	// Cursors are ephemeral: emit locally for immediate rendering,
	// and write to Autopass for P2P propagation. Trail data
	// (EMA smoothing, age) is computed in the renderer — never
	// stored or transmitted.

	async moveCursor(peerId, data) {
		if (!this.#pass) return;

		const cursorData = this.#cursorManager.move(peerId, data);

		// Emit to local listeners for immediate feedback
		this.#emitCursors({ type: "update", cursor: cursorData });

		// Write to Autopass for P2P propagation
		const key = `cursor:${peerId}`;
		const value = JSON.stringify(cursorData);

		try {
			await this.#pass.add(key, value);
		} catch {
			// Ephemeral — silently ignore errors
		}
	}

	async leaveCursor(peerId) {
		const existed = this.#cursorManager.leave(peerId);
		if (!existed) return;

		this.#emitCursors({ type: "leave", peerId });

		if (this.#pass) {
			try {
				await this.#pass.remove(`cursor:${peerId}`);
			} catch {}
		}
	}

	removeCursor(peerId) {
		const existing = this.#cursorManager.get(peerId);
		if (!existing) return;
		this.#cursorManager.remove(peerId);
		this.#emitCursors({ type: "remove", peerId });
	}

	// ─── Internal: Attach to Autopass ────────────────────────────

	async #attach(pass, mode, invite = "") {
		this.#pass = pass;

		// Register update listener BEFORE hydration so we don't miss
		// any changes that arrive while we're reading initial state
		pass.on("update", () => this.#hydrateWithUpdate(pass));

		// Hydrate initial state from existing records
		await this.#hydrateInitial(pass);

		// NOW set session to "ready" — listeners active, data loaded
		this.#sessionManager.setReady(mode, invite);
	}

	/**
	 * Hydrate from a full record scan. Used on initial attach to load
	 * all existing objects and cursor positions.
	 */
	async #hydrateInitial(pass) {
		const records = await pass.list().toArray();
		const objectRecords = [];

		for (const rec of records) {
			try {
				if (rec.key.startsWith("object:")) {
					objectRecords.push(rec);
				} else if (rec.key.startsWith("cursor:")) {
					// Hydrate cursor state from persistent records (peers who
					// were already present when we joined)
					const value =
						typeof rec.value === "string" ? JSON.parse(rec.value) : rec.value;
					const peerId = rec.key.replace("cursor:", "");
					this.#cursorManager.hydratePeer(peerId, value);
				}
			} catch {
				// Skip invalid records
			}
		}

		this.#objectStore.hydrate(objectRecords);
		this.#emit();

		// Emit cursor updates for any peers we discovered from records
		for (const rec of records) {
			try {
				if (rec.key.startsWith("cursor:")) {
					const value =
						typeof rec.value === "string" ? JSON.parse(rec.value) : rec.value;
					const peerId = rec.key.replace("cursor:", "");
					this.#emitCursors({ type: "update", cursor: { peerId, ...value } });
				}
			} catch {}
		}
	}

	/**
	 * Called on every Autopass "update" event. Re-syncs object state
	 * and processes cursor updates in real-time.
	 */
	async #hydrateWithUpdate(pass) {
		const records = await pass.list().toArray();
		const objectRecords = [];

		for (const rec of records) {
			try {
				if (rec.key.startsWith("object:")) {
					objectRecords.push(rec);
				} else if (rec.key.startsWith("cursor:")) {
					const value =
						typeof rec.value === "string" ? JSON.parse(rec.value) : rec.value;
					const peerId = rec.key.replace("cursor:", "");
					this.#cursorManager.hydratePeer(peerId, value);
					this.#emitCursors({ type: "update", cursor: { peerId, ...value } });
				}
			} catch {
				// Skip invalid records
			}
		}

		this.#objectStore.hydrate(objectRecords);
		this.#emit();
	}

	// ─── Cleanup ─────────────────────────────────────────────────

	async dispose() {
		await this.#sessionManager.dispose();
		this.#objectStore.clear();
		this.#cursorManager.clear();
		this.#listeners.clear();
		this.#cursorListeners.clear();
		this.#pass = null;
	}
}

export { PearDrawService };
