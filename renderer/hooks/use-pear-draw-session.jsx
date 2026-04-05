import { createSignal, onCleanup, onMount } from "solid-js";

const DEFAULT_SNAPSHOT = {
	session: { status: "idle", mode: null, invite: "", error: "" },
	objects: [],
	cursors: [],
};

export function usePearDrawSession() {
	const [snapshot, setSnapshot] = createSignal(DEFAULT_SNAPSHOT);
	let unsubscribe = null;
	let cursorThrottle = null;

	onMount(() => {
		const bridge = window.bridge;
		bridge.subscribe();
		unsubscribe = bridge.onSnapshot(setSnapshot);
	});

	onCleanup(() => {
		unsubscribe?.();
		if (cursorThrottle) clearTimeout(cursorThrottle);
	});

	const bridge = window.bridge;

	const updateCursor = (peerId, data) => {
		if (cursorThrottle) return;
		cursorThrottle = setTimeout(() => {
			bridge.updateCursor(peerId, data).catch(() => {});
			cursorThrottle = null;
		}, 33);
	};

	return {
		session: () => snapshot().session,
		objects: () => snapshot().objects,
		cursors: () => snapshot().cursors,
		canDraw: () => snapshot().session.status === "ready",
		startHost: (profile) => bridge.startHost(profile),
		joinHost: (profile, invite) => bridge.joinHost(profile, invite),
		clearBoard: () => bridge.clearBoard(),
		addObject: (obj) => bridge.addObject(obj),
		updateObject: (id, obj) => bridge.updateObject(id, obj),
		updateCursor,
	};
}