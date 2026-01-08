/**
 * Video controller - generic controller that works with any <video> element
 */
import { createLogger } from "jelly-party-lib";
import { partyClient } from "./PartyClient";

const log = createLogger("VideoController");

export interface VideoState {
	paused: boolean;
	currentTime: number;
	duration: number;
}

export class VideoController {
	private video: HTMLVideoElement | null = null;
	private isLocalEvent = false;
	private lastSyncTime = 0;
	private syncThreshold = 0.5; // seconds

	/**
	 * Find and attach to the main video element on the page
	 */
	attach(): boolean {
		// Find the largest video element (usually the main player)
		const videos = Array.from(document.querySelectorAll("video"));
		if (videos.length === 0) {
			log.debug("No video elements found");
			return false;
		}

		// Sort by size, pick largest
		this.video = videos.sort((a, b) => {
			const areaA = a.clientWidth * a.clientHeight;
			const areaB = b.clientWidth * b.clientHeight;
			return areaB - areaA;
		})[0];

		if (!this.video) {
			return false;
		}

		log.info("Attached to video element");
		this.setupEventListeners();
		this.setupRemoteEventListener();
		return true;
	}

	/**
	 * Detach from video element
	 */
	detach(): void {
		if (this.video) {
			this.video.removeEventListener("play", this.handlePlay);
			this.video.removeEventListener("pause", this.handlePause);
			this.video.removeEventListener("seeked", this.handleSeek);
			this.video = null;
		}
	}

	/**
	 * Get current video state
	 */
	getState(): VideoState | null {
		if (!this.video) return null;
		return {
			paused: this.video.paused,
			currentTime: this.video.currentTime,
			duration: this.video.duration,
		};
	}

	/**
	 * Play the video
	 */
	async play(): Promise<void> {
		if (!this.video) return;
		this.isLocalEvent = true;
		try {
			await this.video.play();
		} catch (e) {
			log.error("Failed to play", { error: String(e) });
		}
		this.isLocalEvent = false;
	}

	/**
	 * Pause the video
	 */
	pause(): void {
		if (!this.video) return;
		this.isLocalEvent = true;
		this.video.pause();
		this.isLocalEvent = false;
	}

	/**
	 * Seek to a specific time
	 */
	seek(time: number): void {
		if (!this.video) return;
		this.isLocalEvent = true;
		this.video.currentTime = time;
		this.isLocalEvent = false;
	}

	private setupEventListeners(): void {
		if (!this.video) return;

		this.video.addEventListener("play", this.handlePlay);
		this.video.addEventListener("pause", this.handlePause);
		this.video.addEventListener("seeked", this.handleSeek);
	}

	private handlePlay = (): void => {
		if (this.isLocalEvent) return;
		log.debug("User played video");
		partyClient.sendVideoEvent("play", this.video?.currentTime ?? 0);
	};

	private handlePause = (): void => {
		if (this.isLocalEvent) return;
		log.debug("User paused video");
		partyClient.sendVideoEvent("pause", this.video?.currentTime ?? 0);
	};

	private handleSeek = (): void => {
		if (this.isLocalEvent) return;
		// Debounce seeks
		const now = Date.now();
		if (now - this.lastSyncTime < 500) return;
		this.lastSyncTime = now;

		log.debug("User seeked video");
		partyClient.sendVideoEvent("seek", this.video?.currentTime ?? 0);
	};

	private setupRemoteEventListener(): void {
		window.addEventListener("jellyparty:videoUpdate", ((event: CustomEvent) => {
			const { variant, tick, paused } = event.detail;
			log.debug("Remote video update", { variant, tick, paused });

			if (variant === "seek" && typeof tick === "number") {
				this.seek(tick);
			} else if (variant === "playPause") {
				if (typeof tick === "number") {
					// Check if we need to sync position
					const currentTime = this.video?.currentTime ?? 0;
					if (Math.abs(currentTime - tick) > this.syncThreshold) {
						this.seek(tick);
					}
				}
				if (paused) {
					this.pause();
				} else {
					this.play();
				}
			}
		}) as EventListener);
	}
}

// Singleton instance
export const videoController = new VideoController();
