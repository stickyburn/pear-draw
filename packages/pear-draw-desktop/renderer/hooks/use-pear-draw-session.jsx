import { PearDrawClient } from "pear-draw-core/worker-client";
import { createSignal, onCleanup, onMount } from "solid-js";
import { CursorInterpolator } from "../lib/cursor-interpolation.mjs";

const DEFAULT_SNAPSHOT = {
	session: { status: "idle", mode: null, invite: "", error: "" },
	objects: [],
};

export function usePearDrawSession() {
	const [snapshot, setSnapshot] = createSignal(DEFAULT_SNAPSHOT);
	const [cursors, setCursors] = createSignal([]);
	let client = null;
	let interpolator = null;

	onMount(async () => {
		try {
			client = new PearDrawClient();

			// Snapshot listener — receives session + objects (no cursors)
			client.onSnapshot((newSnapshot) => {
				setSnapshot((prev) => {
					const prevStr = JSON.stringify(prev);
					const newStr = JSON.stringify(newSnapshot);
					if (prevStr === newStr) return prev;
					return newSnapshot;
				});
			});

			// Create interpolator — drives cursor position smoothing via rAF
			interpolator = new CursorInterpolator((state) => {
				setCursors(state);
			});
			interpolator.start();

			// Cursor update events — feed raw positions into interpolator
			client.onCursorUpdate((cursorData) => {
				if (!interpolator) return;
				interpolator.addPoint(
					cursorData.peerId,
					cursorData.x,
					cursorData.y,
					cursorData.profileName,
					cursorData.clicking ?? false,
				);
			});

			// Cursor leave events — peer's pointer left the canvas
			client.onCursorLeave((data) => {
				if (!interpolator) return;
				interpolator.leavePeer(data.peerId);
			});

			// Cursor remove events — peer disconnected entirely
			client.onCursorRemove((data) => {
				if (!interpolator) return;
				interpolator.removePeer(data.peerId);
			});

			await client.subscribe();
		} catch (err) {
			console.error("Failed to initialize pear-draw session:", err);
		}
	});

	onCleanup(() => {
		interpolator?.destroy();
		interpolator = null;
		client?.destroy();
	});

	/** Single throttle for cursor movement — 33ms (~30fps) */
	let cursorThrottle = null;
	const updateCursor = (peerId, data) => {
		if (cursorThrottle) return;
		cursorThrottle = setTimeout(() => {
			client?.moveCursor(peerId, data);
			cursorThrottle = null;
		}, 33);
	};

	/** Send cursor leave message (no throttle needed) */
	const leaveCursor = (peerId) => {
		if (cursorThrottle) {
			clearTimeout(cursorThrottle);
			cursorThrottle = null;
		}
		client?.leaveCursor(peerId);
	};

	return {
		session: () => snapshot().session,
		objects: () => snapshot().objects,
		cursors,
		canDraw: () => snapshot().session.status === "ready",
		startHost: (profile) => client?.startHost(profile),
		joinHost: (profile, invite) => client?.joinHost(profile, invite),
		disconnect: async () => {
			await client?.disconnect();
			setSnapshot(DEFAULT_SNAPSHOT);
			setCursors([]);
			interpolator?.destroy();
		},
		clearBoard: () => client?.clearBoard(),
		addObject: (obj) => client?.addObject(obj),
		updateObject: (id, obj) => client?.updateObject(id, obj),
		deleteObject: (id) => client?.deleteObject(id),
		updateCursor,
		leaveCursor,
	};
}