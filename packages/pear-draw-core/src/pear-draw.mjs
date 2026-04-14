// ─────────────────────────────────────────────────────────────────
// PearDrawService — Orchestrator for P2P collaborative drawing.
// Composes SessionManager, ObjectStore, and CursorManager.
//
// SessionManager handles Corestore + Hyperswarm + Autobase directly.
// This file is the glue between the P2P layer and the RPC worker.
// ─────────────────────────────────────────────────────────────────

import { CursorManager } from "./cursor-manager.mjs";
import { ObjectStore } from "./object-store.mjs";
import { STATUS_SUSPENDED } from "./rpc-commands.mjs";
import { SessionManager } from "./session-manager.mjs";

class PearDrawService {
	#sessionManager;
	#objectStore;
	#cursorManager;
	#listeners = new Set();
	#cursorListeners = new Set();
	#updateHandler = null;

	constructor(storageRoot) {
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
		this.#objectStore.clear();
		this.#cursorManager.clear();
		this.#emit();

		try {
			const invite = await this.#sessionManager.startSession(profileName);
			await this.#attachToBoard();
			return invite;
		} catch (err) {
			this.#emit();
			throw err;
		}
	}

	async joinSession(profileName, inviteCode) {
		this.#objectStore.clear();
		this.#cursorManager.clear();
		this.#emit();

		try {
			await this.#sessionManager.joinSession(profileName, inviteCode);
			await this.#attachToBoard();
		} catch (err) {
			this.#emit();
			throw err;
		}
	}

	async #attachToBoard() {
		const board = this.#sessionManager.board;
		if (!board) throw new Error("No active board");

		this.#updateHandler = async () => {
			const objects = await board.getObjects();
			this.#objectStore.hydrate(
				objects.map((obj) => ({ key: `object:${obj.id}`, value: obj })),
			);
			this.#emit();

			// Also hydrate and emit remote cursors
			const cursors = await board.getCursors();
			for (const cursor of cursors) {
				// Don't re-emit our own cursor
				if (cursor.peerId !== board.localKey) {
					this.#emitCursors({ type: "update", cursor });
				}
			}
		};

		board.onUpdate(this.#updateHandler);

		// Initial hydration
		const objects = await board.getObjects();
		this.#objectStore.hydrate(
			objects.map((obj) => ({ key: `object:${obj.id}`, value: obj })),
		);
		this.#emit();
	}

	async disconnect(options = { soft: true }) {
		const board = this.#sessionManager.board;
		if (board && this.#updateHandler) {
			board.offUpdate();
			this.#updateHandler = null;
		}

		await this.#sessionManager.disconnect(options);

		if (options.soft === false) {
			this.#objectStore.clear();
			this.#cursorManager.clear();
		}

		this.#emit();
	}

	async reconnect() {
		await this.#sessionManager.reconnect();
		await this.#attachToBoard();
	}

	canReconnect() {
		return this.#sessionManager.session.status === STATUS_SUSPENDED;
	}

	// ─── Object CRUD ─────────────────────────────────────────────

	async addObject(obj) {
		const board = this.#sessionManager.board;
		if (!board) throw new Error("No active session");

		// Optimistic update
		this.#objectStore.add(obj);
		this.#emit();

		try {
			await board.addObject(obj);
		} catch (err) {
			this.#objectStore.rollbackAdd(obj.id);
			this.#emit();
			throw err;
		}
	}

	async updateObject(id, updates) {
		const board = this.#sessionManager.board;
		if (!board) throw new Error("No active session");

		await board.updateObject(id, updates);
		this.#objectStore.update(id, updates);
		this.#emit();
	}

	async deleteObject(id) {
		const board = this.#sessionManager.board;
		if (!board) throw new Error("No active session");

		try {
			await board.deleteObject(id);
		} catch {
			// Object may have already been removed
		}
		this.#objectStore.remove(id);
		this.#emit();
	}

	async clearBoard() {
		const board = this.#sessionManager.board;
		if (!board) throw new Error("No active session");

		await board.clearObjects();
		this.#objectStore.clear();
		this.#emit();
	}

	// ─── Cursor Operations ────────────────────────────────────────

	async moveCursor(peerId, data) {
		const board = this.#sessionManager.board;
		if (!board) return;

		const cursorData = this.#cursorManager.move(peerId, data);

		// Emit to local listeners for immediate feedback
		this.#emitCursors({ type: "update", cursor: cursorData });

		// Propagate to peers via Autobase (optimistic update)
		try {
			await board.appendCursor(cursorData);
		} catch (err) {
			console.warn("[Service] Cursor sync failed:", err.message);
		}
	}

	async leaveCursor(peerId) {
		const existed = this.#cursorManager.leave(peerId);
		if (!existed) return;
		this.#emitCursors({ type: "leave", peerId });
	}

	removeCursor(peerId) {
		const existing = this.#cursorManager.get(peerId);
		if (!existing) return;
		this.#cursorManager.remove(peerId);
		this.#emitCursors({ type: "remove", peerId });
	}

	// ─── Cleanup ─────────────────────────────────────────────────

	async dispose() {
		const board = this.#sessionManager.board;
		if (board && this.#updateHandler) {
			board.offUpdate();
		}

		await this.#sessionManager.dispose();
		this.#objectStore.clear();
		this.#cursorManager.clear();
		this.#listeners.clear();
		this.#cursorListeners.clear();
		this.#updateHandler = null;
	}
}

export { PearDrawService };
