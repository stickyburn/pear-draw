import { Duplex } from "streamx";

/**
 * BridgeTransport wraps window.bridge as a streamx.Duplex stream,
 * providing the transport layer that bare-rpc requires on the renderer side.
 *
 * - _write: forwards binary frames from bare-rpc → window.bridge.writeWorkerIPC()
 * - push:  delivers incoming frames from window.bridge.onWorkerIPC() → bare-rpc
 */
export class BridgeTransport extends Duplex {
	#specifier;
	#bridge;
	#cleanup;

	constructor(specifier, bridge) {
		super();
		this.#specifier = specifier;
		this.#bridge = bridge;

		// Subscribe to incoming data from main process and push to readable side
		this.#cleanup = bridge.onWorkerIPC(specifier, (data) => {
			this.push(new Uint8Array(data));
		});
	}

	_read(cb) {
		// Data arrives via push() from onWorkerIPC callback — nothing to pull
		cb(null);
	}

	_write(data, cb) {
		// Forward outgoing data to main process via bridge
		this.#bridge
			.writeWorkerIPC(this.#specifier, data)
			.then(() => cb(null))
			.catch((err) => cb(err));
	}

	_destroy(cb) {
		if (this.#cleanup) {
			this.#cleanup();
			this.#cleanup = null;
		}
		cb(null);
	}
}