/**
 * SyncBadge - Visual indicator showing which video is being synced
 *
 * A small badge overlay on the video element to indicate it's being
 * synchronized with the party. Can be toggled via extension options.
 */

import { createLogger } from "jelly-party-lib";

const log = createLogger("SyncBadge");

// Badge styles
const BADGE_STYLES = `
.jelly-party-sync-badge {
	position: absolute;
	top: 10px;
	left: 10px;
	background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
	color: white;
	padding: 4px 10px;
	border-radius: 12px;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	font-size: 12px;
	font-weight: 600;
	display: flex;
	align-items: center;
	gap: 4px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	z-index: 9999;
	pointer-events: none;
	opacity: 0.9;
	transition: opacity 0.3s ease;
}

.jelly-party-sync-badge:hover {
	opacity: 1;
}

.jelly-party-sync-badge-emoji {
	font-size: 14px;
}
`;

export class SyncBadge {
	private badge: HTMLDivElement | null = null;
	private styleElement: HTMLStyleElement | null = null;
	private video: HTMLVideoElement | null = null;
	private enabled = false;

	constructor() {
		log.debug("SyncBadge initialized");
	}

	/**
	 * Enable the sync badge
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		if (enabled && this.video) {
			this.show(this.video);
		} else {
			this.hide();
		}
	}

	/**
	 * Show badge on a video element
	 */
	show(video: HTMLVideoElement): void {
		this.video = video;

		if (!this.enabled) {
			log.debug("Badge disabled, not showing");
			return;
		}

		// Already attached to this video
		if (this.badge && this.badge.parentElement === video.parentElement) {
			return;
		}

		this.hide();
		this.injectStyles();

		// Create badge
		this.badge = document.createElement("div");
		this.badge.className = "jelly-party-sync-badge";
		this.badge.innerHTML = `
			<span class="jelly-party-sync-badge-emoji">🎉</span>
			<span>Synced</span>
		`;

		// Position relative to video
		const videoParent = video.parentElement;
		if (videoParent) {
			// Ensure parent has relative positioning
			const parentStyle = getComputedStyle(videoParent);
			if (parentStyle.position === "static") {
				(videoParent as HTMLElement).style.position = "relative";
			}
			videoParent.appendChild(this.badge);
			log.info("Sync badge shown");
		} else {
			log.warn("Cannot show badge: video has no parent");
		}
	}

	/**
	 * Hide the badge
	 */
	hide(): void {
		if (this.badge) {
			this.badge.remove();
			this.badge = null;
			log.debug("Sync badge hidden");
		}
	}

	/**
	 * Clean up all resources
	 */
	destroy(): void {
		this.hide();
		if (this.styleElement) {
			this.styleElement.remove();
			this.styleElement = null;
		}
		this.video = null;
	}

	private injectStyles(): void {
		// Only inject once
		if (this.styleElement) return;
		if (document.getElementById("jelly-party-sync-badge-styles")) return;

		this.styleElement = document.createElement("style");
		this.styleElement.id = "jelly-party-sync-badge-styles";
		this.styleElement.textContent = BADGE_STYLES;
		document.head.appendChild(this.styleElement);
	}
}

// Singleton instance
export const syncBadge = new SyncBadge();
