import { swal } from "./swal.jsx";

/**
 * Modal Flow — Reusable pattern for SweetAlert2 sequences:
 *   1. Show input/choice modal
 *   2. If confirmed → show loading spinner
 *   3. Await async action
 *   4. Show success or error result
 *
 * @param {object} opts
 * @param {object} opts.inputConfig  - swal.fire() config for the input modal
 * @param {Function} opts.action      - async function receiving the input result
 * @param {object}   opts.loadingConfig - swal.fire() config for the loading state (optional)
 * @param {Function} opts.onSuccess   - async function receiving the action result (optional)
 * @param {Function} opts.onError     - async function receiving the error (optional, defaults to error swal)
 * @returns {Promise<any>} The result of the action, or null if cancelled
 */
export async function modalFlow({
	inputConfig,
	action,
	loadingConfig,
	onSuccess,
	onError,
}) {
	const result = await swal.fire(inputConfig);

	if (!result.isConfirmed) return null;

	// Show loading
	if (loadingConfig) {
		swal.fire(loadingConfig);
	}

	try {
		const actionResult = await action(result.value || result);

		// Close loading
		await swal.close();

		if (onSuccess) {
			await onSuccess(actionResult);
		}

		return actionResult;
	} catch (err) {
		// Close loading
		await swal.close();

		if (onError) {
			await onError(err);
		} else {
			await swal.fire({
				title: "Error",
				text: err.message || "Something went wrong",
				icon: "error",
				customClass: { popup: "studio-modal" },
			});
		}

		throw err;
	}
}

/**
 * Create a loading indicator HTML string using Studio theme.
 */
export function loadingHtml(message = "Processing...", studio) {
	return `
    <div style="padding: 24px 0;">
      <p style="font-family: Inter; font-size: 14px; color: ${studio.text.primary}; margin-bottom: 16px;">${message}</p>
      <div style="width: 100%; height: 2px; background: ${studio.border}; border-radius: 1px; overflow: hidden;">
        <div style="width: 100%; height: 100%; background: ${studio.neon.violet}; animation: studio-shimmer 1s linear infinite; background-size: 200% 100%;"></div>
      </div>
    </div>
  `;
}
