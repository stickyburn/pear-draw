import { colors, strokeColors } from "../styles/common.jsx";

export function Toolbar(props) {
	const tools = [
		{ id: "freehand", label: "Draw", icon: "✎" },
		{ id: "rect", label: "Rect", icon: "▢" },
	];

	return (
		<div
			style={{
				position: "absolute",
				top: "60px",
				left: "12px",
				display: "flex",
				"flex-direction": "column",
				gap: "8px",
				"z-index": 10,
				background: colors.bgCard,
				border: `1px solid ${colors.border}`,
				"border-radius": "12px",
				padding: "8px",
			}}
		>
			{tools.map((tool) => (
				<button
					type="button"
					onClick={() => props.setTool?.(tool.id)}
					style={{
						width: "40px",
						height: "40px",
						display: "flex",
						"align-items": "center",
						"justify-content": "center",
						background:
							props.activeTool() === tool.id
								? colors.accentPear
								: "transparent",
						color:
							props.activeTool() === tool.id
								? colors.bgDarkest
								: colors.textPrimary,
						border:
							props.activeTool() === tool.id
								? `1px solid ${colors.accentPearLight}`
								: `1px solid ${colors.border}`,
						"border-radius": "8px",
						cursor: "pointer",
						"font-size": "18px",
						transition: "all 0.15s ease",
					}}
					title={tool.label}
				>
					{tool.icon}
				</button>
			))}

			<div
				style={{
					height: "1px",
					background: colors.border,
					margin: "4px 0",
				}}
			/>

			<div style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
				{strokeColors.map((color) => (
					<button
						type="button"
						onClick={() => props.setStrokeColor?.(color)}
						style={{
							width: "40px",
							height: "40px",
							display: "flex",
							"align-items": "center",
							"justify-content": "center",
							background: "transparent",
							border: `2px solid ${
								props.strokeColor() === color
									? colors.textPrimary
									: "transparent"
							}`,
							"border-radius": "8px",
							cursor: "pointer",
						}}
						title={`Color: ${color}`}
					>
						<div
							style={{
								width: "24px",
								height: "24px",
								"border-radius": "50%",
								background: color,
							}}
						/>
					</button>
				))}
			</div>

			<div
				style={{
					height: "1px",
					background: colors.border,
					margin: "4px 0",
				}}
			/>

			<div style={{ display: "flex", "align-items": "center", gap: "4px" }}>
				<input
					type="range"
					min="1"
					max="20"
					value={props.strokeWidth()}
					onInput={(e) => props.setStrokeWidth?.(Number(e.target.value))}
					style={{
						width: "100%",
						accentColor: colors.accentPear,
					}}
					title={`Stroke width: ${props.strokeWidth()}px`}
				/>
			</div>
		</div>
	);
}
