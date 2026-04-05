import { swal, toast } from "../lib/swal.jsx";
import { colors, modalStyles } from "../styles/common.jsx";

export async function showConnectionModal(onStartHost, onJoinHost) {
	const result = await swal.fire({
		title: `
      <span style="font-size:2.5rem;font-weight:700;background:linear-gradient(135deg,${colors.accentPear},${colors.accentPearLight});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Pear Draw</span>
      <p style="color:${colors.textMuted};font-size:1rem;margin:12px 0 0 0;font-weight:400">P2P canvas collaboration, anywhere.</p>
    `,
		showCloseButton: true,
		showDenyButton: true,
		confirmButtonText: "Host Session",
		denyButtonText: "Join Session",
	});

	if (result.isConfirmed) {
		await showHostModal(onStartHost);
	} else if (result.isDenied) {
		await showJoinModal(onJoinHost);
	}
}

export function FloatingActionButton(props) {
	const handleClick = async () => {
		await showConnectionModal(props.onStartHost, props.onJoinHost);
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			style={{
				position: "fixed",
				bottom: "24px",
				right: "24px",
				width: "56px",
				height: "56px",
				"border-radius": "50%",
				background: colors.buttonPrimary,
				border: `2px solid ${colors.accentPear}`,
				color: colors.bgDarkest,
				"font-size": "28px",
				"font-weight": 600,
				cursor: "pointer",
				"z-index": 100,
				display: "flex",
				"align-items": "center",
				"justify-content": "center",
				"box-shadow": "0 4px 16px rgba(132, 204, 22, 0.3)",
				transition: "transform 0.15s ease, box-shadow 0.15s ease",
			}}
		>
			+
		</button>
	);
}

async function showHostModal(onStartHost) {
	const savedProfile =
		globalThis.localStorage?.getItem("pear-draw-profile") || "";
	const safeSavedProfile = escapeHtml(savedProfile);

	const { value: formValues, isConfirmed } = await swal.fire({
		title: "Host a Session",
		html: `
      <label style="${modalStyles.label}">Profile Name</label>
      <input id="swal-profile" class="swal2-input" style="${modalStyles.input};margin-bottom:16px" value="${safeSavedProfile}" placeholder="peer-name">
    `,
		showCancelButton: true,
		confirmButtonText: "Start Hosting",
		preConfirm: () => {
			const profile = document.getElementById("swal-profile").value.trim();
			if (!profile) {
				swal.showValidationMessage("Profile name required");
				return false;
			}
			return { profile };
		},
	});

	if (isConfirmed && formValues) {
		swal.fire({
			title: "Starting...",
			allowOutsideClick: false,
			didOpen: () => {
				swal.showLoading();
			},
		});
		try {
			const invite = await onStartHost(formValues.profile);
			await swal.close();
			if (invite) {
				const safeInvite = escapeHtml(invite);
				await swal
					.fire({
						title: "Session Created!",
						html: `
            <p style="color:${colors.textSecondary};margin-bottom:12px">Share this invite with others:</p>
            <code style="${modalStyles.code}">${safeInvite}</code>
          `,
						confirmButtonText: "Copy & Close",
					})
					.then((result) => {
						if (result.isConfirmed) {
							navigator.clipboard.writeText(invite);
							toast.fire({ icon: "success", title: "Invite copied!" });
						}
					});
			}
		} catch (err) {
			await swal.close();
			await swal.fire({
				title: "Failed to Start",
				text: err.message || "Could not start session",
				icon: "error",
			});
		}
	}
}

async function showJoinModal(onJoinHost) {
	const savedProfile =
		globalThis.localStorage?.getItem("pear-draw-profile") || "";
	const safeSavedProfile = escapeHtml(savedProfile);

	const { value: formValues, isConfirmed } = await swal.fire({
		title: "Join a Session",
		html: `
      <label style="${modalStyles.label}">Profile Name</label>
      <input id="swal-profile" class="swal2-input" style="${modalStyles.input};margin-bottom:16px" value="${safeSavedProfile}" placeholder="peer-name">
      <label style="${modalStyles.label}">Invite Code</label>
      <textarea id="swal-invite" class="swal2-textarea" style="${modalStyles.textarea}" placeholder="Paste invite code..."></textarea>
    `,
		showCancelButton: true,
		confirmButtonText: "Join Session",
		preConfirm: () => {
			const profile = document.getElementById("swal-profile").value.trim();
			const invite = document.getElementById("swal-invite").value.trim();
			if (!profile) {
				swal.showValidationMessage("Profile name required");
				return false;
			}
			if (!invite) {
				swal.showValidationMessage("Invite code required");
				return false;
			}
			return { profile, invite };
		},
	});

	if (isConfirmed && formValues) {
		swal.fire({
			title: "Connecting...",
			allowOutsideClick: false,
			didOpen: () => {
				swal.showLoading();
			},
		});
		try {
			await onJoinHost(formValues.profile, formValues.invite);
			await swal.close();
			toast.fire({ icon: "success", title: "Connected!" });
		} catch (err) {
			await swal.close();
			await swal.fire({
				title: "Connection Failed",
				text: err.message || "Could not join session",
				icon: "error",
			});
		}
	}
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
