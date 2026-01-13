/**
 * VideoController - Unified video synchronization controller
 *
 * Combines: video detection, playback control, event handling, and drift correction
 * Uses DeferredPromise pattern to prevent event echo loops
 * Uses timeFromEnd for sync position (handles variable video lengths)
 */

import { createLogger } from "jelly-party-lib";
import { DeferredPromise } from "./DeferredPromise";

const log = createLogger("VideoController");

// ============== TYPES ==============

export interface VideoState {
	paused: boolean;
	currentTime: number;
	duration: number;
	timeFromEnd: number;
}

export type VideoEventCallback = (timeFromEnd: number) => void;

// ============== CONFIGURATION ==============

const CONFIG = {
	// Configuration
	POLL_INTERVAL_MS: 1000,
	COMMAND_TIMEOUT_MS: 3000,
	SEEK_THRESHOLD: 0.5, // seconds
	READY_TIMEOUT_MS: 10000, // max wait for video ready
};

// ============== DEEP QUERY SELECTOR ==============

// ============== QUERY SELECTOR ==============

function getVideos(): HTMLVideoElement[] {
	return Array.from(document.querySelectorAll<HTMLVideoElement>("video"));
}

function findLargestVideo(): HTMLVideoElement | null {
	const videos = getVideos();
	log.debug("findLargestVideo", { totalVideos: videos.length });
	if (videos.length === 0) return null;

	const withArea = videos
		.map((v) => ({ video: v, area: v.offsetWidth * v.offsetHeight }))
		.sort((a, b) => b.area - a.area);

	// Prefer visible video, but fall back to any video if no visible ones
	const bestVideo =
		withArea.find(({ area }) => area > 0)?.video ?? withArea[0]?.video ?? null;

	if (bestVideo) {
		log.debug("Video candidate", {
			src: bestVideo.src?.slice(0, 50) || "(blob)",
			width: bestVideo.offsetWidth,
			height: bestVideo.offsetHeight,
			readyState: bestVideo.readyState,
		});
	}

	return bestVideo;
}

// ============== VIDEO CONTROLLER ==============

export class VideoController {
	private video: HTMLVideoElement | null = null;
	private started = false;

	// Detection
	private pollInterval: ReturnType<typeof setInterval> | null = null;
	private observer: MutationObserver | null = null;

	// Echo prevention
	private deferredPlay = new DeferredPromise();
	private deferredPause = new DeferredPromise();
	private deferredSeek = new DeferredPromise();
	private skipNextPlay = false;
	private skipNextPause = false;
	private skipNextSeek = false;

	// Callbacks
	private onLocalPlayCallback: VideoEventCallback | null = null;
	private onLocalPauseCallback: VideoEventCallback | null = null;
	private onLocalSeekCallback: VideoEventCallback | null = null;
	private onVideoChangeCallback:
		| ((video: HTMLVideoElement | null) => void)
		| null = null;

	// Debounce state
	private rafId: number | null = null;

	// Ready state tracking (for waiting until video has duration)
	private readyResolvers: Array<() => void> = [];

	constructor() {
		log.debug("VideoController initialized");
	}

	// ============== LIFECYCLE ==============

	start(): void {
		if (this.started) return;
		this.started = true;
		log.info("Starting VideoController");

		this.detectVideo();
		this.pollInterval = setInterval(() => {
			if (!this.isVideoValid()) this.detectVideo();
		}, CONFIG.POLL_INTERVAL_MS);

		this.setupMutationObserver();
	}

	stop(): void {
		if (!this.started) return;
		this.started = false;
		log.info("Stopping VideoController");

		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
		this.detach();
	}

	// ============== CALLBACKS ==============

	onLocalPlay(cb: VideoEventCallback): void {
		this.onLocalPlayCallback = cb;
	}

	onLocalPause(cb: VideoEventCallback): void {
		this.onLocalPauseCallback = cb;
	}

	onLocalSeek(cb: VideoEventCallback): void {
		this.onLocalSeekCallback = cb;
	}

	onVideoChange(cb: (video: HTMLVideoElement | null) => void): void {
		this.onVideoChangeCallback = cb;
	}

	// ============== STATE ==============

	getState(): VideoState | null {
		if (!this.video) return null;
		const duration = this.video.duration || 0;
		return {
			paused: this.video.paused,
			currentTime: this.video.currentTime,
			duration,
			timeFromEnd: duration - this.video.currentTime,
		};
	}

	hasVideo(): boolean {
		return this.video !== null;
	}

	getVideo(): HTMLVideoElement | null {
		return this.video;
	}

	/**
	 * Wait for video to be ready (has duration).
	 * Returns true if ready, false if timed out or no video.
	 */
	private waitForReady(): Promise<boolean> {
		// Already ready?
		if (this.video?.duration) {
			return Promise.resolve(true);
		}

		// No video element at all?
		if (!this.video) {
			log.warn("waitForReady: no video element");
			return Promise.resolve(false);
		}

		log.debug("Waiting for video to be ready");

		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				// Remove from resolvers on timeout
				const idx = this.readyResolvers.indexOf(resolver);
				if (idx >= 0) this.readyResolvers.splice(idx, 1);
				log.warn("waitForReady: timed out");
				resolve(false);
			}, CONFIG.READY_TIMEOUT_MS);

			const resolver = () => {
				clearTimeout(timeout);
				resolve(true);
			};

			this.readyResolvers.push(resolver);
		});
	}

	// ============== REMOTE COMMANDS ==============

	async play(timeFromEnd: number): Promise<boolean> {
		if (!this.video) {
			log.warn("Cannot play: no video");
			return false;
		}

		log.debug("Remote play", { timeFromEnd });

		// Seek first
		await this.seek(timeFromEnd);

		if (!this.video.paused) return true;

		this.deferredPlay = new DeferredPromise();
		this.skipNextPlay = true;

		try {
			await this.video.play();
		} catch (e) {
			log.error("Failed to play", { error: String(e) });
			this.skipNextPlay = false;
			return false;
		}

		await DeferredPromise.withTimeout(
			this.deferredPlay,
			CONFIG.COMMAND_TIMEOUT_MS,
		);
		return true;
	}

	async pause(timeFromEnd: number): Promise<boolean> {
		if (!this.video) {
			log.warn("Cannot pause: no video");
			return false;
		}

		log.debug("Remote pause", { timeFromEnd });

		this.deferredPause = new DeferredPromise();
		this.skipNextPause = true;

		// Seek first if needed
		await this.seek(timeFromEnd);

		try {
			this.video.pause();
		} catch (e) {
			log.error("Failed to pause", { error: String(e) });
			this.skipNextPause = false;
			return false;
		}

		await DeferredPromise.withTimeout(
			this.deferredPause,
			CONFIG.COMMAND_TIMEOUT_MS,
		);
		return true;
	}

	async seek(timeFromEnd: number): Promise<boolean> {
		// Wait for video to be ready if it isn't yet
		if (!this.video?.duration) {
			const ready = await this.waitForReady();
			if (!ready || !this.video?.duration) {
				log.warn("Cannot seek: video not ready after wait");
				return false;
			}
		}

		const targetTime = this.video.duration - timeFromEnd;
		const currentTimeFromEnd = this.video.duration - this.video.currentTime;
		const delta = Math.abs(timeFromEnd - currentTimeFromEnd);

		if (delta < CONFIG.SEEK_THRESHOLD) {
			log.debug("Skipping seek, delta too small", { delta });
			return true;
		}

		log.debug("Remote seek", { timeFromEnd, delta });

		const wasPlaying = !this.video.paused;

		// Pause first for reliable seeking
		if (wasPlaying) {
			this.deferredPause = new DeferredPromise();
			this.skipNextPause = true;
			this.video.pause();
			await DeferredPromise.withTimeout(
				this.deferredPause,
				CONFIG.COMMAND_TIMEOUT_MS,
			);
		}

		this.deferredSeek = new DeferredPromise();
		this.skipNextSeek = true;
		this.video.currentTime = targetTime;

		await DeferredPromise.withTimeout(
			this.deferredSeek,
			CONFIG.COMMAND_TIMEOUT_MS,
		);

		// Resume if was playing
		if (wasPlaying && this.video.paused) {
			this.deferredPlay = new DeferredPromise();
			this.skipNextPlay = true;
			try {
				await this.video.play();
			} catch (e) {
				log.error("Failed to resume after seek", { error: String(e) });
			}
			await DeferredPromise.withTimeout(
				this.deferredPlay,
				CONFIG.COMMAND_TIMEOUT_MS,
			);
		}
	}

	// ============== DETECTION ==============

	private detectVideo(): void {
		const newVideo = findLargestVideo();
		if (newVideo === this.video) return;

		this.detach();
		this.video = newVideo;

		if (this.video) {
			this.attach();
			log.info("Video detected", {
				src: this.video.src?.slice(0, 50) || "(blob)",
				duration: this.video.duration,
			});
		}

		this.onVideoChangeCallback?.(this.video);
	}

	private attach(): void {
		if (!this.video) return;

		// If video isn't ready, wait for loadedmetadata
		if (this.video.readyState < 1) {
			log.debug("Video not ready, waiting for loadedmetadata", {
				readyState: this.video.readyState,
			});
			const video = this.video;
			const onMeta = () => {
				log.info("Video metadata loaded", {
					duration: video.duration,
					width: video.videoWidth,
					height: video.videoHeight,
				});
				video.removeEventListener("loadedmetadata", onMeta);

				// Resolve any pending waitForReady promises
				if (video.duration) {
					for (const resolver of this.readyResolvers) {
						resolver();
					}
					this.readyResolvers = [];
				}
			};
			this.video.addEventListener("loadedmetadata", onMeta);
		} else if (this.video.duration) {
			// Video already has metadata, resolve any pending waiters
			for (const resolver of this.readyResolvers) {
				resolver();
			}
			this.readyResolvers = [];
		}

		this.video.addEventListener("play", this.handlePlay);
		this.video.addEventListener("pause", this.handlePause);
		this.video.addEventListener("seeked", this.handleSeek);
		this.video.addEventListener("emptied", this.handleEmptied);
	}

	private detach(): void {
		if (!this.video) return;
		this.video.removeEventListener("play", this.handlePlay);
		this.video.removeEventListener("pause", this.handlePause);
		this.video.removeEventListener("seeked", this.handleSeek);
		this.video.removeEventListener("emptied", this.handleEmptied);
		this.video = null;
	}

	private isVideoValid(): boolean {
		return (
			this.video?.isConnected &&
			(this.video.offsetWidth > 0 || this.video.offsetHeight > 0)
		);
	}

	private setupMutationObserver(): void {
		this.observer = new MutationObserver((mutations) => {
			let shouldDetect = false;
			for (const m of mutations) {
				for (const node of m.addedNodes) {
					if (
						node instanceof HTMLVideoElement ||
						(node instanceof HTMLElement && node.querySelector("video"))
					) {
						shouldDetect = true;
						break;
					}
				}
				if (shouldDetect) break;

				if (m.removedNodes) {
					for (const node of m.removedNodes) {
						if (node === this.video) {
							shouldDetect = true;
							break;
						}
					}
				}
				if (shouldDetect) break;
			}

			if (shouldDetect) {
				this.debounceDetectVideo();
			}
		});
		this.observer.observe(document.body, { childList: true, subtree: true });
	}

	private handleEmptied = (): void => {
		log.debug("Video emptied, re-detecting");
		this.debounceDetectVideo();
	};

	private debounceDetectVideo(): void {
		if (this.rafId) return;
		this.rafId = requestAnimationFrame(() => {
			this.detectVideo();
			this.rafId = null;
		});
	}

	// ============== EVENT HANDLERS ==============

	private handlePlay = (): void => {
		const timeFromEnd = this.getTimeFromEnd();
		log.debug("Play event", { timeFromEnd, skip: this.skipNextPlay });

		if (this.skipNextPlay) {
			this.skipNextPlay = false;
			this.deferredPlay.resolve();
			return;
		}

		if (timeFromEnd !== null) this.onLocalPlayCallback?.(timeFromEnd);
	};

	private handlePause = (): void => {
		const timeFromEnd = this.getTimeFromEnd();
		log.debug("Pause event", { timeFromEnd, skip: this.skipNextPause });

		if (this.skipNextPause) {
			this.skipNextPause = false;
			this.deferredPause.resolve();
			return;
		}

		if (timeFromEnd !== null) this.onLocalPauseCallback?.(timeFromEnd);
	};

	private handleSeek = (): void => {
		const timeFromEnd = this.getTimeFromEnd();
		log.debug("Seek event", { timeFromEnd, skip: this.skipNextSeek });

		if (this.skipNextSeek) {
			this.skipNextSeek = false;
			this.deferredSeek.resolve();
			return;
		}

		if (timeFromEnd !== null) this.onLocalSeekCallback?.(timeFromEnd);
	};

	private getTimeFromEnd(): number | null {
		if (!this.video?.duration) return null;
		return this.video.duration - this.video.currentTime;
	}
}

// Singleton
export const videoController = new VideoController();
