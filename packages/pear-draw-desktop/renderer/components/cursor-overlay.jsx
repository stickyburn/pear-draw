import { For } from "solid-js";
import { colors, fonts, easings } from "../styles/common.jsx";

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
								transition: `left 80ms ${easings.gentle}, top 80ms ${easings.gentle}`,
							}}
						>
							{/* Arrow cursor — sharp, no shadow */}
							<svg width="14" height="18" viewBox="0 0 14 18">
								<path
									d="M0 0 L0 14 L4 10.5 L7 16 L9 15 L6 9.5 L11 9.5 Z"
									fill={cursor.color || colors.snow}
									stroke={colors.carbon}
									strokeWidth="0.75"
								/>
							</svg>
							{/* Name tag */}
							<div
								style={{
									position: "absolute",
									left: "15px",
									top: "14px",
									background: colors.carbon,
									color: colors.snow,
									padding: "1px 6px",
									"border-radius": "0",
									"font-size": "0.6rem",
									"font-family": fonts.mono,
									"letter-spacing": "0.06em",
									"white-space": "nowrap",
									border: `1px solid ${colors.granite}`,
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