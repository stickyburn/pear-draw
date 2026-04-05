import { createSignal } from "solid-js";
import { swal, toast } from "../lib/swal.jsx";
import { colors, modalStyles } from "../styles/common.jsx";

export function ConnectionStatus(props) {
	const [isOpen, setIsOpen] = createSignal(false);

	if (props.session.status !== "ready") return null;

	const isHost = props.session.mode === "host";
	const statusText = isHost ? "Hosting" : "Connected";
	const statusColor = isHost ? colors.accentPear : colors.accentPearLight;

	const handleClearBoard = async () => {
		setIsOpen(false);

		const result = await swal.fire({
			title: "Clear Board?",
			text: "This will remove all strokes for everyone.",
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Clear",
			cancelButtonText: "Cancel",
		});

		if (result.isConfirmed) {
			try {
				await props.onClearBoard();
				toast.fire({ icon: "success", title: "Board cleared" });
			} catch (err) {
				await swal.fire({
					title: "Clear Failed",
					text: err?.message || "Could not clear board",
					icon: "error",
				});
			}
		}
	};

	const handleCopyInvite = async () => {
		setIsOpen(false);
		try {
			await navigator.clipboard.writeText(props.session.invite);
			toast.fire({ icon: "success", title: "Invite copied!" });
		} catch {
			toast.fire({ icon: "error", title: "Could not copy invite" });
		}
	};

	return (
		<div
			style={{ position: "fixed", top: "12px", right: "12px", "z-index": 10 }}
		>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen())}
				style={{
					display: "flex",
					"align-items": "center",
					gap: "6px",
					padding: "8px 12px",
					background: colors.bgCard,
					border: `1px solid ${colors.border}`,
					"border-radius": "8px",
					color: colors.textPrimary,
					cursor: "pointer",
					"font-size": "0.85rem",
				}}
			>
				<span
					style={{
						width: "8px",
						height: "8px",
						"border-radius": "50%",
						background: statusColor,
					}}
				/>
				<span>{statusText}</span>
				<span style={{ "font-size": "0.7rem", color: colors.textSecondary }}>
					▼
				</span>
			</button>
			{isOpen() && (
				<div style={modalStyles.dropdown.container}>
					{props.session.invite && (
						<button
							type="button"
							onClick={handleCopyInvite}
							style={modalStyles.dropdown.item}
						>
							Copy Invite
						</button>
					)}
					<button
						type="button"
						onClick={handleClearBoard}
						style={modalStyles.dropdown.item}
					>
						Clear Board
					</button>
					<button
						type="button"
						onClick={() => location.reload()}
						style={{ ...modalStyles.dropdown.item, color: colors.error }}
					>
						Disconnect
					</button>
				</div>
			)}
		</div>
	);
}
