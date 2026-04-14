// CRITICAL: This function MUST be deterministic.
// Autobase may undo and replay nodes during reordering.

export function open(store) {
	return store.get("drawing-view", { valueEncoding: "json" });
}

export async function apply(nodes, view, host) {
	for (const node of nodes) {
		// Skip ack-only nodes (null values)
		if (node.value === null) continue;

		const { type, ...data } = node.value;

		switch (type) {
			case "add-writer": {
				console.log(
					`[apply] add-writer from ${fromKey}: ${data.key.slice(0, 8)}...`,
				);
				const writerKey = Buffer.from(data.key, "hex");
				await host.addWriter(writerKey, { indexer: true });
				break;
			}

			case "remove-writer": {
				console.log(`[apply] remove-writer from ${fromKey}`);
				const writerKey = Buffer.from(data.key, "hex");
				await host.removeWriter(writerKey);
				break;
			}

			case "join-request": {
				// We set indexer: false for guests so the host remains
				// the sole sequencer, ensuring stable linearization.
				const writerKey = node.from.key;
				try {
					await host.ackWriter(writerKey);
					await host.addWriter(writerKey, { indexer: false });
				} catch {
					// Writer might already exist on replay
				}
				break;
			}

			case "put": {
				await view.append(node.value);
				break;
			}

			case "del": {
				await view.append(node.value);
				break;
			}

			case "clear": {
				await view.append(node.value);
				break;
			}

			case "cursor": {
				await view.append({ ...node.value, ephemeral: true });
				break;
			}

			default: {
				console.log(`[apply] Unknown type: ${type}`);
			}
		}
	}
}

export async function hydrateView(view) {
	await view.ready();

	const length = view.length;
	if (length === 0) return [];

	const objects = new Map();
	const tombstones = new Set();

	for (let i = 0; i < length; i++) {
		const entry = await view.get(i);

		// Skip cursor entries (ephemeral)
		if (entry.ephemeral || entry.type === "cursor") continue;

		if (entry.type === "del") {
			tombstones.add(entry.id);
		} else if (entry.type === "clear") {
			objects.clear();
			tombstones.clear();
		} else if (entry.type === "put") {
			if (!tombstones.has(entry.id)) {
				objects.set(entry.id, entry.value);
			}
		}
	}

	return Array.from(objects.values());
}

export async function hydrateCursors(view) {
	await view.ready();

	const length = view.length;
	if (length === 0) return [];

	const cursors = new Map();

	for (let i = 0; i < length; i++) {
		const entry = await view.get(i);

		if (entry.type !== "cursor") continue;

		const existing = cursors.get(entry.peerId);
		if (!existing || entry.timestamp > existing.timestamp) {
			cursors.set(entry.peerId, {
				peerId: entry.peerId,
				profileName: entry.profileName,
				x: entry.x,
				y: entry.y,
				clicking: entry.clicking,
				timestamp: entry.timestamp,
			});
		}
	}

	return Array.from(cursors.values());
}
