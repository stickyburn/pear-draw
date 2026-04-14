import { Duplex } from "streamx";

/**
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

		this.#cleanup = bridge.onWorkerIPC(specifier, (data) => {
			this.push(new Uint8Array(data));
		});
	}

	_read(cb) {
		cb(null);
	}

	_write(data, cb) {
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
