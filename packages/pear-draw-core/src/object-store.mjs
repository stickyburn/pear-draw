// ─────────────────────────────────────────────────────────────────
// Object Store — CRUD operations for persisted canvas objects.
// Objects are written to Autopass for P2P sync and included in
// snapshots. All objects use keys with the "object:" prefix.
// ─────────────────────────────────────────────────────────────────

export class ObjectStore {
  #objects = [];
  #listeners = new Set();

  /** Get current objects array (shallow copy). */
  getObjects() {
    return [...this.#objects];
  }

  /** Subscribe to snapshot updates. */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit(getSnapshot) {
    const snap = getSnapshot();
    for (const listener of this.#listeners) listener(snap);
  }

  /** Add an object to the store and emit update. */
  add(obj, getSnapshot) {
    if (!obj?.id) {
      console.error("[ObjectStore] add: object missing id", obj);
      throw new Error("Object missing id");
    }
    this.#objects = [...this.#objects, { ...obj, id: obj.id }];
    this.#emit(getSnapshot);
  }

  /** Update an object by key. */
  update(key, obj, getSnapshot) {
    this.#objects = this.#objects.map((o) =>
      o.id === key ? { ...o, ...obj, id: key } : o,
    );
    this.#emit(getSnapshot);
  }

  /** Remove an object by id. */
  remove(id, getSnapshot) {
    this.#objects = this.#objects.filter((o) => o.id !== id);
    this.#emit(getSnapshot);
  }

  /** Hydrate objects from Autopass records, replacing current state. */
  hydrate(records, getSnapshot) {
    const objects = [];
    for (const rec of records) {
      try {
        if (rec.key.startsWith("object:")) {
          const value =
            typeof rec.value === "string" ? JSON.parse(rec.value) : rec.value;
          objects.push({ ...value, id: value.id || rec.key });
        }
      } catch {
        // Skip invalid records
      }
    }
    objects.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    this.#objects = objects;
    this.#emit(getSnapshot);
  }

  /** Clear all objects (e.g. clear board). */
  clear(getSnapshot) {
    this.#objects = [];
    this.#emit(getSnapshot);
  }

  /** Rollback an add (on Autopass write failure). */
  rollbackAdd(id, getSnapshot) {
    this.#objects = this.#objects.filter((o) => o.id !== id);
    this.#emit(getSnapshot);
  }

  /** Dispose — clear listeners. */
  dispose() {
    this.#listeners.clear();
  }
}