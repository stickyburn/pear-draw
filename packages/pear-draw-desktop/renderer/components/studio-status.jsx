import { createSignal } from "solid-js";
import { swal, toast } from "../lib/swal.jsx";
import {
	studio,
	glass,
	easings,
	durations,
	modalStyles,
	shadows,
} from "../styles/index.jsx";
import { modalFlow } from "../lib/modal-flow.jsx";

export function StudioStatus(props) {
	const [isOpen, setIsOpen] = createSignal(false);
	const [isHovered, setIsHovered] = createSignal(false);

	if (props.session.status !== "ready") return null;

	const isHost = props.session.mode === "host";
	const statusText = isHost ? "Hosting" : "Connected";
	const statusColor = isHost ? studio.neon.emerald : studio.neon.cyan;
	const peerCount = props.session.peers?.length || 0;

	const handleClearBoard = async () => {
		setIsOpen(false);

		await modalFlow({
			inputConfig: {
				title: `<div style="font-family: var(--font-display); color: ${studio.text.primary};">Clear Canvas?</div>`,
				html: `<div style="color: ${studio.text.secondary}; margin-top: 8px;">This will remove all drawings for everyone in the session.</div>`,
				icon: "warning",
				showCancelButton: true,
				confirmButtonText: "Clear Canvas",
				cancelButtonText: "Cancel",
				customClass: {
					popup: "studio-modal",
					confirmButton: "studio-btn-primary",
					cancelButton: "studio-btn-secondary",
				},
				buttonsStyling: false,
			},
			action: async () => props.onClearBoard(),
			onSuccess: async () => {
				toast.fire({
					icon: "success",
					title: "Canvas cleared",
					customClass: { popup: "studio-toast" },
				});
			},
			onError: async (err) => {
				await swal.fire({
					title: `<div style="font-family: var(--font-display); color: ${studio.text.primary};">Clear Failed</div>`,
					text: err?.message || "Could not clear canvas",
					icon: "error",
					customClass: { popup: "studio-modal" },
				});
			},
		});
	};

	const handleCopyInvite = async () => {
		setIsOpen(false);
		try {
			await navigator.clipboard.writeText(props.session.invite);
			toast.fire({
				icon: "success",
				title: "Invite copied!",
				customClass: { popup: "studio-toast" },
			});
		} catch {
			toast.fire({
				icon: "error",
				title: "Could not copy invite",
				customClass: { popup: "studio-toast" },
			});
		}
	};

	const handleDisconnect = () => {
		setIsOpen(false);
		props.onDisconnect?.();
	};

	return (
		<div
			style={{
				position: "fixed",
				top: props.isFocusMode?.() ? "-60px" : "24px",
				right: "24px",
				"z-index": 50,
				transition: `all ${durations.slow} ${easings.premium}`,
				opacity: props.isFocusMode?.() ? 0 : 1,
				"pointer-events": props.isFocusMode?.() ? "none" : "auto",
			}}
		>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen())}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				style={{
					display: "flex",
					"align-items": "center",
					gap: "10px",
					padding: "10px 18px",
					background: isHovered() ? studio.surface : studio.elevated,
					border: `1px solid ${isHovered() ? studio.borderGlow : studio.border}`,
					"border-radius": "12px",
					color: studio.text.primary,
					cursor: "pointer",
					"font-size": "0.8rem",
					"font-family": "var(--font-sans)",
					"font-weight": 500,
					"letter-spacing": "0.01em",
					transition: `all ${durations.fast} ${easings.spring}`,
					"box-shadow": isHovered()
						? `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px ${statusColor}30`
						: `0 4px 20px rgba(0,0,0,0.2), 0 0 0 1px ${studio.border}`,
				}}
			>
				{/* Animated status dot */}
				<span
					style={{
						width: "8px",
						height: "8px",
						"border-radius": "50%",
						background: statusColor,
						"box-shadow": `0 0 10px ${statusColor}60`,
						animation: "studio-breathe 2s ease-in-out infinite",
					}}
				/>
				<span>{statusText}</span>

				{/* Peer count badge */}
				{peerCount > 0 && (
					<span
						style={{
							background: studio.abyss,
							color: studio.text.secondary,
							padding: "2px 8px",
							"border-radius": "6px",
							"font-size": "0.7rem",
							"margin-left": "4px",
						}}
					>
						{peerCount + 1}
					</span>
				)}

				{/* Dropdown chevron */}
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					style={{
						transition: `transform ${durations.fast} ${easings.spring}`,
						transform: isOpen() ? "rotate(180deg)" : "rotate(0)",
						opacity: 0.6,
						"margin-left": "4px",
					}}
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</button>

			{/* Dropdown Menu */}
			{isOpen() && (
				<div
					style={{
						position: "absolute",
						top: "calc(100% + 8px)",
						right: 0,
						...glass.heavy,
						"border-radius": "12px",
						overflow: "hidden",
						"min-width": "200px",
						"box-shadow": `${shadows.xl}`,
						animation: `studio-slide-down ${durations.normal} ${easings.spring} both`,
					}}
				>
					{/* Session info */}
					<div
						style={{
							padding: "14px 16px",
							borderBottom: `1px solid ${studio.border}`,
						}}
					>
						<div
							style={{
								"font-size": "0.7rem",
								color: studio.text.muted,
								"text-transform": "uppercase",
								"letter-spacing": "0.1em",
								marginBottom: "4px",
							}}
						>
							Session
						</div>
						<div
							style={{
								"font-size": "0.85rem",
								color: studio.text.secondary,
								"font-family": "var(--font-mono)",
							}}
						>
							{isHost ? "You are hosting" : "Connected to host"}
						</div>
					</div>

					{/* Actions */}
					{props.session.invite && (
						<button
							type="button"
							onClick={handleCopyInvite}
							style={{
								width: "100%",
								padding: "12px 16px",
								background: "transparent",
								border: "none",
								color: studio.text.primary,
								"text-align": "left",
								cursor: "pointer",
								"font-size": "0.85rem",
								display: "flex",
								"align-items": "center",
								gap: "10px",
								transition: `all ${durations.fast} ${easings.spring}`,
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = studio.surface;
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = "transparent";
							}}
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
							</svg>
							Copy Invite Code
						</button>
					)}

					<button
						type="button"
						onClick={handleClearBoard}
						style={{
							width: "100%",
							padding: "12px 16px",
							background: "transparent",
							border: "none",
							color: studio.text.primary,
							"text-align": "left",
							cursor: "pointer",
							"font-size": "0.85rem",
							display: "flex",
							"align-items": "center",
							gap: "10px",
							transition: `all ${durations.fast} ${easings.spring}`,
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = studio.surface;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "transparent";
						}}
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 6h18" />
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
							<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						</svg>
						Clear Canvas
					</button>

					{/* Divider */}
					<div style={{ height: "1px", background: studio.border }} />

					{/* Disconnect */}
					<button
						type="button"
						onClick={handleDisconnect}
						style={{
							width: "100%",
							padding: "12px 16px",
							background: "transparent",
							border: "none",
							color: studio.neon.rose,
							"text-align": "left",
							cursor: "pointer",
							"font-size": "0.85rem",
							display: "flex",
							"align-items": "center",
							gap: "10px",
							transition: `all ${durations.fast} ${easings.spring}`,
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = `${studio.neon.rose}15`;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "transparent";
						}}
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
						Disconnect
					</button>
				</div>
			)}
		</div>
	);
}
