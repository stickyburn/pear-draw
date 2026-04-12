import { createSignal } from "solid-js";
import { swal, toast } from "../lib/swal.jsx";
import { studio, modalStyles, durations, easings } from "../styles/index.jsx";
import { escapeHtml } from "../lib/escape-html.mjs";
import { modalFlow, loadingHtml } from "../lib/modal-flow.jsx";

// ═════════════════════════════════════════════════════════════════
// Studio Modal Layout Templates
// ═════════════════════════════════════════════════════════════════

const ModalHeader = (title, subtitle) => `
  <div class="studio-modal-header">
    <h1 class="studio-modal-title">${title}</h1>
    ${subtitle ? `<p class="studio-modal-subtitle">${subtitle}</p>` : ""}
  </div>
`;

// ═════════════════════════════════════════════════════════════════
// Studio Connection Experience
// ═════════════════════════════════════════════════════════════════

export async function showStudioConnectionModal(
	onStartHost,
	onJoinHost,
	onDismiss,
) {
	const html = `
    <div style="animation: studio-fade-in 0.4s ease both;">
      ${ModalHeader("Pear Draw", "Real-time p2p collaboration for creative teams. Secure, serverless drawing with no accounts required.")}
      
      <div style="display: flex; gap: 8px; margin-top: 24px;">
        <div class="studio-tag">E2E ENCRYPTED</div>
        <div class="studio-tag">P2P NETWORK</div>
      </div>
    </div>
  `;

	const result = await swal.fire({
		html: html,
		showCloseButton: true,
		showDenyButton: true,
		confirmButtonText: "Start Session",
		denyButtonText: "Join Session",
		customClass: {
			popup: "studio-modal",
			confirmButton: "studio-btn-primary",
			denyButton: "studio-btn-secondary",
			closeButton: "swal2-close",
		},
		buttonsStyling: false,
		allowOutsideClick: false,
	});

	if (result.isConfirmed) await showStudioHostModal(onStartHost);
	else if (result.isDenied) await showStudioJoinModal(onJoinHost);
	else if (onDismiss) await onDismiss();
}

async function showStudioHostModal(onStartHost) {
	const savedProfile =
		globalThis.localStorage?.getItem("pear-draw-profile") || "";

	await modalFlow({
		inputConfig: {
			html: `
        <div style="animation: studio-fade-in 0.3s ease both;">
          ${ModalHeader("Start Session", "Choose a display name to begin your creative session.")}
          <div class="studio-modal-content">
            <label style="${modalStyles.label}">Display Name</label>
            <input id="swal-profile" class="swal2-input" value="${escapeHtml(savedProfile)}" placeholder="e.g. Satoshi" autocomplete="off">
          </div>
        </div>
      `,
			showCancelButton: true,
			confirmButtonText: "Create",
			cancelButtonText: "Back",
			customClass: {
				popup: "studio-modal",
				confirmButton: "studio-btn-primary",
				cancelButton: "studio-btn-secondary",
			},
			buttonsStyling: false,
			preConfirm: () => {
				const profile = document.getElementById("swal-profile").value.trim();
				if (!profile) {
					swal.showValidationMessage("Please enter your name");
					return false;
				}
				return { profile };
			},
		},
		action: async (formValues) => {
			if (!formValues?.profile) return null;
			return onStartHost(formValues.profile);
		},
		loadingConfig: {
			html: loadingHtml("Initializing P2P...", studio),
			showConfirmButton: false,
			allowOutsideClick: false,
			customClass: { popup: "studio-modal" },
		},
		onSuccess: async (invite) => {
			if (!invite) return;
			await swal.fire({
				html: `
          <div style="animation: studio-fade-in 0.3s ease both;">
            ${ModalHeader("Session Ready", "Share this code with your team to invite them to the canvas.")}
            <div class="studio-modal-content">
              <label style="${modalStyles.label}">Invite Code</label>
              <div class="studio-code-block">${escapeHtml(invite)}</div>
            </div>
          </div>
        `,
				confirmButtonText: "Open Canvas",
				customClass: {
					popup: "studio-modal",
					confirmButton: "studio-btn-primary",
				},
				buttonsStyling: false,
			});
		},
	});
}

async function showStudioJoinModal(onJoinHost) {
	const savedProfile =
		globalThis.localStorage?.getItem("pear-draw-profile") || "";

	await modalFlow({
		inputConfig: {
			html: `
        <div style="animation: studio-fade-in 0.3s ease both;">
          ${ModalHeader("Join Session", "Enter your name and the invite code provided by the host.")}
          <div class="studio-modal-content">
            <div style="margin-bottom: 16px;">
              <label style="${modalStyles.label}">Display Name</label>
              <input id="swal-profile" class="swal2-input" value="${escapeHtml(savedProfile)}" placeholder="e.g. Satoshi" autocomplete="off">
            </div>
            <div>
              <label style="${modalStyles.label}">Invite Code</label>
              <textarea id="swal-invite" class="swal2-textarea" style="min-height: 80px;" placeholder="Paste code..."></textarea>
            </div>
          </div>
        </div>
      `,
			showCancelButton: true,
			confirmButtonText: "Join",
			cancelButtonText: "Back",
			customClass: {
				popup: "studio-modal",
				confirmButton: "studio-btn-primary",
				cancelButton: "studio-btn-secondary",
			},
			buttonsStyling: false,
			preConfirm: () => {
				const profile = document.getElementById("swal-profile").value.trim();
				const invite = document.getElementById("swal-invite").value.trim();
				if (!profile || !invite) {
					swal.showValidationMessage("Missing information");
					return false;
				}
				return { profile, invite };
			},
		},
		action: async (formValues) => {
			if (!formValues?.profile) return null;
			await onJoinHost(formValues.profile, formValues.invite);
		},
		onSuccess: async () => {
			toast.fire({ icon: "success", title: "Connected" });
		},
	});
}

export function StudioFab(props) {
	const [isHovered, setIsHovered] = createSignal(false);
	const [isPressed, setIsPressed] = createSignal(false);

	return (
		<button
			onClick={() =>
				showStudioConnectionModal(
					props.onStartHost,
					props.onJoinHost,
					props.onDismiss,
				)
			}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => {
				setIsHovered(false);
				setIsPressed(false);
			}}
			onMouseDown={() => setIsPressed(true)}
			onMouseUp={() => setIsPressed(false)}
			style={{
				position: "fixed",
				bottom: props.isFocusMode?.() ? "-60px" : "32px",
				right: props.isFocusMode?.() ? "-60px" : "32px",
				width: "60px",
				height: "60px",
				borderRadius: "18px",
				background: isHovered() ? studio.neon.violet : studio.elevated,
				border: `1px solid ${isHovered() ? studio.neon.violet : studio.border}`,
				color: isHovered() ? "white" : studio.text.primary,
				cursor: "pointer",
				zIndex: 100,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				transition: `all ${durations.slow} ${easings.premium}`,
				opacity: props.isFocusMode?.() ? 0 : 1,
				pointerEvents: props.isFocusMode?.() ? "none" : "auto",
				boxShadow: isHovered()
					? `0 12px 32px ${studio.neon.violet}40, 0 0 0 1px ${studio.neon.violet}20`
					: "0 8px 24px rgba(0,0,0,0.5)",
				transform: isPressed()
					? "scale(0.92) translateY(0)"
					: isHovered()
						? "scale(1.08) translateY(-4px)"
						: "scale(1) translateY(0)",
			}}
			aria-label="Open connection menu"
		>
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				style={{
					transition: "transform 0.3s ease",
					transform: isHovered() ? "rotate(90deg)" : "rotate(0)",
				}}
			>
				<path d="M12 5v14M5 12h14" />
			</svg>
		</button>
	);
}
