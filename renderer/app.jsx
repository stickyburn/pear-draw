import { createEffect, createSignal, onMount } from "solid-js";
import { Canvas } from "./components/canvas.jsx";
import { ConnectionStatus } from "./components/connection-status.jsx";
import {
	FloatingActionButton,
	showConnectionModal,
} from "./components/floating-action-button.jsx";
import { usePearDrawSession } from "./hooks/use-pear-draw-session.jsx";
import { colors, swal2Overrides } from "./styles/common.jsx";

export function App() {
	const saved = globalThis.localStorage?.getItem("pear-draw-profile");
	const [profileName, setProfileName] = createSignal(
		saved || `peer-${Math.random().toString(16).slice(2, 7)}`,
	);
	const [initialModalShown, setInitialModalShown] = createSignal(false);

	const {
		session,
		strokes,
		canDraw,
		startHost,
		joinHost,
		clearBoard,
		addStroke,
	} = usePearDrawSession();

	createEffect(() => {
		globalThis.localStorage?.setItem("pear-draw-profile", profileName());
	});

	const handleStartHost = async (profile) => {
		setProfileName(profile);
		await startHost(profile);
	};

	const handleJoinHost = async (profile, invite) => {
		setProfileName(profile);
		await joinHost(profile, invite);
	};

	const isConnected = () => session().status === "ready";
	const canOpenConnectionMenu = () =>
		session().status === "idle" || session().status === "error";

	onMount(() => {
		if (canOpenConnectionMenu() && !initialModalShown()) {
			setInitialModalShown(true);
			showConnectionModal(handleStartHost, handleJoinHost);
		}
	});

	return (
		<>
			<style>{swal2Overrides}</style>
			<div
				style={{
					position: "relative",
					height: "100dvh",
					background: colors.canvasBg,
					color: colors.textPrimary,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						"z-index": 1,
						padding: "12px",
					}}
				>
					<h1 style={{ margin: "0", "font-size": "24px" }}>Pear Draw</h1>
				</div>
				{isConnected() && (
					<ConnectionStatus session={session()} onClearBoard={clearBoard} />
				)}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
					}}
				>
					<Canvas
						strokes={strokes()}
						canDraw={canDraw()}
						profileName={profileName()}
						onAddStroke={addStroke}
					/>
				</div>
				{canOpenConnectionMenu() && (
					<FloatingActionButton
						onStartHost={handleStartHost}
						onJoinHost={handleJoinHost}
					/>
				)}
			</div>
		</>
	);
}
