import { createSignal, onCleanup, onMount } from "solid-js";
import { WorkerClient } from "../../../pear-draw-core/src/worker-client.mjs";

const DEFAULT_SNAPSHOT = {
	session: { status: "idle", mode: null, invite: "", error: "" },
	objects: [],
	cursors: [],
};

const WORKER_SPECIFIER = "pear-draw-core/src/worker.mjs";

export function usePearDrawSession() {
	const [snapshot, setSnapshot] = createSignal(DEFAULT_SNAPSHOT);
	let client = null;
	let cursorThrottle = null;

	onMount(async () => {
		const bridge = window.bridge;

		try {
			await bridge.startWorker(WORKER_SPECIFIER);

			client = new WorkerClient(
				(data) => bridge.writeWorkerIPC(WORKER_SPECIFIER, data),
				(listener) => bridge.onWorkerIPC(WORKER_SPECIFIER, listener),
			);

			client.onSnapshot((newSnapshot) => {
				setSnapshot((prev) => {
					const prevStr = JSON.stringify(prev);
					const newStr = JSON.stringify(newSnapshot);
					if (prevStr === newStr) return prev;
					return newSnapshot;
				});
			});

			await client.subscribe();
		} catch (_err) {
			// Setup error silently handled
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
		clearBoard: () => client?.clearBoard(),
		addObject: (obj) => client?.addObject(obj),
		updateObject: (id, obj) => client?.updateObject(id, obj),
		updateCursor,
	};
}
