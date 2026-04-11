import { createSignal } from "solid-js";
import { swal, toast } from "../lib/swal.jsx";
import { colors, fonts, easings, durations, modalStyles } from "../styles/common.jsx";

export function ConnectionStatus(props) {
	const [isOpen, setIsOpen] = createSignal(false);

	if (props.session.status !== "ready") return null;

	const isHost = props.session.mode === "host";
	const statusText = isHost ? "Hosting" : "Connected";
	const statusColor = isHost ? colors.aurora : colors.fjord;

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
			toast.fire({ icon: "success", title: "Invite copied" });
		} catch {
			toast.fire({ icon: "error", title: "Could not copy invite" });
		}
	};

	return (
		<div
			style={{ position: "fixed", top: "16px", right: "16px", "z-index": 10 }}
		>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen())}
				style={{
					display: "flex",
					"align-items": "center",
					gap: "8px",
					padding: "6px 16px",
					background: colors.carbon,
					border: `1px solid ${colors.granite}`,
					"border-radius": "0",
					color: colors.snow,
					cursor: "pointer",
					"font-size": "0.7rem",
					"font-family": fonts.mono,
					"letter-spacing": "0.08em",
					"text-transform": "uppercase",
					transition: `background-color ${durations.fast} ${easings.premium}, color ${durations.fast} ${easings.premium}, border-color ${durations.fast} ${easings.premium}`,
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.backgroundColor = colors.snow;
					e.currentTarget.style.color = colors.carbon;
					e.currentTarget.style.borderColor = colors.snow;
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.backgroundColor = colors.carbon;
					e.currentTarget.style.color = colors.snow;
					e.currentTarget.style.borderColor = colors.granite;
				}}
			>
				<span
					style={{
						width: "5px",
						height: "5px",
						"border-radius": "0",
						background: statusColor,
					}}
				/>
				<span>{statusText}</span>
				<span style={{ opacity: 0.4, "font-size": "0.55rem" }}>▾</span>
			</button>
			{isOpen() && (
				<div style={{
					...modalStyles.dropdown.container,
					animation: `wipe-down ${durations.normal} ${easings.premium} both`,
				}}>
					{props.session.invite && (
						<button
							type="button"
							onClick={handleCopyInvite}
							style={modalStyles.dropdown.item}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = colors.snow;
								e.currentTarget.style.color = colors.carbon;
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = "transparent";
								e.currentTarget.style.color = colors.snow;
							}}
						>
							Copy Invite
						</button>
					)}
					<button
						type="button"
						onClick={handleClearBoard}
						style={modalStyles.dropdown.item}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = colors.snow;
							e.currentTarget.style.color = colors.carbon;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = "transparent";
							e.currentTarget.style.color = colors.snow;
						}}
					>
						Clear Board
					</button>
					<div style={{ height: "1px", background: colors.granite }} />
					<button
						type="button"
						onClick={() => props.onDisconnect()}
						style={{
							...modalStyles.dropdown.item,
							color: colors.rust,
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = colors.rust;
							e.currentTarget.style.color = colors.snow;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = "transparent";
							e.currentTarget.style.color = colors.rust;
						}}
					>
						Disconnect
					</button>
				</div>
			)}
		</div>
	);
}