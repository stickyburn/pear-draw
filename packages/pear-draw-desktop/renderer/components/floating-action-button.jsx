import { swal, toast } from "../lib/swal.jsx";
import { colors, fonts, easings, durations, modalStyles } from "../styles/common.jsx";

export async function showConnectionModal(onStartHost, onJoinHost, onDismiss) {
	const titleHtml = `<div style="animation:fade-scale-in ${durations.dramatic} ${easings.premium} both">
	<div style="font-family:${fonts.display};font-size:3.6rem;font-weight:400;color:${colors.snow};letter-spacing:-0.03em;line-height:1;margin-bottom:8px;">Pear Draw</div>
	<div style="font-family:${fonts.sans};font-size:1rem;color:${colors.slate};letter-spacing:0.02em;font-weight:400;">Collaborative drawing, anywhere.</div>
</div>`;

	const confirmBtn = `<span style="display:flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>Start Session</span>`;

	const denyBtn = `<span style="display:flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>Join Session</span>`;

	const result = await swal.fire({
		title: titleHtml,
		showCloseButton: true,
		showDenyButton: true,
		confirmButtonText: confirmBtn,
		denyButtonText: denyBtn,
		customClass: {
			popup: 'nordic-modal',
			title: 'nordic-title',
			confirmButton: 'nordic-btn-primary',
			denyButton: 'nordic-btn-secondary',
			closeButton: 'nordic-close',
		},
		buttonsStyling: false,
	});

	if (result.isConfirmed) {
		await showHostModal(onStartHost);
	} else if (result.isDenied) {
		await showJoinModal(onJoinHost);
	} else {
		// Modal dismissed without connecting - ensure clean disconnect
		if (onDismiss) await onDismiss();
	}
}

export function FloatingActionButton(props) {
	return (
		<button
			type="button"
			onClick={async () => {
				await showConnectionModal(props.onStartHost, props.onJoinHost, props.onDismiss);
			}}
			style={{
				position: "fixed",
				bottom: "28px",
				right: "28px",
				width: "56px",
				height: "56px",
				"border-radius": "50%",
				background: `linear-gradient(135deg, ${colors.snow} 0%, ${colors.frost} 100%)`,
				border: `1px solid rgba(245, 240, 235, 0.3)`,
				color: colors.carbon,
				"font-size": "1.75rem",
				"font-weight": 300,
				"line-height": "1",
				"font-family": fonts.display,
				cursor: "pointer",
				"z-index": 100,
				display: "flex",
				"align-items": "center",
				"justify-content": "center",
				transition: `all ${durations.normal} ${easings.premium}`,
				animation: `blur-in-subtle ${durations.slow} ${easings.premium} both`,
				"animation-delay": "400ms",
				boxShadow: `0 4px 20px rgba(245, 240, 235, 0.15), 0 0 0 1px rgba(245, 240, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)`,
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = colors.carbon;
				e.currentTarget.style.color = colors.snow;
				e.currentTarget.style.transform = "scale(1.08)";
				e.currentTarget.style.boxShadow = `0 8px 30px rgba(245, 240, 235, 0.25), 0 0 0 1px rgba(245, 240, 235, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)`;
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = `linear-gradient(135deg, ${colors.snow} 0%, ${colors.frost} 100%)`;
				e.currentTarget.style.color = colors.carbon;
				e.currentTarget.style.transform = "scale(1)";
				e.currentTarget.style.boxShadow = `0 4px 20px rgba(245, 240, 235, 0.15), 0 0 0 1px rgba(245, 240, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)`;
			}}
			aria-label="Connect"
		>
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style={{ transition: `transform ${durations.fast} ${easings.premium}` }}>
				<path d="M5 12h14M12 5v14" />
			</svg>
		</button>
	);
}

async function showHostModal(onStartHost) {
	const savedProfile = globalThis.localStorage?.getItem("pear-draw-profile") || "";
	const safeSavedProfile = escapeHtml(savedProfile);

	const hostHtml = `<div style="text-align:left;margin-bottom:24px;">
	<label style="${modalStyles.label};margin-bottom:10px;display:block;">Profile Name</label>
	<input id="swal-profile" class="swal2-input" style="${modalStyles.input}" value="${safeSavedProfile}" placeholder="Enter your name">
</div>`;

	const { value: formValues, isConfirmed } = await swal.fire({
		title: `<div style="font-family:${fonts.display};font-size:1.8rem;color:${colors.snow};letter-spacing:-0.01em;">Start a Session</div>`,
		html: hostHtml,
		showCancelButton: true,
		confirmButtonText: "Start Hosting",
		cancelButtonText: "Cancel",
		customClass: {
			popup: 'nordic-modal',
			confirmButton: 'nordic-btn-primary',
			cancelButton: 'nordic-btn-tertiary',
		},
		buttonsStyling: false,
		preConfirm: () => {
			const profile = document.getElementById("swal-profile").value.trim();
			if (!profile) {
				swal.showValidationMessage("Please enter your profile name");
				return false;
			}
			return { profile };
		},
	});

	if (isConfirmed && formValues) {
		const loadingHtml = `<div style="width:160px;height:2px;background:${colors.granite};margin:20px auto 0;border-radius:1px;overflow:hidden;"><div style="height:100%;background:linear-gradient(90deg, ${colors.snow}, ${colors.ash});animation:loading-bar 1.2s ${easings.premium} forwards;"></div></div>`;
		
		swal.fire({
			title: `<div style="font-family:${fonts.display};font-size:1.4rem;color:${colors.snow};margin-bottom:8px;">Starting session...</div>`,
			html: loadingHtml,
			allowOutsideClick: false,
			showConfirmButton: false,
		});
		
		try {
			const invite = await onStartHost(formValues.profile);
			await swal.close();
			
			if (invite) {
				const safeInvite = escapeHtml(invite);
				const inviteHtml = `<div style="text-align:left;">
	<p style="color:${colors.ash};margin:0 0 16px 0;font-size:0.9rem;line-height:1.5;">Share this invite code with others to let them join your session.</p>
	<div style="background:${colors.obsidian};border:1px solid ${colors.granite};border-radius:8px;padding:16px;position:relative;">
		<code style="display:block;word-break:break-all;font-size:0.8rem;font-family:${fonts.mono};color:${colors.snow};line-height:1.6;padding-right:32px;">${safeInvite}</code>
		<svg style="position:absolute;top:12px;right:12px;opacity:0.4;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${colors.slate}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
	</div>
</div>`;
				const copyBtn = `<span style="display:flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy & Start</span>`;
				
				await swal.fire({
					title: `<div style="font-family:${fonts.display};font-size:1.6rem;color:${colors.snow};margin-bottom:4px;">Session Ready</div>`,
					html: inviteHtml,
					confirmButtonText: copyBtn,
					customClass: {
						popup: 'nordic-modal-wide',
						confirmButton: 'nordic-btn-primary',
					},
					buttonsStyling: false,
				}).then((result) => {
					if (result.isConfirmed) {
						navigator.clipboard.writeText(invite);
						toast.fire({
							icon: "success",
							title: "Invite copied to clipboard",
							customClass: { popup: 'nordic-toast' },
						});
					}
				});
			}
		} catch (err) {
			await swal.close();
			await swal.fire({
				title: `<div style="font-family:${fonts.display};color:${colors.snow};">Failed to Start</div>`,
				text: err.message || "Could not start session",
				icon: "error",
				customClass: { popup: 'nordic-modal' },
			});
		}
	}
}

async function showJoinModal(onJoinHost) {
	const savedProfile = globalThis.localStorage?.getItem("pear-draw-profile") || "";
	const safeSavedProfile = escapeHtml(savedProfile);

	const joinHtml = `<div style="text-align:left;">
	<div style="margin-bottom:20px;">
		<label style="${modalStyles.label};margin-bottom:10px;display:block;">Profile Name</label>
		<input id="swal-profile" class="swal2-input" style="${modalStyles.input}" value="${safeSavedProfile}" placeholder="Enter your name">
	</div>
	<div>
		<label style="${modalStyles.label};margin-bottom:10px;display:block;">Invite Code</label>
		<textarea id="swal-invite" class="swal2-textarea" style="${modalStyles.textarea};min-height:80px;" placeholder="Paste the invite code here..."></textarea>
	</div>
</div>`;

	const { value: formValues, isConfirmed } = await swal.fire({
		title: `<div style="font-family:${fonts.display};font-size:1.8rem;color:${colors.snow};letter-spacing:-0.01em;">Join a Session</div>`,
		html: joinHtml,
		showCancelButton: true,
		confirmButtonText: "Join Session",
		cancelButtonText: "Cancel",
		customClass: {
			popup: 'nordic-modal',
			confirmButton: 'nordic-btn-primary',
			cancelButton: 'nordic-btn-tertiary',
		},
		buttonsStyling: false,
		preConfirm: () => {
			const profile = document.getElementById("swal-profile").value.trim();
			const invite = document.getElementById("swal-invite").value.trim();
			if (!profile) {
				swal.showValidationMessage("Please enter your profile name");
				return false;
			}
			if (!invite) {
				swal.showValidationMessage("Please paste the invite code");
				return false;
			}
			return { profile, invite };
		},
	});

	if (isConfirmed && formValues) {
		const loadingHtml = `<div style="width:160px;height:2px;background:${colors.granite};margin:20px auto 0;border-radius:1px;overflow:hidden;"><div style="height:100%;background:linear-gradient(90deg, ${colors.snow}, ${colors.ash});animation:loading-bar 1.2s ${easings.premium} forwards;"></div></div>`;
		
		swal.fire({
			title: `<div style="font-family:${fonts.display};font-size:1.4rem;color:${colors.snow};margin-bottom:8px;">Connecting...</div>`,
			html: loadingHtml,
			allowOutsideClick: false,
			showConfirmButton: false,
		});
		
		try {
			await onJoinHost(formValues.profile, formValues.invite);
			await swal.close();
			toast.fire({
				icon: "success",
				title: "Connected successfully",
				customClass: { popup: 'nordic-toast' },
			});
		} catch (err) {
			await swal.close();
			await swal.fire({
				title: `<div style="font-family:${fonts.display};color:${colors.snow};">Connection Failed</div>`,
				html: `<div style="color:${colors.ash};margin-top:8px;">${err.message || "Could not join session. Please check the invite code and try again."}</div>`,
				icon: "error",
				customClass: { popup: 'nordic-modal' },
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
