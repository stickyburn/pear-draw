// ─────────────────────────────────────────────────────────────────
// Cursor Manager — Handles ephemeral peer cursor state, separate
// from persisted objects. Cursors are written to Autopass for P2P
// propagation but excluded from snapshots.
// ─────────────────────────────────────────────────────────────────

export class CursorManager {
  #cursors = new Map(); // peerId -> { peerId, profileName, x, y, clicking, updatedAt }
  #listeners = new Set();

  /** Subscribe to cursor events: { type: "update"|"leave"|"remove", cursor?, peerId? } */
  onCursorUpdate(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(data) {
    for (const listener of this.#listeners) {
      try { listener(data); } catch {}
    }
  }

  /** Move a local peer's cursor — returns the data payload for P2P write. */
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
    this.#emit({ type: "update", cursor: cursorData });
    return { key: `cursor:${peerId}`, value: JSON.stringify(cursorData) };
  }

  /** Local peer left the canvas. */
  leave(peerId) {
    const existing = this.#cursors.get(peerId);
    if (!existing) return null;
    this.#cursors.delete(peerId);
    this.#emit({ type: "leave", peerId });
    return `cursor:${peerId}`; // key to remove from Autopass
  }

  /** Remove a remote peer's cursor (on disconnect). */
  remove(peerId) {
    const existing = this.#cursors.get(peerId);
    if (!existing) return;
    this.#cursors.delete(peerId);
    this.#emit({ type: "remove", peerId });
  }

  /** Hydrate cursor data from an Autopass record. */
  hydratePeer(peerId, value) {
    const cursorData = { peerId, ...value };
    this.#cursors.set(peerId, cursorData);
    this.#emit({ type: "update", cursor: cursorData });
  }

  /** Clear all cursors (e.g. on disconnect). */
  clear() {
    this.#cursors.clear();
  }

  /** Dispose — clear listeners. */
  dispose() {
    this.#listeners.clear();
  }
}