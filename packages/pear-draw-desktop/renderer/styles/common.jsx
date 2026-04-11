// ──────────────────────────────────────────────
// Nordic Avant-Garde Design Tokens
// ──────────────────────────────────────────────

export const colors = {
	snow: "#F5F0EB",
	carbon: "#1A1A1A",
	granite: "#4A4A4A",
	slate: "#7A7A7A",
	ash: "#B0B0B0",
	fjord: "#2B4B5B",
	aurora: "#5B8A72",
	rust: "#8B4A3A",
	ember: "#B8864A",

	// Surfaces
	frost: "#E8E3DD",
	ice: "#DDD8D2",
	basalt: "#2A2A2A",
	obsidian: "#0D0D0D",

	// Canvas
	canvasBg: "#0D0D0D",
	bgCard: "#1A1A1A",
	bgElevated: "#2A2A2A",
	textPrimary: "#F5F0EB",
	textSecondary: "#B0B0B0",
	textMuted: "#7A7A7A",
	accent: "#5B8A72",
	accentLight: "#7BA992",
	error: "#8B4A3A",
	border: "#4A4A4A",
	borderLight: "#2A2A2A",
	buttonPrimary: "#F5F0EB",
};

export const fonts = {
	display: '"Instrument Serif", Georgia, serif',
	sans: '"Inter", system-ui, sans-serif',
	mono: '"JetBrains Mono", monospace',
};

export const easings = {
	premium: "cubic-bezier(0.22, 1, 0.36, 1)",
	aggressive: "cubic-bezier(0.76, 0, 0.24, 1)",
	dramatic: "cubic-bezier(0.87, 0, 0.13, 1)",
	gentle: "cubic-bezier(0.25, 0.1, 0.25, 1)",
};

export const durations = {
	fast: "150ms",
	normal: "300ms",
	slow: "500ms",
	dramatic: "800ms",
};

export const strokeColors = [
	"#F5F0EB", // Snow — primary stroke
	"#5B8A72", // Aurora — muted green
	"#2B4B5B", // Fjord — deep teal
	"#8B4A3A", // Rust — oxidized red
	"#B8864A", // Ember — warm amber
];

// Inversion hover helper
export function inversionHover(
	lightBg = colors.snow,
	lightColor = colors.carbon,
	darkBg = colors.carbon,
	darkColor = colors.snow,
) {
	return {
		onMouseEnter: (e) => {
			e.currentTarget.style.backgroundColor = lightBg;
			e.currentTarget.style.color = lightColor;
		},
		onMouseLeave: (e) => {
			e.currentTarget.style.backgroundColor = darkBg;
			e.currentTarget.style.color = darkColor;
		},
	};
}

// Modal for join/host, etc.
export const modalStyles = {
	label: [
		"display:block",
		"text-align:left",
		"margin-bottom:10px",
		`color:${colors.slate}`,
		`font-family:${fonts.sans}`,
		"font-size:0.65rem",
		"font-weight:600",
		"letter-spacing:0.15em",
		"text-transform:uppercase",
	].join(";"),

	input: [
		`background:${colors.obsidian}`,
		`color:${colors.snow}`,
		`border:1px solid ${colors.granite}`,
		"border-radius:8px",
		"padding:12px 14px",
		"width:100%",
		"margin:0",
		`font-family:${fonts.sans}`,
		"font-size:0.9rem",
		"outline:none",
		`transition:border-color ${durations.fast} ${easings.premium}, box-shadow ${durations.fast} ${easings.premium}`,
	].join(";"),

	textarea: [
		`background:${colors.obsidian}`,
		`color:${colors.snow}`,
		`border:1px solid ${colors.granite}`,
		"border-radius:8px",
		"padding:12px 14px",
		"width:100%",
		"margin:0",
		"min-height:80px",
		"resize:vertical",
		`font-family:${fonts.mono}`,
		"font-size:0.8rem",
		"line-height:1.5",
		`transition:border-color ${durations.fast} ${easings.premium}`,
	].join(";"),

	code: [
		"display:block",
		`background:${colors.obsidian}`,
		"padding:16px",
		"border-radius:8px",
		"word-break:break-all",
		"font-size:0.75rem",
		`font-family:${fonts.mono}`,
		`color:${colors.snow}`,
		`border:1px solid ${colors.granite}`,
		"line-height:1.6",
	].join(";"),

	dropdown: {
		container: {
			position: "absolute",
			top: "100%",
			right: 0,
			marginTop: "1px",
			background: colors.carbon,
			border: `1px solid ${colors.granite}`,
			borderRadius: "8px",
			overflow: "hidden",
			minWidth: "180px",
			boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
		},
		item: {
			width: "100%",
			padding: "12px 16px",
			background: "transparent",
			border: "none",
			color: colors.snow,
			textAlign: "left",
			cursor: "pointer",
			fontSize: "0.8rem",
			fontFamily: fonts.sans,
			letterSpacing: "0.03em",
			transition: `background-color ${durations.fast} ${easings.premium}`,
		},
	},
};

// SweetAlert2 - Nordic Avant-Garde Styled
export const swal2Overrides = `
  @keyframes fade-scale-in {
    0% { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }

  @keyframes slide-in-left {
    0% { opacity: 0; transform: translateX(-20px); }
    100% { opacity: 1; transform: translateX(0); }
  }

  /* Nordic Modal Base */
  .nordic-modal {
    font-family: ${fonts.sans} !important;
    border: 1px solid ${colors.granite} !important;
    border-radius: 16px !important;
    background: ${colors.carbon} !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
    padding: 32px !important;
  }

  .nordic-modal-wide {
    font-family: ${fonts.sans} !important;
    border: 1px solid ${colors.granite} !important;
    border-radius: 16px !important;
    background: ${colors.carbon} !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
    padding: 32px !important;
    width: 480px !important;
  }

  .nordic-title {
    font-family: ${fonts.display} !important;
    color: ${colors.snow} !important;
    padding: 0 !important;
  }

  .nordic-close {
    font-size: 1.25rem !important;
    color: ${colors.slate} !important;
    transition: all ${durations.fast} ${easings.premium} !important;
    top: 16px !important;
    right: 16px !important;
  }
  .nordic-close:hover {
    color: ${colors.snow} !important;
    transform: rotate(90deg);
  }

  /* Nordic Buttons */
  .nordic-btn-primary {
    background: ${colors.snow} !important;
    border: 1px solid ${colors.snow} !important;
    border-radius: 8px !important;
    color: ${colors.carbon} !important;
    padding: 12px 24px !important;
    font-weight: 600 !important;
    font-family: ${fonts.sans} !important;
    font-size: 0.8rem !important;
    letter-spacing: 0.04em !important;
    min-width: 140px !important;
    transition: all ${durations.fast} ${easings.premium} !important;
    box-shadow: 0 4px 12px rgba(245, 240, 235, 0.15) !important;
  }
  .nordic-btn-primary:hover {
    background: transparent !important;
    color: ${colors.snow} !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 8px 20px rgba(245, 240, 235, 0.2) !important;
  }

  .nordic-btn-secondary {
    background: transparent !important;
    border: 1px solid ${colors.granite} !important;
    border-radius: 8px !important;
    color: ${colors.snow} !important;
    padding: 12px 24px !important;
    font-weight: 600 !important;
    font-family: ${fonts.sans} !important;
    font-size: 0.8rem !important;
    letter-spacing: 0.04em !important;
    min-width: 140px !important;
    transition: all ${durations.fast} ${easings.premium} !important;
  }
  .nordic-btn-secondary:hover {
    background: rgba(245, 240, 235, 0.05) !important;
    border-color: ${colors.snow} !important;
    transform: translateY(-1px) !important;
  }

  .nordic-btn-tertiary {
    background: transparent !important;
    border: none !important;
    border-radius: 8px !important;
    color: ${colors.slate} !important;
    padding: 12px 24px !important;
    font-weight: 500 !important;
    font-family: ${fonts.sans} !important;
    font-size: 0.8rem !important;
    letter-spacing: 0.04em !important;
    transition: all ${durations.fast} ${easings.premium} !important;
  }
  .nordic-btn-tertiary:hover {
    color: ${colors.snow} !important;
    background: rgba(245, 240, 235, 0.03) !important;
  }

  /* Nordic Toast */
  .nordic-toast {
    border: 1px solid ${colors.granite} !important;
    border-radius: 8px !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4) !important;
    padding: 14px 20px !important;
    background: ${colors.carbon} !important;
    color: ${colors.snow} !important;
    font-family: ${fonts.sans} !important;
  }

  /* Legacy overrides */
  .swal2-popup {
    font-family: ${fonts.sans} !important;
    border: 1px solid ${colors.granite} !important;
    border-radius: 16px !important;
    background: ${colors.carbon} !important;
  }
  .swal2-title {
    font-family: ${fonts.display} !important;
    color: ${colors.snow} !important;
  }
  .swal2-html-container {
    color: ${colors.ash} !important;
  }
  .swal2-actions {
    gap: 12px !important;
    margin-top: 28px !important;
  }
  .swal2-close {
    font-size: 1.25rem !important;
    color: ${colors.slate} !important;
    transition: color ${durations.fast} ${easings.premium} !important;
  }
  .swal2-close:hover {
    color: ${colors.snow} !important;
  }
  .swal2-toast {
    border: 1px solid ${colors.granite} !important;
    border-radius: 8px !important;
    box-shadow: none !important;
    padding: 12px 16px !important;
    background: ${colors.carbon} !important;
    color: ${colors.snow} !important;
    font-family: ${fonts.mono} !important;
  }
  .swal2-confirm {
    background: ${colors.snow} !important;
    border: 1px solid ${colors.snow} !important;
    border-radius: 8px !important;
    color: ${colors.carbon} !important;
    padding: 12px 24px !important;
    font-weight: 600 !important;
    font-family: ${fonts.sans} !important;
    font-size: 0.75rem !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
    min-width: 120px !important;
    transition: background-color ${durations.fast} ${easings.premium}, color ${durations.fast} ${easings.premium} !important;
  }
  .swal2-confirm:hover {
    background: ${colors.carbon} !important;
    color: ${colors.snow} !important;
  }
  .swal2-deny {
    background: ${colors.carbon} !important;
    border: 1px solid ${colors.granite} !important;
    border-radius: 8px !important;
    color: ${colors.snow} !important;
    padding: 12px 24px !important;
    font-weight: 600 !important;
    font-family: ${fonts.sans} !important;
    font-size: 0.75rem !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
    min-width: 120px !important;
    transition: background-color ${durations.fast} ${easings.premium}, color ${durations.fast} ${easings.premium} !important;
  }
  .swal2-deny:hover {
    background: ${colors.snow} !important;
    color: ${colors.carbon} !important;
  }
  .swal2-cancel {
    background: transparent !important;
    border: 1px solid ${colors.granite} !important;
    border-radius: 8px !important;
    color: ${colors.ash} !important;
    padding: 12px 24px !important;
    font-family: ${fonts.sans} !important;
    font-size: 0.75rem !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
    transition: border-color ${durations.fast} ${easings.premium}, color ${durations.fast} ${easings.premium} !important;
  }
  .swal2-cancel:hover {
    border-color: ${colors.snow} !important;
    color: ${colors.snow} !important;
  }
  .swal2-input, .swal2-textarea {
    background: ${colors.obsidian} !important;
    color: ${colors.snow} !important;
    border: 1px solid ${colors.granite} !important;
    border-radius: 8px !important;
    font-family: ${fonts.sans} !important;
    padding: 12px 14px !important;
    font-size: 0.9rem !important;
  }
  .swal2-input:focus, .swal2-textarea:focus {
    border-color: ${colors.snow} !important;
    box-shadow: 0 0 0 3px rgba(245, 240, 235, 0.1) !important;
    outline: none !important;
  }
  .swal2-validation-message {
    background: ${colors.rust} !important;
    color: ${colors.snow} !important;
    border-radius: 6px !important;
    border: none !important;
    font-family: ${fonts.sans} !important;
    font-size: 0.8rem !important;
    padding: 10px 14px !important;
  }
`;
