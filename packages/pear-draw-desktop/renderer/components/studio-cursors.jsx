import { createEffect, createSignal, For, Show } from "solid-js";
import { hashToPeerColor, studio } from "../styles/index.jsx";

// ─────────────────────────────────────────────────────────────────
// Cursor Overlay — renders remote peer cursors with EMA-smoothed
// positions, lifecycle animations, trail dots, and click ripples.
//
// All positioning uses `transform: translate()` on the container
// for GPU compositing (no layout recalculation per frame).
// ─────────────────────────────────────────────────────────────────

const CURSOR_SVG_PATH =
	"M1.5 1.5 L1.5 19.5 L7.2 14.1 L11.7 22.5 L15.3 20.7 L10.8 12.3 L17.1 12.3 Z";
const IDLE_FADE_MS = 500;

export function StudioCursors(props) {
	const localPeerId = () => props.localPeerId;
	const cursors = () => props.cursors ?? [];
	const canvasWidth = () => props.canvasWidth || 1;
	const canvasHeight = () => props.canvasHeight || 1;

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				"pointer-events": "none",
				"z-index": 100,
				overflow: "hidden",
			}}
		>
			{/* Trail layer — rendered at absolute canvas positions */}
			<For each={cursors()}>
				{(cursor) => {
					if (cursor.peerId === localPeerId()) return null;
					const color = hashToPeerColor(cursor.peerId);
					return (
						<For each={cursor.trail ?? []}>
							{(dot) => {
								const dotX = (dot.x ?? 0.5) * canvasWidth();
								const dotY = (dot.y ?? 0.5) * canvasHeight();
								return (
									<div
										style={{
											position: "absolute",
											top: "0",
											left: "0",
											width: "6px",
											height: "6px",
											"border-radius": "50%",
											background: color,
											opacity: Math.max(0, 0.35 * (1 - dot.age)),
											transform: `translate(${dotX - 3}px, ${dotY - 3}px)`,
											"pointer-events": "none",
										}}
									/>
								);
							}}
						</For>
					);
				}}
			</For>

			{/* Cursor + label layer */}
			<For each={cursors()}>
				{(cursor) => {
					if (cursor.peerId === localPeerId()) return null;
					const color = hashToPeerColor(cursor.peerId);
					const x = (cursor.x ?? 0.5) * canvasWidth();
					const y = (cursor.y ?? 0.5) * canvasHeight();

					return (
						<StudioCursor
							peerId={cursor.peerId}
							x={x}
							y={y}
							color={color}
							name={cursor.profileName || "peer"}
							isIdle={cursor.idle ?? false}
							isLeft={cursor.left ?? false}
							appearing={cursor.appearing ?? false}
							clicking={cursor.clicking ?? false}
						/>
					);
				}}
			</For>
		</div>
	);
}

function StudioCursor(props) {
	let cursorRef;
	const [rippleKey, setRippleKey] = createSignal(0);
	const [showRipple, setShowRipple] = createSignal(false);
	let lastClicking = false;

	// Direct DOM position updates via transform (GPU-composited)
	createEffect(() => {
		if (!cursorRef) return;
		cursorRef.style.transform = `translate(${props.x}px, ${props.y}px)`;
	});

	// Track clicking transitions → trigger ripple
	createEffect(() => {
		if (props.clicking && !lastClicking) {
			setRippleKey((k) => k + 1);
			setShowRipple(true);
			setTimeout(() => setShowRipple(false), 500);
		}
		lastClicking = props.clicking;
	});

	const containerOpacity = () => {
		if (props.isLeft) return "0";
		if (props.isIdle) return "0.35";
		return "1";
	};

	const containerVisibility = () => (props.isLeft ? "hidden" : "visible");

	const transitionStyle = () => {
		if (props.appearing) return "none";
		return `opacity ${IDLE_FADE_MS}ms ease-out, visibility 0s ${props.isLeft ? "0s" : "0s"}`;
	};

	return (
		<div
			ref={(el) => (cursorRef = el)}
			style={{
				position: "absolute",
				top: "0",
				left: "0",
				"will-change": "transform",
				opacity: containerOpacity(),
				visibility: containerVisibility(),
				transition: transitionStyle(),
				animation: props.appearing
					? "cursor-appear 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both"
					: "none",
				"pointer-events": "none",
			}}
		>
			{/* Cursor arrow with glow */}
			<div style={{ position: "relative" }}>
				{/* Animated glow layer */}
				<svg
					width="20"
					height="26"
					viewBox="0 0 20 26"
					aria-hidden="true"
					style={{
						position: "absolute",
						animation: "cursor-glow-pulse 3s ease-in-out infinite",
						filter: `drop-shadow(0 0 4px ${props.color}60)`,
						"--cursor-color": props.color,
					}}
				>
					<path d={CURSOR_SVG_PATH} fill={props.color} opacity="0.4" />
				</svg>

				{/* Main cursor arrow */}
				<svg
					width="20"
					height="26"
					viewBox="0 0 20 26"
					aria-hidden="true"
					style={{
						filter: `drop-shadow(0 1px 3px rgba(0,0,0,0.5))`,
					}}
				>
					<path
						d={CURSOR_SVG_PATH}
						fill={props.color}
						stroke={studio.void}
						stroke-width="1"
					/>
				</svg>
			</div>

			{/* Name tag pill */}
			<div
				style={{
					position: "absolute",
					left: "14px",
					top: "18px",
					background: `rgba(30, 30, 30, 0.85)`,
					"backdrop-filter": "blur(12px)",
					color: studio.text.primary,
					padding: "3px 10px 3px 8px",
					"border-radius": "10px",
					"font-size": "0.65rem",
					"font-family": "var(--font-mono)",
					"font-weight": 600,
					"white-space": "nowrap",
					"letter-spacing": "0.02em",
					border: `1px solid ${props.color}50`,
					"box-shadow": `0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`,
					opacity: props.isIdle ? 0.2 : 1,
					transition: `opacity ${IDLE_FADE_MS}ms ease-out`,
				}}
			>
				{/* Animated color dot */}
				<span
					style={{
						display: "inline-block",
						width: "6px",
						height: "6px",
						"border-radius": "50%",
						background: props.color,
						"margin-right": "5px",
						"box-shadow": `0 0 6px ${props.color}`,
						animation: "cursor-dot-pulse 2s ease-in-out infinite",
					}}
				/>
				{props.name}
			</div>

			{/* Click ripple effect */}
			<Show when={showRipple()}>
				<div
					key={rippleKey()}
					style={{
						position: "absolute",
						left: "8px",
						top: "10px",
						width: "16px",
						height: "16px",
						"border-radius": "50%",
						border: `2px solid ${props.color}`,
						transform: "translate(-50%, -50%)",
						animation: "cursor-ripple 500ms ease-out forwards",
						"pointer-events": "none",
					}}
				/>
			</Show>
		</div>
	);
}
