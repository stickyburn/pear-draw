export const colors = {
	bgDarkest: "#020617",
	bgCard: "#111827",
	textPrimary: "#f0fdf4",
	textSecondary: "#86efac",
	textMuted: "#4ade80",
	accentPear: "#84cc16",
	accentPearLight: "#a3e635",
	error: "#ef4444",
	border: "#1e3a2f",
	borderLight: "#365314",
	buttonPrimary: "#84cc16",
	canvasBg: "#020617",
	canvasGrid: "#1a2e1a",
};

export const modalStyles = {
	label: `display:block;text-align:left;margin-bottom:4px;color:${colors.accentPear};font-size:0.85rem`,
	input: `background:${colors.bgCard};color:${colors.textPrimary};border:1px solid ${colors.borderLight};border-radius:8px;padding:10px 12px;width:100%;margin:0`,
	textarea: `background:${colors.bgCard};color:${colors.textPrimary};border:1px solid ${colors.borderLight};border-radius:8px;padding:10px 12px;width:100%;margin:0;min-height:80px;resize:vertical`,
	code: `display:block;background:${colors.bgCard};padding:12px;border-radius:8px;word-break:break-all;font-size:0.85rem;color:${colors.accentPearLight}`,
	dropdown: {
		container: {
			position: "absolute",
			top: "100%",
			right: 0,
			marginTop: "4px",
			background: colors.bgCard,
			border: `1px solid ${colors.border}`,
			borderRadius: "8px",
			overflow: "hidden",
			minWidth: "140px",
		},
		item: {
			width: "100%",
			padding: "10px 12px",
			background: "transparent",
			border: "none",
			color: colors.textPrimary,
			textAlign: "left",
			cursor: "pointer",
			fontSize: "0.85rem",
		},
	},
};

export const strokeColors = [
	"#84cc16", // Pear green
	"#60a5fa", // Blue
	"#f472b6", // Pink
];

export const swal2Overrides = `
  .swal2-popup { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; border: 1px solid ${colors.border} !important; }
  .swal2-title { font-size: auto !important; font-weight: auto !important; margin-bottom: 0 !important; }
  .swal2-actions { gap: 12px !important; margin-top: 24px !important; }
  .swal2-close { font-size: 1.25rem !important; color: ${colors.textMuted} !important; }
  .swal2-close:hover { color: ${colors.textPrimary} !important; }
  .swal2-toast { border: 1px solid ${colors.border} !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; padding: 12px 16px !important; }
  .swal2-confirm { background: ${colors.buttonPrimary} !important; border: 1px solid ${colors.accentPear} !important; border-radius: 8px !important; color: ${colors.bgDarkest} !important; padding: 12px 24px !important; font-weight: 600 !important; min-width: 120px !important; }
  .swal2-deny { background: ${colors.bgCard} !important; border: 1px solid ${colors.borderLight} !important; border-radius: 8px !important; color: ${colors.textPrimary} !important; padding: 12px 24px !important; font-weight: 600 !important; min-width: 120px !important; }
  .swal2-cancel { background: transparent !important; border: 1px solid ${colors.borderLight} !important; border-radius: 8px !important; color: ${colors.textSecondary} !important; padding: 12px 24px !important; }
  .swal2-input, .swal2-textarea { background: ${colors.bgCard} !important; color: ${colors.textPrimary} !important; border: 1px solid ${colors.borderLight} !important; border-radius: 8px !important; }
`;
