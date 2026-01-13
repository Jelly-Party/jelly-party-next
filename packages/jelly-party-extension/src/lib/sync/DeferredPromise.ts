/**
 * DeferredPromise - A promise that can be resolved/rejected from outside
 *
 * Used for coordinating async video operations and preventing event echo loops.
 * When we programmatically play/pause/seek, we need to wait for the video event
 * to fire before continuing, while also preventing that event from being
 * re-broadcast to peers.
 */

import { createLogger } from "jelly-party-lib";

const log = createLogger("DeferredPromise");

export class DeferredPromise<T = void> {
	readonly promise: Promise<T>;
	private _resolve!: (value: T | PromiseLike<T>) => void;
	private _reject!: (reason?: unknown) => void;
	private _resolved = false;
	private _rejected = false;

	constructor() {
		this.promise = new Promise<T>((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});
	}

	resolve(value?: T): void {
		if (this._resolved || this._rejected) {
			log.debug("DeferredPromise already settled, ignoring resolve");
			return;
		}
		this._resolved = true;
		this._resolve(value as T);
	}

	reject(reason?: unknown): void {
		if (this._resolved || this._rejected) {
			log.debug("DeferredPromise already settled, ignoring reject");
			return;
		}
		this._rejected = true;
		this._reject(reason);
	}

	get isSettled(): boolean {
		return this._resolved || this._rejected;
	}

	get isResolved(): boolean {
		return this._resolved;
	}

	get isRejected(): boolean {
		return this._rejected;
	}

	/**
	 * Race the deferred promise against a timeout.
	 * Returns 'timeout' if the timeout wins, otherwise returns the resolved value.
	 */
	static withTimeout<T>(
		deferred: DeferredPromise<T>,
		ms: number,
	): Promise<T | "timeout"> {
		return Promise.race([
			deferred.promise,
			new Promise<"timeout">((resolve) =>
				setTimeout(() => resolve("timeout"), ms),
			),
		]);
	}
}
