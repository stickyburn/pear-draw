// Data store for persisted canvas objects.
// No event system — the owning service handles emission.
export class ObjectStore {
	#objects = [];

	getObjects() {
		return [...this.#objects];
	}

	add(obj) {
		if (!obj?.id) {
			console.error("[ObjectStore] add: object missing id", obj);
			throw new Error("Object missing id");
		}
		this.#objects = [...this.#objects, { ...obj, id: obj.id }];
	}

	update(key, obj) {
		this.#objects = this.#objects.map((o) =>
			o.id === key ? { ...o, ...obj, id: key } : o,
		);
	}

	remove(id) {
		this.#objects = this.#objects.filter((o) => o.id !== id);
	}

	hydrate(records) {
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
	}

	clear() {
		this.#objects = [];
	}

	rollbackAdd(id) {
		this.#objects = this.#objects.filter((o) => o.id !== id);
	}
}
