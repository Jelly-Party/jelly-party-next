/**
 * Content script entry point - runs on all pages
 * Injects Jelly Party overlay when triggered by extension icon click
 */

import { createLogger } from "jelly-party-lib";
import browser, { type Runtime } from "webextension-polyfill";

const log = createLogger("content");

// State
let isMinimized = true;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;
let selectedVideoSource: Window | null = null;
let selectedVideoInfo: { area: number; url: string } | null = null;

// Initialize on load
initJellyParty();

function initJellyParty() {
	log.info("Initializing Jelly Party content script");

	// Listen for messages from popup/background
	browser.runtime.onMessage.addListener((message: Runtime.MessageSender) => {
		if ((message as { type?: string }).type === "jellyparty:showOverlay") {
			showOverlay();
			return Promise.resolve({ success: true });
		}
		return false;
	});

	// Signal to background that content script is ready
	browser.runtime.sendMessage({ type: "jellyparty:contentReady" }).catch(() => {
		// Ignore errors - background might not be listening yet
	});

	// Check for party ID in URL (for join links) - pass to iframe via hash
	const partyId = new URLSearchParams(window.location.search).get(
		"jellyPartyId",
	);
	if (partyId) {
		log.info("Found party ID in URL, will auto-join", { partyId });
		showOverlay(partyId);
	}

	// Listen for messages from iframe and video agents
	window.addEventListener("message", handleWindowMessage);

	// Mouse tracking for FAB fade (on parent page)
	document.addEventListener("mousemove", handleMouseMove);

	// Ping any existing video agents
	window.frames.length > 0
		? Array.from(window.frames).forEach((frame) =>
				frame.postMessage({ type: "jellyparty:ping" }, "*"),
			)
		: null; // If no frames, we might just be in top frame
	window.postMessage({ type: "jellyparty:ping" }, "*"); // Also ping self/top

	log.info("Jelly Party ready - click extension icon to open");
}

function handleMouseMove() {
	const iframe = document.getElementById("jellyPartyChat") as HTMLIFrameElement;
	if (!iframe || iframe.style.display === "none") return;

	// Only manage fade when minimized (showing FAB)
	if (!isMinimized) return;

	// Show FAB immediately (fast fade-in: 0.3s)
	iframe.style.transition = "opacity 0.3s ease";
	iframe.style.opacity = "1";
	iframe.style.pointerEvents = "auto";

	// Reset fade timer
	if (fadeTimer) clearTimeout(fadeTimer);

	// Start new fade timer (fade out after 1s of no movement)
	fadeTimer = setTimeout(() => {
		if (isMinimized && iframe.style.display !== "none") {
			// Slow fade-out: 1s
			iframe.style.transition = "opacity 1s ease";
			iframe.style.opacity = "0";
			iframe.style.pointerEvents = "none";
		}
	}, 1000);
}

function handleWindowMessage(event: MessageEvent) {
	const iframe = document.getElementById("jellyPartyChat") as HTMLIFrameElement;
	const data = event.data;

	if (!data || typeof data !== "object") return;

	// 1. Handle UI messages from Chat Iframe
	if (iframe && event.source === iframe.contentWindow) {
		switch (data.type) {
			case "jellyparty:minimize":
				isMinimized = true;
				iframe.style.width = "60px";
				iframe.style.height = "60px";
				iframe.style.borderRadius = "50%";
				handleMouseMove();
				break;
			case "jellyparty:maximize":
				isMinimized = false;
				if (fadeTimer) {
					clearTimeout(fadeTimer);
					fadeTimer = null;
				}
				iframe.style.opacity = "1";
				iframe.style.pointerEvents = "auto";
				iframe.style.width = "380px";
				iframe.style.height = "600px";
				iframe.style.maxHeight = "80vh";
				iframe.style.maxWidth = "90vw";
				iframe.style.borderRadius = "16px";
				break;
			case "jellyparty:close":
				iframe.style.display = "none";
				log.debug("Overlay hidden");
				break;
			case "jellyparty:remoteVideoCommand":
				// Forward to selected video agent
				if (selectedVideoSource) {
					// log.debug("Forwarding remote command to video agent", data);
					selectedVideoSource.postMessage(
						{
							type: "jellyparty:executeCommand",
							command: data.command,
							timeFromEnd: data.timeFromEnd,
							timestamp: data.timestamp,
						},
						"*",
					);
				} else {
					log.warn("Cannot forward command: no video source selected");
				}
				break;
		}
		return;
	}

	// 2. Handle messages from Video Agents (in any frame)
	if (data.type === "jellyparty:videoAdvertise") {
		const { width, height } = data;
		const area = (width || 0) * (height || 0);

		// Select if we have no video, or this one is larger/better
		const currentArea = selectedVideoInfo?.area || 0;

		// Simple selection heuristic
		if (!selectedVideoSource || area > currentArea) {
			selectedVideoSource = event.source as Window;
			selectedVideoInfo = { area, url: data.url };
			log.info("Selected video source", { url: data.url, area });
		}
	} else if (data.type === "jellyparty:localVideoEvent") {
		// Only accept events from the selected source
		if (event.source === selectedVideoSource) {
			// Forward to Chat Iframe
			if (iframe && iframe.contentWindow) {
				iframe.contentWindow.postMessage(data, "*");
			}
		}
	}
}

function showOverlay(autoJoinPartyId?: string): void {
	const iframe = getOrCreateIframe(autoJoinPartyId);
	if (!iframe) return;

	// Show in maximized state (chat window visible)
	isMinimized = false;
	iframe.style.display = "block";
	iframe.style.opacity = "1";
	iframe.style.pointerEvents = "auto";
	iframe.style.width = "380px";
	iframe.style.height = "600px";
	iframe.style.maxHeight = "80vh";
	iframe.style.maxWidth = "90vw";
	iframe.style.borderRadius = "16px";

	log.debug("Overlay shown (maximized)", { autoJoinPartyId });
}

function getOrCreateIframe(autoJoinPartyId?: string): HTMLIFrameElement | null {
	// Check for existing iframe
	let iframe = document.getElementById("jellyPartyChat") as HTMLIFrameElement;
	if (iframe) {
		return iframe;
	}

	// Create new iframe - starts minimized (FAB size)
	iframe = document.createElement("iframe");
	iframe.id = "jellyPartyChat";

	// Build hash params for iframe URL
	const parentUrl = encodeURIComponent(window.location.href);
	let hashParams = `parentUrl=${parentUrl}`;
	if (autoJoinPartyId) {
		hashParams += `&autoJoinPartyId=${encodeURIComponent(autoJoinPartyId)}`;
	}

	iframe.src = browser.runtime.getURL(`src/chat/chat.html#${hashParams}`);
	iframe.style.cssText = `
		position: fixed;
		bottom: 20px;
		right: 20px;
		width: 60px;
		height: 60px;
		border: none;
		border-radius: 50%;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 4px 20px rgba(0, 0, 0, 0.1);
		z-index: 2147483647;
		transition: opacity 0.3s ease;
		opacity: 1;
		display: none;
	`;

	document.body.appendChild(iframe);
	log.debug("Overlay iframe created", { autoJoinPartyId });
	return iframe;
}
