import { For } from "solid-js";
import { colors } from "../styles/common.jsx";

export function CursorOverlay(props) {
	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				"pointer-events": "none",
				"z-index": 100,
			}}
		>
			<For each={props.cursors?.() ?? []}>
				{(cursor) => {
					if (cursor.peerId === props.localPeerId) return null;

					const x = () => (cursor.x ?? 0) * (props.canvasWidth?.() ?? 1);
					const y = () => (cursor.y ?? 0) * (props.canvasHeight?.() ?? 1);

					return (
						<div
							style={{
								position: "absolute",
								left: `${x()}px`,
								top: `${y()}px`,
								transform: "translate(-50%, -50%)",
								transition: "left 0.1s ease-out, top 0.1s ease-out",
							}}
						>
							<div
								style={{
									width: "20px",
									height: "20px",
									"border-radius": "50%",
									background: cursor.color || colors.accentPear,
									border: `2px solid ${colors.textPrimary}`,
									"box-shadow": "0 2px 8px rgba(0,0,0,0.3)",
								}}
							/>
							<div
								style={{
									position: "absolute",
									left: "24px",
									top: "0",
									background: colors.bgCard,
									color: colors.textPrimary,
									padding: "2px 8px",
									"border-radius": "4px",
									"font-size": "12px",
									"white-space": "nowrap",
									border: `1px solid ${colors.border}`,
								}}
							>
								{cursor.profileName || "peer"}
							</div>
						</div>
					);
				}}
			</For>
		</div>
	);
}
