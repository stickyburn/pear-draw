// ─────────────────────────────────────────────────────────────────
// Cursor Manager — Pure data store for ephemeral peer cursor state.
// No event system — the owning service handles emission.
// P2P propagation is handled by PearDrawService, which writes
// cursor positions to Autopass and hydrates remote cursor data
// from "update" events.
// ─────────────────────────────────────────────────────────────────

export class CursorManager {
	#cursors = new Map(); // peerId -> { peerId, profileName, x, y, clicking, updatedAt }

	/** Move a local peer's cursor — updates state and returns the cursor data. */
	move(peerId, data) {
		const now = Date.now();
		const existing = this.#cursors.get(peerId);
		const cursorData = {
			peerId,
			profileName: data.profileName || (existing?.profileName ?? peerId),
			x: data.x ?? 0.5,
			y: data.y ?? 0.5,
			clicking: data.clicking ?? false,
			updatedAt: now,
		};
		this.#cursors.set(peerId, cursorData);
		return cursorData;
	}

	/** Local peer left the canvas — returns true if the cursor existed. */
	leave(peerId) {
		const existing = this.#cursors.get(peerId);
		if (!existing) return false;
		this.#cursors.delete(peerId);
		return true;
	}

	/** Remove a remote peer's cursor (on disconnect). */
	remove(peerId) {
		this.#cursors.delete(peerId);
	}

	/** Hydrate cursor data from an Autopass record (received via "update" event). */
	hydratePeer(peerId, value) {
		this.#cursors.set(peerId, { peerId, ...value });
	}

	/** Get a cursor by peerId. */
	get(peerId) {
		return this.#cursors.get(peerId);
	}

	/** Clear all cursors (e.g. on disconnect). */
	clear() {
		this.#cursors.clear();
	}
}
