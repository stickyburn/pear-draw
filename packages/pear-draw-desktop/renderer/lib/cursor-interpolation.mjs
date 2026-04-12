/**
 * CursorInterpolator — EMA smoothing + idle detection for live cursors.
 *
 * Receives raw cursor positions from the network (arriving at irregular intervals),
 * applies exponential moving average (EMA) smoothing for buttery movement,
 * tracks idle state, and provides trail data for the comet-tail effect.
 *
 * Architecture:
 * - addPoint(peerId, x, y, profileName, clicking) → enqueues raw position
 * - tick() → called from requestAnimationFrame, computes smoothed positions
 * - getState() → returns all peers with smoothed positions + metadata
 * - removePeer(peerId) → cleanup on disconnect
 * - leavePeer(peerId) → mark as "pointer left canvas"
 */

const EMA_ALPHA = 0.4; // Smoothing factor (0 = max smooth, 1 = no smooth)
const IDLE_TIMEOUT_MS = 5000; // Mark idle after 5s of no movement
const TRAIL_MAX_LENGTH = 3; // Max trail dots per cursor
const TRAIL_LIFETIME_MS = 300; // Trail dot lifetime in ms

export class CursorInterpolator {
	#peers = new Map();
	#animFrameId = null;
	#onUpdate = null;

	constructor(onUpdate) {
		this.#onUpdate = onUpdate;
	}

	start() {
		if (this.#animFrameId) return;
		const loop = () => {
			this.tick();
			this.#animFrameId = requestAnimationFrame(loop);
		};
		this.#animFrameId = requestAnimationFrame(loop);
	}

	stop() {
		if (this.#animFrameId) {
			cancelAnimationFrame(this.#animFrameId);
			this.#animFrameId = null;
		}
	}

	addPoint(peerId, x, y, profileName, clicking = false) {
		let peer = this.#peers.get(peerId);
		const now = performance.now();

		if (!peer) {
			// New peer — initialize with raw position (no smoothing for first point)
			peer = {
				peerId,
				profileName: profileName || peerId,
				rawX: x,
				rawY: y,
				smoothX: x,
				smoothY: y,
				clicking,
				lastUpdateMs: now,
				createdAt: now,
				appearing: true,
				appearStartMs: now,
				trail: [],
				idle: false,
				left: false,
			};
			this.#peers.set(peerId, peer);
		} else {
			// Push current smoothed position into trail before updating
			if (peer.smoothX !== undefined) {
				peer.trail.push({ x: peer.smoothX, y: peer.smoothY, born: now });
				if (peer.trail.length > TRAIL_MAX_LENGTH) {
					peer.trail.shift();
				}
			}

			peer.rawX = x;
			peer.rawY = y;
			if (profileName) peer.profileName = profileName;
			peer.clicking = clicking;
			peer.lastUpdateMs = now;
			peer.idle = false;
			peer.left = false;
		}
	}

	leavePeer(peerId) {
		const peer = this.#peers.get(peerId);
		if (peer) {
			peer.left = true;
			peer.lastUpdateMs = performance.now();
		}
	}

	removePeer(peerId) {
		this.#peers.delete(peerId);
	}

	tick() {
		const now = performance.now();
		let changed = false;

		for (const [peerId, peer] of this.#peers) {
			// EMA smoothing
			peer.smoothX = peer.smoothX + EMA_ALPHA * (peer.rawX - peer.smoothX);
			peer.smoothY = peer.smoothY + EMA_ALPHA * (peer.rawY - peer.smoothY);

			// Idle detection
			const elapsed = now - peer.lastUpdateMs;
			const wasIdle = peer.idle;
			peer.idle = elapsed > IDLE_TIMEOUT_MS;

			// Appear animation: after 300ms, mark as fully appeared
			if (peer.appearing && now - peer.appearStartMs > 300) {
				peer.appearing = false;
			}

			// Trail aging: remove expired trail dots
			peer.trail = peer.trail.filter(
				(dot) => now - dot.born < TRAIL_LIFETIME_MS,
			);

			changed = true;
		}

		if (changed && this.#onUpdate) {
			this.#onUpdate(this.getState());
		}
	}

	getState() {
		const result = [];
		for (const [peerId, peer] of this.#peers) {
			result.push({
				peerId,
				profileName: peer.profileName,
				x: peer.smoothX,
				y: peer.smoothY,
				rawX: peer.rawX,
				rawY: peer.rawY,
				clicking: peer.clicking,
				idle: peer.idle,
				left: peer.left,
				appearing: peer.appearing,
				appearProgress: peer.appearing
					? Math.min(1, (performance.now() - peer.appearStartMs) / 300)
					: 1,
				trail: peer.trail.map((dot) => ({
					x: dot.x,
					y: dot.y,
					age: (performance.now() - dot.born) / TRAIL_LIFETIME_MS,
				})),
			});
		}
		return result;
	}

	destroy() {
		this.stop();
		this.#peers.clear();
		this.#onUpdate = null;
	}
}
