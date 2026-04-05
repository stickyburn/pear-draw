import { createSignal, onMount } from "solid-js";

const DEFAULT_SNAPSHOT = {
	session: { status: "idle", mode: null, invite: "", error: "" },
	strokes: [],
};

export function usePearDrawSession() {
	const [snapshot, setSnapshot] = createSignal(DEFAULT_SNAPSHOT);
	let subscribed = false;

	onMount(() => {
		if (subscribed) return;
		subscribed = true;

		const bridge = window.bridge;
		bridge.subscribe();

		const unsubscribe = bridge.onSnapshot((snapshot) => {
			setSnapshot(snapshot);
		});

		return unsubscribe;
	});

	const startHost = async (profileName) => {
		const bridge = window.bridge;
		return await bridge.startHost(profileName);
	};

	const joinHost = async (profileName, inviteInput) => {
		const bridge = window.bridge;
		await bridge.joinHost(profileName, inviteInput);
	};

	const clearBoard = async () => {
		const bridge = window.bridge;
		await bridge.clearBoard();
	};

	const addStroke = async (stroke) => {
		const bridge = window.bridge;
		await bridge.addStroke(stroke);
	};

	return {
		session: () => snapshot().session,
		strokes: () => snapshot().strokes,
		canDraw: () => snapshot().session.status === "ready",
		startHost,
		joinHost,
		clearBoard,
		addStroke,
	};
}
