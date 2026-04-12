// ═══════════════════════════════════════════════════════════════
// TOKYO MIDNIGHT CREATIVE STUDIO - Design System Tokens
// CSS strings extracted to ./swal-theme.jsx and ./keyframes.jsx
// ═══════════════════════════════════════════════════════════════

export const studio = {
	void: "#050505",
	abyss: "#0a0a0a",
	midnight: "#111111",
	surface: "#161616",
	elevated: "#1e1e1e",
	floating: "#252525",
	neon: {
		violet: "#8b5cf6",
		cyan: "#06b6d4",
		rose: "#f43f5e",
		amber: "#f59e0b",
		emerald: "#10b981",
	},
	text: {
		primary: "#fafafa",
		secondary: "#a1a1aa",
		muted: "#71717a",
		ghost: "#52525b",
	},
	border: "#27272a",
	borderGlow: "#3f3f46",
};

export const strokeColors = [
	"#fafafa",
	"#8b5cf6",
	"#06b6d4",
	"#f43f5e",
	"#f59e0b",
	"#10b981",
];

export const fonts = {
	display: '"Space Grotesk", "Inter", system-ui, sans-serif',
	sans: '"Inter", system-ui, sans-serif',
	mono: '"JetBrains Mono", "Fira Code", monospace',
};

export const easings = {
	premium: "cubic-bezier(0.22, 1, 0.36, 1)",
	spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

export const durations = {
	fast: "150ms",
	normal: "250ms",
	slow: "400ms",
	cinematic: "600ms",
};

export const shadows = {
	sm: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
	md: "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
	lg: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
	xl: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
};

export const glass = {
	light: {
		background: "rgba(255, 255, 255, 0.05)",
		backdropFilter: "blur(20px)",
	},
	medium: { background: "rgba(22, 22, 22, 0.7)", backdropFilter: "blur(24px)" },
	heavy: {
		background: "rgba(10, 10, 10, 0.85)",
		backdropFilter: "blur(32px) saturate(200%)",
		border: "1px solid rgba(255, 255, 255, 0.04)",
	},
};

export const interactive = {
	button: {
		rest: { transform: "scale(1)" },
		hover: { transform: "scale(1.02)" },
		active: { transform: "scale(0.98)" },
	},
};

export const modalStyles = {
	label:
		"display:block;text-align:left;color:#71717a;font-family:Inter;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;",
};

export const peerColors = [
	"#8b5cf6",
	"#06b6d4",
	"#f43f5e",
	"#f59e0b",
	"#10b981",
	"#ec4899",
	"#3b82f6",
	"#a78bfa",
	"#fb923c",
	"#2dd4bf",
];
export function getPeerColor(index) {
	return peerColors[index % peerColors.length];
}

/** Deterministic color from peerId — same peer always gets same color regardless of join order. */
export function hashToPeerColor(peerId) {
	if (!peerId) return peerColors[0];
	let hash = 0;
	for (let i = 0; i < peerId.length; i++) {
		hash = (hash << 5) - hash + peerId.charCodeAt(i);
		hash |= 0; // Convert to 32-bit integer
	}
	return peerColors[Math.abs(hash) % peerColors.length];
}
