import { createSignal } from "solid-js";
import {
	colors,
	durations,
	easings,
	fonts,
	strokeColors,
} from "../styles/common.jsx";

export function Toolbar(props) {
	const [hoveredTool, setHoveredTool] = createSignal(null);

	const tools = [
		{
			id: "freehand",
			label: "Draw",
			description: "Freehand drawing",
			icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
		},
		{
			id: "rect",
			label: "Rectangle",
			description: "Draw rectangles",
			icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
		},
		{
			id: "circle",
			label: "Circle",
			description: "Draw circles",
			icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>`,
		},
		{
			id: "text",
			label: "Text",
			description: "Add text",
			icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>`,
		},
		{
			id: "select",
			label: "Select",
			description: "Select & move",
			icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>`,
		},
	];

	const activeTool = props.activeTool;

	// Group colors into a grid for better UX
	const colorGrid = [strokeColors.slice(0, 3), strokeColors.slice(3, 5)];

	return (
		<div
			style={{
				position: "absolute",
				top: "64px",
				left: "20px",
				"z-index": 10,
				display: "flex",
				"flex-direction": "column",
				gap: "12px",
				animation: `slide-in-left ${durations.slow} ${easings.premium} both`,
				"animation-delay": "150ms",
			}}
		>
			{/* Tools Section */}
			<div
				style={{
					background: `rgba(26, 26, 26, 0.85)`,
					"backdrop-filter": "blur(20px)",
					border: `1px solid ${colors.granite}`,
					"border-radius": "12px",
					padding: "6px",
					display: "flex",
					"flex-direction": "column",
					gap: "4px",
					boxShadow:
						"0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)",
				}}
			>
				{tools.map((tool) => {
					const isActive = activeTool() === tool.id;
					const isHovered = hoveredTool() === tool.id;

					return (
						<button
							type="button"
							onClick={() => props.setTool?.(tool.id)}
							onMouseEnter={() => setHoveredTool(tool.id)}
							onMouseLeave={() => setHoveredTool(null)}
							style={{
								position: "relative",
								width: "44px",
								height: "44px",
								display: "flex",
								"align-items": "center",
								"justify-content": "center",
								background: isActive
									? `linear-gradient(135deg, ${colors.snow} 0%, ${colors.frost} 100%)`
									: isHovered
										? "rgba(245, 240, 235, 0.08)"
										: "transparent",
								color: isActive ? colors.carbon : colors.snow,
								border: "none",
								"border-radius": "8px",
								cursor: "pointer",
								transition: `all ${durations.fast} ${easings.premium}`,
								transform: isHovered && !isActive ? "scale(1.05)" : "scale(1)",
								boxShadow: isActive
									? `0 0 20px rgba(245, 240, 235, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`
									: isHovered
										? `0 0 12px rgba(245, 240, 235, 0.1)`
										: "none",
							}}
							title={tool.description}
							aria-label={tool.label}
						>
							<span
								style={{
									display: "flex",
									"align-items": "center",
									"justify-content": "center",
									transition: `transform ${durations.fast} ${easings.premium}`,
									transform: isHovered ? "translateY(-1px)" : "translateY(0)",
								}}
								// eslint-disable-next-line solid/no-innerhtml
								innerHTML={tool.icon}
							/>

							{/* Active indicator dot */}
							{isActive && (
								<div
									style={{
										position: "absolute",
										bottom: "4px",
										left: "50%",
										transform: "translateX(-50%)",
										width: "4px",
										height: "4px",
										"border-radius": "50%",
										background: colors.carbon,
										opacity: 0.5,
									}}
								/>
							)}
						</button>
					);
				})}
			</div>

			{/* Delete Button */}
			<button
				type="button"
				onClick={() => props.onDelete?.()}
				style={{
					background: `rgba(26, 26, 26, 0.85)`,
					"backdrop-filter": "blur(20px)",
					border: `1px solid ${colors.granite}`,
					"border-radius": "12px",
					padding: "12px",
					cursor: "pointer",
					display: "flex",
					"align-items": "center",
					"justify-content": "center",
					transition: `all ${durations.fast} ${easings.premium}`,
					color: colors.snow,
					width: "44px",
					height: "44px",
					boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)",
				}}
				title="Delete selected (Delete key)"
				aria-label="Delete selected objects"
			>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 6h18"/>
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
					<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
					<line x1="10" y1="11" x2="10" y2="17"/>
					<line x1="14" y1="11" x2="14" y2="17"/>
				</svg>
			</button>

			{/* Colors Section */}
			<div
				style={{
					background: `rgba(26, 26, 26, 0.85)`,
					"backdrop-filter": "blur(20px)",
					border: `1px solid ${colors.granite}`,
					"border-radius": "12px",
					padding: "8px",
					display: "flex",
					"flex-direction": "column",
					gap: "6px",
					boxShadow:
						"0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)",
				}}
			>
				{colorGrid.map((row, rowIdx) => (
					<div
						key={rowIdx}
						style={{
							display: "flex",
							gap: "6px",
							justifyContent: row.length < 3 ? "center" : "flex-start",
						}}
					>
						{row.map((color) => {
							const isActive = props.strokeColor() === color;
							const [isHovered, setIsHovered] = createSignal(false);

							return (
								<button
									type="button"
									onClick={() => props.setStrokeColor?.(color)}
									onMouseEnter={() => setIsHovered(true)}
									onMouseLeave={() => setIsHovered(false)}
									style={{
										width: "28px",
										height: "28px",
										"border-radius": "6px",
										background: color,
										border: isActive
											? `2px solid ${colors.snow}`
											: `1px solid rgba(255, 255, 255, 0.2)`,
										cursor: "pointer",
										transition: `all ${durations.fast} ${easings.premium}`,
										transform:
											isHovered() || isActive ? "scale(1.1)" : "scale(1)",
										boxShadow: isActive
											? `0 0 16px ${color}80, inset 0 0 0 1px rgba(255, 255, 255, 0.3)`
											: isHovered()
												? `0 0 12px ${color}40`
												: "0 2px 4px rgba(0, 0, 0, 0.3)",
									}}
									title={color}
									aria-label={`Color ${color}`}
								/>
							);
						})}
					</div>
				))}
			</div>

			{/* Stroke Width Section */}
			<div
				style={{
					background: `rgba(26, 26, 26, 0.85)`,
					"backdrop-filter": "blur(20px)",
					border: `1px solid ${colors.granite}`,
					"border-radius": "12px",
					padding: "12px",
					boxShadow:
						"0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)",
					display: "flex",
					"flex-direction": "column",
					gap: "12px",
				}}
			>
				{/* Label & Value */}
				<div
					style={{
						display: "flex",
						"justify-content": "space-between",
						"align-items": "baseline",
					}}
				>
					<span
						style={{
							"font-family": fonts.mono,
							"font-size": "0.55rem",
							color: colors.slate,
							"letter-spacing": "0.1em",
							"text-transform": "uppercase",
						}}
					>
						Size
					</span>
					<span
						style={{
							"font-family": fonts.mono,
							"font-size": "0.7rem",
							color: colors.snow,
							"letter-spacing": "0.05em",
						}}
					>
						{props.strokeWidth()}
						<span style={{ color: colors.slate, "font-size": "0.6rem" }}>
							px
						</span>
					</span>
				</div>

				{/* Tactile Presets */}
				<div
					style={{
						display: "flex",
						"justify-content": "space-between",
						"align-items": "center",
						background: "rgba(0,0,0,0.2)",
						padding: "8px",
						"border-radius": "8px",
						border: `1px solid rgba(255,255,255,0.05)`,
					}}
				>
					{[2, 4, 8, 16, 24].map((w) => {
						const isActive = props.strokeWidth() === w;
						const [isHovered, setIsHovered] = createSignal(false);

						return (
							<button
								type="button"
								onClick={() => props.setStrokeWidth(w)}
								onMouseEnter={() => setIsHovered(true)}
								onMouseLeave={() => setIsHovered(false)}
								style={{
									width: "24px",
									height: "24px",
									display: "flex",
									"align-items": "center",
									"justify-content": "center",
									background: "transparent",
									border: "none",
									cursor: "pointer",
									padding: 0,
									position: "relative",
								}}
							>
								<div
									style={{
										width: `${Math.min(18, Math.max(2, w / 1.5))}px`,
										height: `${Math.min(18, Math.max(2, w / 1.5))}px`,
										background: isActive
											? colors.snow
											: isHovered()
												? colors.ash
												: colors.granite,
										"border-radius": "50%",
										transition: `all ${durations.fast} ${easings.premium}`,
										transform: isActive
											? "scale(1.2)"
											: isHovered()
												? "scale(1.1)"
												: "scale(1)",
										boxShadow: isActive ? `0 0 12px ${colors.snow}60` : "none",
									}}
								/>
								{isActive && (
									<div
										style={{
											position: "absolute",
											inset: "-4px",
											border: `1px solid ${colors.snow}30`,
											"border-radius": "50%",
											animation: "pulse 2s infinite",
										}}
									/>
								)}
							</button>
						);
					})}
				</div>

				{/* Fine-tune Slider */}
				<div style={{ position: "relative", padding: "4px 0" }}>
					<input
						type="range"
						min="1"
						max="40"
						value={props.strokeWidth()}
						onInput={(e) => props.setStrokeWidth?.(Number(e.target.value))}
						style={{
							width: "100%",
							margin: 0,
							cursor: "ew-resize",
						}}
					/>
					{/* Spatial Track Decoration */}
					<div
						style={{
							position: "absolute",
							top: "50%",
							left: 0,
							right: 0,
							height: "1px",
							background: `linear-gradient(to right, ${colors.granite}, ${colors.slate}, ${colors.granite})`,
							"pointer-events": "none",
							"z-index": -1,
							opacity: 0.3,
						}}
					/>
				</div>

				{/* Preview - Living Stroke */}
				<div
					style={{
						height: "40px",
						background: "rgba(0, 0, 0, 0.4)",
						"border-radius": "8px",
						display: "flex",
						"align-items": "center",
						padding: "0 12px",
						overflow: "hidden",
						border: `1px solid ${colors.granite}40`,
						position: "relative",
					}}
				>
					{/* Subtle grid background for the preview */}
					<div
						style={{
							position: "absolute",
							inset: 0,
							"background-image": `radial-gradient(circle, ${colors.granite}40 1px, transparent 1px)`,
							"background-size": "8px 8px",
							opacity: 0.5,
						}}
					/>
					<div
						style={{
							width: "100%",
							height: `${props.strokeWidth()}px`,
							maxHeight: "32px",
							background: props.strokeColor(),
							"border-radius": "100px",
							transition: `all ${durations.fast} ${easings.premium}`,
							boxShadow: `0 0 ${Math.min(20, props.strokeWidth())}px ${props.strokeColor()}60`,
							position: "relative",
							"z-index": 1,
						}}
					/>
				</div>
			</div>
		</div>
	);
}
