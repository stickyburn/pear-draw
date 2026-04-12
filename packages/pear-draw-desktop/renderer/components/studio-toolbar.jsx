import { createSignal, For } from "solid-js";
import {
	durations,
	easings,
	glass,
	shadows,
	strokeColors,
	studio,
} from "../styles/index.jsx";

const tools = [
	{
		id: "freehand",
		label: "Draw",
		description: "Freehand drawing",
		icon: (props) => (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				{...props}
			>
				<title>Freehand</title>
				<path d="m12 19 7-7 3 3-7 7-3-3z" />
				<path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
				<path d="m2 2 7.6 7.6" />
				<circle cx="11" cy="11" r="2" />
			</svg>
		),
	},
	{
		id: "rect",
		label: "Rectangle",
		description: "Draw rectangles",
		icon: (props) => (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				{...props}
			>
				<title>Rectangle</title>
				<rect width="18" height="18" x="3" y="3" rx="2" />
			</svg>
		),
	},
	{
		id: "circle",
		label: "Circle",
		description: "Draw circles",
		icon: (props) => (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				{...props}
			>
				<title>Circle</title>
				<circle cx="12" cy="12" r="10" />
			</svg>
		),
	},
	{
		id: "text",
		label: "Text",
		description: "Add text",
		icon: (props) => (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				{...props}
			>
				<title>Text</title>
				<path d="M4 7V4h16v3" />
				<path d="M9 20h6" />
				<path d="M12 4v16" />
			</svg>
		),
	},
	{
		id: "select",
		label: "Select",
		description: "Select & move",
		icon: (props) => (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				{...props}
			>
				<title>Select</title>
				<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
				<path d="M13 13l6 6" />
			</svg>
		),
	},
	{
		id: "focus",
		label: "Focus Mode",
		description: "Enter immersive mode (H to toggle)",
		icon: (props) => (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				{...props}
			>
				<title>Focus Mode</title>
				<path d="M8 3H5a2 2 0 0 0-2 2v3" />
				<path d="M21 8V5a2 2 0 0 0-2-2h-3" />
				<path d="M3 16v3a2 2 0 0 0 2 2h3" />
				<path d="M16 21h3a2 2 0 0 0 2-2v-3" />
			</svg>
		),
	},
];

const sizePresets = [2, 4, 8, 12, 20, 32];

export function StudioToolbar(props) {
	const [hoveredTool, setHoveredTool] = createSignal(null);

	return (
		<div
			style={{
				position: "absolute",
				top: "80px",
				left: props.isFocusMode?.() ? "-100px" : "24px",
				"z-index": 50,
				display: "flex",
				"flex-direction": "column",
				gap: "12px",
				transition: `all ${durations.slow} ${easings.premium}`,
				opacity: props.isFocusMode?.() ? 0 : 1,
				"pointer-events": props.isFocusMode?.() ? "none" : "auto",
			}}
		>
			<div
				style={{
					...glass.heavy,
					"border-radius": "16px",
					padding: "8px",
					display: "flex",
					"flex-direction": "column",
					gap: "4px",
					"box-shadow": `${shadows.lg}, 0 0 0 1px rgba(139, 92, 246, 0.08)`,
				}}
			>
				<For each={tools}>
					{(tool) => (
						<button
							type="button"
							onClick={() => {
								if (tool.id === "focus") {
									props.onToggleFocus?.();
								} else {
									props.setTool?.(tool.id);
								}
							}}
							onMouseEnter={() => setHoveredTool(tool.id)}
							onMouseLeave={() => setHoveredTool(null)}
							style={{
								position: "relative",
								width: "44px",
								height: "44px",
								display: "flex",
								"align-items": "center",
								"justify-content": "center",
								background:
									props.activeTool() === tool.id
										? `linear-gradient(135deg, ${studio.neon.violet} 0%, #7c3aed 100%)`
										: hoveredTool() === tool.id
											? studio.surface
											: "transparent",
								color:
									props.activeTool() === tool.id
										? "white"
										: studio.text.secondary,
								border: "none",
								"border-radius": "12px",
								cursor: "pointer",
								transition: `all ${durations.fast} ${easings.spring}`,
								transform:
									hoveredTool() === tool.id && props.activeTool() !== tool.id
										? "scale(1.08) translateY(-1px)"
										: "scale(1)",
								"box-shadow":
									props.activeTool() === tool.id
										? `0 4px 20px ${studio.neon.violet}50, inset 0 1px 0 rgba(255,255,255,0.2)`
										: hoveredTool() === tool.id
											? `0 4px 12px rgba(0,0,0,0.3)`
											: "none",
							}}
							title={tool.description}
							aria-label={tool.label}
						>
							<tool.icon
								style={{
									transition: `transform ${durations.fast} ${easings.spring}`,
									transform:
										hoveredTool() === tool.id ? "scale(1.1)" : "scale(1)",
								}}
							/>

							{props.activeTool() === tool.id && (
								<div
									style={{
										position: "absolute",
										bottom: "6px",
										left: "50%",
										transform: "translateX(-50%)",
										width: "4px",
										height: "4px",
										"border-radius": "50%",
										background: "rgba(255,255,255,0.6)",
									}}
								/>
							)}
						</button>
					)}
				</For>

				<div
					style={{ height: "1px", background: studio.border, margin: "4px 0" }}
				/>

				<button
					type="button"
					onClick={() => props.onDelete?.()}
					style={{
						width: "44px",
						height: "44px",
						display: "flex",
						"align-items": "center",
						"justify-content": "center",
						background: "transparent",
						color: studio.text.muted,
						border: "none",
						"border-radius": "12px",
						cursor: "pointer",
						transition: `all ${durations.fast} ${easings.spring}`,
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = `${studio.neon.rose}20`;
						e.currentTarget.style.color = studio.neon.rose;
						e.currentTarget.style.transform = "scale(1.08)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = "transparent";
						e.currentTarget.style.color = studio.text.muted;
						e.currentTarget.style.transform = "scale(1)";
					}}
					title="Delete selected"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<title>Delete</title>
						<path d="M3 6h18" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
						<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						<line x1="10" y1="11" x2="10" y2="17" />
						<line x1="14" y1="11" x2="14" y2="17" />
					</svg>
				</button>
			</div>

			<div
				style={{
					...glass.heavy,
					"border-radius": "16px",
					padding: "10px",
					display: "grid",
					"grid-template-columns": "repeat(3, 1fr)",
					gap: "8px",
					"box-shadow": `${shadows.lg}, 0 0 0 1px rgba(139, 92, 246, 0.08)`,
				}}
			>
				<For each={strokeColors}>
					{(color) => {
						const [localHover, setLocalHover] = createSignal(false);
						return (
							<button
								type="button"
								onClick={() => props.setStrokeColor?.(color)}
								onMouseEnter={() => setLocalHover(true)}
								onMouseLeave={() => setLocalHover(false)}
								style={{
									width: "28px",
									height: "28px",
									"border-radius": "8px",
									background: color,
									border:
										props.strokeColor() === color
											? `2px solid ${studio.text.primary}`
											: `1px solid ${studio.border}`,
									cursor: "pointer",
									transition: `all ${durations.fast} ${easings.spring}`,
									transform:
										localHover() || props.strokeColor() === color
											? "scale(1.15)"
											: "scale(1)",
									"box-shadow":
										props.strokeColor() === color
											? `0 0 16px ${color}60, 0 0 32px ${color}30`
											: localHover()
												? `0 0 12px ${color}40`
												: "0 2px 4px rgba(0,0,0,0.3)",
								}}
							/>
						);
					}}
				</For>
			</div>

			<div
				style={{
					...glass.heavy,
					"border-radius": "16px",
					padding: "12px",
					display: "flex",
					"flex-direction": "column",
					gap: "12px",
					"box-shadow": `${shadows.lg}, 0 0 0 1px rgba(139, 92, 246, 0.08)`,
				}}
			>
				<div
					style={{
						display: "flex",
						"justify-content": "space-between",
						"align-items": "center",
					}}
				>
					<span
						style={{
							"font-family": "var(--font-mono)",
							"font-size": "0.6rem",
							color: studio.text.muted,
							"letter-spacing": "0.1em",
							"text-transform": "uppercase",
						}}
					>
						Size
					</span>
					<span
						style={{
							"font-family": "var(--font-mono)",
							"font-size": "0.75rem",
							color: studio.text.secondary,
							"font-weight": 500,
						}}
					>
						{props.strokeWidth()}
						<span style={{ color: studio.text.muted, "font-size": "0.6rem" }}>
							px
						</span>
					</span>
				</div>

				<div
					style={{
						display: "flex",
						"justify-content": "space-between",
						"align-items": "center",
						background: studio.abyss,
						padding: "8px",
						"border-radius": "10px",
						border: `1px solid ${studio.border}`,
					}}
				>
					<For each={sizePresets}>
						{(size) => (
							<button
								type="button"
								onClick={() => props.setStrokeWidth?.(size)}
								style={{
									width: "24px",
									height: "24px",
									display: "flex",
									"align-items": "center",
									"justify-content": "center",
									background: "transparent",
									border: "none",
									cursor: "pointer",
									position: "relative",
								}}
							>
								<div
									style={{
										width: `${Math.min(16, Math.max(4, size / 2))}px`,
										height: `${Math.min(16, Math.max(4, size / 2))}px`,
										"border-radius": "50%",
										background:
											props.strokeWidth() === size
												? studio.neon.violet
												: studio.text.muted,
										transition: `all ${durations.fast} ${easings.spring}`,
										transform:
											props.strokeWidth() === size ? "scale(1.2)" : "scale(1)",
										"box-shadow":
											props.strokeWidth() === size
												? `0 0 12px ${studio.neon.violet}60`
												: "none",
									}}
								/>
								{props.strokeWidth() === size && (
									<div
										style={{
											position: "absolute",
											inset: "-3px",
											border: `1px solid ${studio.neon.violet}40`,
											"border-radius": "50%",
											animation: "studio-pulse-glow 2s infinite",
											"--glow-color": studio.neon.violet,
										}}
									/>
								)}
							</button>
						)}
					</For>
				</div>

				<div style={{ position: "relative", padding: "4px 0" }}>
					<input
						type="range"
						min="1"
						max="50"
						value={props.strokeWidth()}
						onInput={(e) => props.setStrokeWidth?.(Number(e.target.value))}
						style={{
							width: "100%",
							cursor: "ew-resize",
							"-webkit-appearance": "none",
							appearance: "none",
							background: "transparent",
							height: "16px",
						}}
					/>
					<style>{`
            input[type="range"]::-webkit-slider-runnable-track { height: 3px; background: linear-gradient(to right, ${studio.border}, ${studio.borderGlow}); border-radius: 2px; }
            input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; background: ${studio.neon.violet}; border: 2px solid ${studio.text.primary}; border-radius: 50%; margin-top: -6px; box-shadow: 0 0 10px ${studio.neon.violet}60; transition: all ${durations.fast} ${easings.spring}; }
            input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
          `}</style>
				</div>

				<div
					style={{
						height: "44px",
						background: studio.abyss,
						"border-radius": "10px",
						display: "flex",
						"align-items": "center",
						padding: "0 12px",
						overflow: "hidden",
						border: `1px solid ${studio.border}`,
						position: "relative",
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: 0,
							"background-image": `radial-gradient(circle, ${studio.border} 1px, transparent 1px)`,
							"background-size": "8px 8px",
							opacity: 0.5,
						}}
					/>
					<div
						style={{
							width: "100%",
							height: `${Math.min(28, props.strokeWidth())}px`,
							background: props.strokeColor(),
							"border-radius": "100px",
							transition: `all ${durations.fast} ${easings.spring}`,
							"box-shadow": `0 0 ${Math.min(24, props.strokeWidth())}px ${props.strokeColor()}50`,
							position: "relative",
							"z-index": 1,
						}}
					/>
				</div>
			</div>
		</div>
	);
}
