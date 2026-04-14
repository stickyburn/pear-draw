// Encoded as base64url for URL-safe invite codes.
// No BlindPairing needed - just share the key + encryption key.
import b4a from "b4a";

/**
 * @param {string|Buffer} boardKey - The autobase key (32 bytes, hex string or buffer)
 * @param {string|Buffer} encryptionKey - The encryption key (32 bytes, hex string or buffer)
 * @returns {string} - URL-safe invite code
 */
export function createInvite(boardKey, encryptionKey) {
	const keyBuffer =
		typeof boardKey === "string" ? b4a.from(boardKey, "hex") : boardKey;
	const encBuffer =
		typeof encryptionKey === "string"
			? b4a.from(encryptionKey, "hex")
			: encryptionKey;

	const combined = b4a.concat([keyBuffer, encBuffer]);

	// URL-safe, no padding
	return b4a.toString(combined, "base64url");
}

/**
 * @param {string} inviteCode - The invite code (base64url encoded)
 * @returns {Object} - { boardKey: string (hex), encryptionKey: string (hex) }
 */
export function parseInvite(inviteCode) {
	const combined = b4a.from(inviteCode, "base64url");

	// Validate length (64 bytes = 32 + 32)
	if (combined.byteLength !== 64) {
		throw new Error(
			`Invalid invite code: expected 64 bytes, got ${combined.byteLength}`,
		);
	}

	const boardKey = b4a.toString(combined.slice(0, 32), "hex");
	const encryptionKey = b4a.toString(combined.slice(32, 64), "hex");

	return { boardKey, encryptionKey };
}

/**
 * @param {string} inviteCode - The invite code to validate
 * @returns {boolean} - Whether the code is valid
 */
export function isValidInvite(inviteCode) {
	if (typeof inviteCode !== "string" || inviteCode.length === 0) {
		return false;
	}

	try {
		const combined = b4a.from(inviteCode, "base64url");
		return combined.byteLength === 64;
	} catch {
		return false;
	}
}

/**
 * Alternative to base64url for shorter codes
 * @param {string|Buffer} boardKey - The autobase key
 * @param {string|Buffer} encryptionKey - The encryption key
 * @returns {string} - z32 encoded invite code
 */
export function createInviteZ32(boardKey, encryptionKey) {
	const keyBuffer =
		typeof boardKey === "string" ? b4a.from(boardKey, "hex") : boardKey;
	const encBuffer =
		typeof encryptionKey === "string"
			? b4a.from(encryptionKey, "hex")
			: encryptionKey;

	const combined = b4a.concat([keyBuffer, encBuffer]);
	return b4a.toString(combined, "z32");
}

/**
 * @param {string} inviteCode - The z32 encoded invite code
 * @returns {Object} - { boardKey: string (hex), encryptionKey: string (hex) }
 */
export function parseInviteZ32(inviteCode) {
	const combined = b4a.from(inviteCode, "z32");

	if (combined.byteLength !== 64) {
		throw new Error(
			`Invalid invite code: expected 64 bytes, got ${combined.byteLength}`,
		);
	}

	const boardKey = b4a.toString(combined.slice(0, 32), "hex");
	const encryptionKey = b4a.toString(combined.slice(32, 64), "hex");

	return { boardKey, encryptionKey };
}
