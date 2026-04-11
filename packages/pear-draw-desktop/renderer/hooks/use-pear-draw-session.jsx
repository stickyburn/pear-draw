import { PearDrawClient } from "pear-draw-core/worker-client";
import { createSignal, onCleanup, onMount } from "solid-js";

const DEFAULT_SNAPSHOT = {
	session: { status: "idle", mode: null, invite: "", error: "" },
	objects: [],
	cursors: [],
};

export function usePearDrawSession() {
	const [snapshot, setSnapshot] = createSignal(DEFAULT_SNAPSHOT);
	let client = null;
	let cursorThrottle = null;

	onMount(async () => {
		try {
			client = new PearDrawClient();

			client.onSnapshot((newSnapshot) => {
				setSnapshot((prev) => {
					const prevStr = JSON.stringify(prev);
					const newStr = JSON.stringify(newSnapshot);
					if (prevStr === newStr) return prev;
					return newSnapshot;
				});
			});

			await client.subscribe();
		} catch (err) {
			console.error("Failed to initialize pear-draw session:", err);
		}
	});

	onCleanup(() => {
		if (cursorThrottle) clearTimeout(cursorThrottle);
		client?.destroy();
	});

	const updateCursor = (peerId, data) => {
		if (cursorThrottle) return;
		cursorThrottle = setTimeout(() => {
			client?.updateCursor(peerId, data).catch(() => {});
			cursorThrottle = null;
		}, 33);
	};

	return {
		session: () => snapshot().session,
		objects: () => snapshot().objects,
		cursors: () => snapshot().cursors,
		canDraw: () => snapshot().session.status === "ready",
		startHost: (profile) => client?.startHost(profile),
		joinHost: (profile, invite) => client?.joinHost(profile, invite),
		disconnect: async () => {
			await client?.disconnect();
			setSnapshot(DEFAULT_SNAPSHOT);
		},
		clearBoard: () => client?.clearBoard(),
		addObject: (obj) => client?.addObject(obj),
		updateObject: (id, obj) => client?.updateObject(id, obj),
		deleteObject: (id) => client?.deleteObject(id),
		updateCursor,
	};
}
