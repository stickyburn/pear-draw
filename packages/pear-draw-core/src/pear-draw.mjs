// ─────────────────────────────────────────────────────────────────
// PearDrawService — Orchestrator for P2P collaborative drawing.
// Composes SessionManager, ObjectStore, and CursorManager,
// wiring them to Autopass for P2P sync.
//
// Architecture:
//   - Objects are written to Autopass for durable P2P sync
//   - Cursor positions are ephemeral: broadcast via Autopass
//     update events but NOT persisted to the store. This avoids
//     bloating the hypercore with transient position data while
//     still propagating cursors to remote peers in real-time.
// ─────────────────────────────────────────────────────────────────

import { SessionManager } from "./session-manager.mjs";
import { ObjectStore } from "./object-store.mjs";
import { CursorManager } from "./cursor-manager.mjs";

class PearDrawService {
  #storageRoot;
  #sessionManager;
  #objectStore;
  #cursorManager;
  #listeners = new Set();
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
    return this.#cursorManager.onCursorUpdate(listener);
  }

  #emit() {
    const snap = this.getSnapshot();
    for (const listener of this.#listeners) listener(snap);
  }

  // ─── Session Lifecycle ────────────────────────────────────────

  async startSession(profileName) {
    // Clear stale data before starting a new session
    this.#objectStore.clear(() => this.getSnapshot());
    this.#cursorManager.clear();

    const invite = await this.#sessionManager.prepareHostSession(profileName);
    await this.#attach(this.#sessionManager.pass, "host", invite);
    return invite;
  }

  async joinSession(profileName, inviteCode) {
    // Clear stale data before joining a new session
    this.#objectStore.clear(() => this.getSnapshot());
    this.#cursorManager.clear();

    await this.#sessionManager.prepareJoinSession(profileName, inviteCode);
    await this.#attach(this.#sessionManager.pass, "guest");
  }

  async disconnect() {
    await this.#sessionManager.disconnect();
    this.#objectStore.clear(() => this.getSnapshot());
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
    this.#objectStore.add(obj, () => this.getSnapshot());

    try {
      await this.#pass.add(key, JSON.stringify(obj));
    } catch (err) {
      console.error("[Service] autopass.add error:", err);
      this.#objectStore.rollbackAdd(key, () => this.getSnapshot());
      throw err;
    }
  }

  async updateObject(key, obj) {
    if (!this.#pass) throw new Error("No active session");

    await this.#pass.add(key, JSON.stringify(obj));
    this.#objectStore.update(key, obj, () => this.getSnapshot());
  }

  async deleteObject(id) {
    if (!this.#pass) throw new Error("No active session");

    try {
      await this.#pass.remove(id);
    } catch {
      // Object may have already been removed
    }
    this.#objectStore.remove(id, () => this.getSnapshot());
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
      this.#objectStore.clear(() => this.getSnapshot());
    } catch (err) {
      throw err;
    }
  }

  // ─── Cursor Operations ────────────────────────────────────────
  // Cursors are ephemeral: we emit locally for immediate feedback,
  // and write to Autopass for P2P propagation, but we do NOT
  // persist cursor data in our ObjectStore or include it in
  // snapshots. Remote peers receive cursor updates via the
  // Autopass "update" event, and we extract cursor data from
  // those events in #hydrateWithUpdate().

  async moveCursor(peerId, data) {
    if (!this.#pass) return;

    // Emit locally for immediate feedback
    this.#cursorManager.move(peerId, data);

    // Write to Autopass for P2P propagation only (never hydrated into state)
    const key = `cursor:${peerId}`;
    const value = JSON.stringify({
      peerId,
      profileName: data.profileName || peerId,
      x: data.x ?? 0.5,
      y: data.y ?? 0.5,
      clicking: data.clicking ?? false,
    });

    try {
      await this.#pass.add(key, value);
    } catch {
      // Ephemeral — silently ignore errors
    }
  }

  async leaveCursor(peerId) {
    this.#cursorManager.leave(peerId);

    if (this.#pass) {
      try { await this.#pass.remove(`cursor:${peerId}`); } catch {}
    }
  }

  removeCursor(peerId) {
    this.#cursorManager.remove(peerId);
  }

  // ─── Internal: Attach to Autopass ────────────────────────────
  // Registers the update listener, hydrates initial state from
  // existing records, and then sets session to "ready".
  // This ordering ensures listeners are active BEFORE the session
  // goes live, so no updates are missed.

  async #attach(pass, mode, invite = "") {
    this.#pass = pass;

    // Register update listener BEFORE hydration so we don't miss
    // any changes that arrive while we're reading initial state
    pass.on("update", () => this.#hydrateWithUpdate(pass));

    // Hydrate initial state from existing records
    await this.#hydrateInitial(pass);

    // NOW set session to "ready" — listeners are active, data loaded
    this.#sessionManager.setReady(mode, invite);
  }

  /**
   * Hydrate from a full record scan. Used on initial attach to load
   * all existing objects. Cursor records are cleaned up during hydration.
   */
  async #hydrateInitial(pass) {
    const records = await pass.list().toArray();
    const objectRecords = [];

    for (const rec of records) {
      try {
        if (rec.key.startsWith("object:")) {
          objectRecords.push(rec);
        } else if (rec.key.startsWith("cursor:")) {
          // Process initial cursor state from persistent records
          // (peer cursors that existed before we joined)
          const value =
            typeof rec.value === "string" ? JSON.parse(rec.value) : rec.value;
          const peerId = rec.key.replace("cursor:", "");
          this.#cursorManager.hydratePeer(peerId, value);
        }
      } catch {
        // Skip invalid records
      }
    }

    this.#objectStore.hydrate(objectRecords, () => this.getSnapshot());
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
        }
      } catch {
        // Skip invalid records
      }
    }

    this.#objectStore.hydrate(objectRecords, () => this.getSnapshot());
  }

  // ─── Cleanup ─────────────────────────────────────────────────

  async dispose() {
    await this.#sessionManager.dispose();
    this.#objectStore.dispose();
    this.#cursorManager.dispose();
    this.#listeners.clear();
    this.#pass = null;
  }
}

export { PearDrawService };