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

	leave(peerId) {
		const existing = this.#cursors.get(peerId);
		if (!existing) return false;
		this.#cursors.delete(peerId);
		return true;
	}

	remove(peerId) {
		this.#cursors.delete(peerId);
	}

	hydratePeer(peerId, value) {
		this.#cursors.set(peerId, { peerId, ...value });
	}

	get(peerId) {
		return this.#cursors.get(peerId);
	}

	clear() {
		this.#cursors.clear();
	}
}
