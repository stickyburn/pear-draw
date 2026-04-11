import Autopass from "autopass";
import Corestore from "corestore";

const DEFAULT_SESSION = {
  status: "idle",
  mode: null,
  invite: "",
  error: "",
};

class PearDrawService {
  #storageRoot;
  #pass = null;
  #store = null;
  #session = { ...DEFAULT_SESSION };
  #objects = [];
  #cursors = [];
  #listeners = new Set();

  constructor(storageRoot) {
    this.#storageRoot = storageRoot;
  }

  getSnapshot() {
    return {
      session: { ...this.#session },
      objects: [...this.#objects],
      cursors: [...this.#cursors],
    };
  }

  subscribe(listener) {
    console.log("[Service] Subscribe called, listeners:", this.#listeners.size);
    this.#listeners.add(listener);
    const snap = this.getSnapshot();
    console.log("[Service] Initial snapshot:", snap.objects.length, "objects");
    listener(snap);
    return () => this.#listeners.delete(listener);
  }

  async #closeCurrent() {
    const currentPass = this.#pass;
    const currentStore = this.#store;

    this.#pass = null;
    this.#store = null;

    await currentPass?.close?.().catch(() => {});
    await currentStore?.close?.().catch(() => {});
  }

  async disconnect() {
    await this.#closeCurrent();
    this.#session = { ...DEFAULT_SESSION };
    this.#objects = [];
    this.#cursors = [];
    this.#emit();
  }

  async startSession(profileName) {
    try {
      this.#session = {
        status: "connecting",
        mode: "host",
        invite: "",
        error: "",
      };
      this.#objects = [];
      this.#cursors = [];
      this.#emit();

      await this.#closeCurrent();

      const store = await this.#createStore(profileName);
      const pass = new Autopass(store);
      await pass.ready();

      const invite = await pass.createInvite();
      await this.#attach(pass, store, "host", invite);

      return invite;
    } catch (err) {
      this.#session = {
        status: "error",
        mode: "host",
        invite: "",
        error: err.message || "Failed to start session",
      };
      this.#emit();
      throw err;
    }
  }

  async joinSession(profileName, inviteCode) {
    const invite = inviteCode.trim();
    if (!invite) {
      this.#session = {
        status: "error",
        mode: "guest",
        invite: "",
        error: "Paste an invite code",
      };
      this.#emit();
      throw new Error("Invite code not entered");
    }

    let pair = null;
    try {
      this.#session = {
        status: "connecting",
        mode: "guest",
        invite: "",
        error: "",
      };
      this.#emit();
      this.#objects = [];
      this.#cursors = [];

      await this.#closeCurrent();

      const store = await this.#createStore(profileName);
      pair = Autopass.pair(store, invite);

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Pairing timed out")), 15000),
      );

      const pass = await Promise.race([pair.finished(), timeout]);
      await pass.ready();

      await this.#attach(pass, store, "guest");
    } catch (err) {
      await pair?.close?.().catch(() => {});

      this.#session = {
        status: "error",
        mode: "guest",
        invite: "",
        error: err.message || "Failed to join session",
      };
      this.#emit();
      throw err;
    }
  }

  async #createStore(profileName) {
    const safe = profileName.trim().replace(/[^a-zA-Z0-9_-]/g, "-") || "peer";
    return new Corestore(`${this.#storageRoot}/pear-draw/${safe}`);
  }

  async #attach(pass, store, mode, invite = "") {
    this.#pass = pass;
    this.#store = store;

    const onUpdate = () => this.#hydrate(pass);

    pass.on("update", onUpdate);
    await this.#hydrate(pass);

    this.#session = {
      status: "ready",
      mode,
      invite,
      error: "",
    };
    this.#emit();
  }

  async #hydrate(pass) {
    const records = await pass.list().toArray();
    const objects = [];
    const cursors = [];

    for (const rec of records) {
      try {
        if (rec.key.startsWith("object:")) {
          const value =
            typeof rec.value === "string" ? JSON.parse(rec.value) : rec.value;
          // The id is the autopass key itself, which matches value.id
          objects.push({
            ...value,
            id: value.id || rec.key,
          });
        } else if (rec.key.startsWith("cursor:")) {
          const value =
            typeof rec.value === "string" ? JSON.parse(rec.value) : rec.value;
          cursors.push({
            peerId: rec.key.replace("cursor:", ""),
            ...value,
          });
        }
      } catch {
        // Skip invalid records
      }
    }

    objects.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    this.#objects = objects;
    this.#cursors = cursors;
    this.#emit();
  }

  #emit() {
    const snap = this.getSnapshot();
    console.log("[Service] Emitting snapshot:", snap.objects.length, "objects, status:", snap.session.status);
    for (const listener of this.#listeners) listener(snap);
  }

  async addObject(obj) {
    console.log("[Service] addObject called, obj:", typeof obj, obj?.id, obj?.type);
    if (!obj) {
      console.error("[Service] addObject received undefined object!");
      throw new Error("Cannot add undefined object");
    }
    if (!this.#pass) {
      console.error("[Service] No active session!");
      throw new Error("No active session");
    }

    // obj.id already has the "object:" prefix (set by setObjectMeta in the renderer)
    const key = obj.id;

    if (!key) {
      console.error("[Service] addObject: object has no id!", obj);
      throw new Error("Object missing id");
    }

    this.#objects = [...this.#objects, { ...obj, id: key }];
    this.#emit();

    try {
      console.log("[Service] Calling autopass.add for:", key);
      await this.#pass.add(key, JSON.stringify(obj));
      console.log("[Service] autopass.add succeeded");
    } catch (err) {
      console.error("[Service] autopass.add error:", err);
      this.#objects = this.#objects.filter((o) => o.id !== key);
      this.#emit();
      throw err;
    }
  }

  async updateObject(key, obj) {
    if (!this.#pass) throw new Error("No active session");

    await this.#pass.add(key, JSON.stringify(obj));

    this.#objects = this.#objects.map((o) =>
      o.id === key ? { ...o, ...obj, id: key } : o,
    );
    this.#emit();
  }

  async deleteObject(id) {
    if (!this.#pass) throw new Error("No active session");

    try {
      await this.#pass.remove(id);
    } catch {
      // Object may have already been removed
    }

    this.#objects = this.#objects.filter((o) => o.id !== id);
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

      this.#objects = [];
      this.#emit();
    } catch (err) {
      // Error handled silently
      throw err;
    }
  }

  async updateCursor(peerId, cursorData) {
    if (!this.#pass) return;

    const key = `cursor:${peerId}`;
    const record = {
      peerId,
      ...cursorData,
      updatedAt: Date.now(),
    };

    this.#cursors = this.#cursors.filter((c) => c.peerId !== peerId);
    this.#cursors.push(record);
    this.#emit();

    try {
      await this.#pass.add(key, JSON.stringify(cursorData));
    } catch (err) {
      // Error handled silently
    }
  }

  async dispose() {
    await this.#closeCurrent();
    this.#listeners.clear();
  }
}

export { PearDrawService };
