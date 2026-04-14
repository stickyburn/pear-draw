// Encoded as base64url for URL-safe invite codes.
// No BlindPairing needed - just share the key + encryption key.
import b4a from "b4a";

export function createInvite(boardKey, encryptionKey) {
	const keyBuffer =
		typeof boardKey === "string" ? b4a.from(boardKey, "hex") : boardKey;
	const encBuffer =
		typeof encryptionKey === "string"
			? b4a.from(encryptionKey, "hex")
			: encryptionKey;

	const combined = b4a.concat([keyBuffer, encBuffer]);

	return b4a.toString(combined, "base64url");
}

export function parseInvite(inviteCode) {
	const combined = b4a.from(inviteCode, "base64url");

	if (combined.byteLength !== 64) {
		throw new Error(
			`Invalid invite code: expected 64 bytes, got ${combined.byteLength}`,
		);
	}

	const boardKey = b4a.toString(combined.slice(0, 32), "hex");
	const encryptionKey = b4a.toString(combined.slice(32, 64), "hex");

	return { boardKey, encryptionKey };
}

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

// Alternative to base64url for shorter codes
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
