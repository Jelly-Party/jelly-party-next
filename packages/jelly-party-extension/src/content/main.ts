/**
 * Content script entry point - runs on video pages
 */

import { createLogger } from "jelly-party-lib";
import browser from "webextension-polyfill";
import { videoController } from "../lib/VideoController";

const log = createLogger("content");

// Check if we're already loaded
if ((window as unknown as { jellyPartyLoaded?: boolean }).jellyPartyLoaded) {
	log.debug("Already loaded, skipping");
} else {
	(window as unknown as { jellyPartyLoaded: boolean }).jellyPartyLoaded = true;
	initJellyParty();
}

async function initJellyParty() {
	log.info("Initializing Jelly Party content script");

	// Wait for video to appear (with timeout)
	const video = await waitForVideo(10000);
	if (!video) {
		log.debug("No video found on page");
		return;
	}

	// Attach video controller
	const attached = videoController.attach();
	if (!attached) {
		log.error("Failed to attach to video");
		return;
	}

	// Inject the floating chat window
	injectChatWindow();

	// Check for party ID in URL (for join links)
	const partyId = new URLSearchParams(window.location.search).get(
		"jellyPartyId",
	);
	if (partyId) {
		log.info("Found party ID in URL", { partyId });
		// Notify chat window to auto-join
		window.dispatchEvent(
			new CustomEvent("jellyparty:autoJoin", { detail: { partyId } }),
		);
	}

	log.info("Jelly Party initialized");
}

async function waitForVideo(timeout: number): Promise<HTMLVideoElement | null> {
	const start = Date.now();

	while (Date.now() - start < timeout) {
		const video = document.querySelector("video");
		if (video && video.readyState >= 1) {
			return video;
		}
		await new Promise((r) => setTimeout(r, 500));
	}

	return null;
}

function injectChatWindow(): void {
	// Create iframe for chat window
	const iframe = document.createElement("iframe");
	iframe.id = "jellyPartyChat";
	iframe.src = browser.runtime.getURL("src/chat/chat.html");
	iframe.style.cssText = `
		position: fixed;
		bottom: 20px;
		right: 20px;
		width: 360px;
		height: 500px;
		border: none;
		border-radius: 16px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		z-index: 2147483647;
		background: transparent;
		transition: all 0.3s ease;
	`;

	document.body.appendChild(iframe);
	log.debug("Chat window injected");

	// Listen for minimize/maximize from chat
	window.addEventListener("message", (event) => {
		if (event.data?.type === "jellyparty:minimize") {
			iframe.style.height = "60px";
			iframe.style.width = "60px";
			iframe.style.borderRadius = "50%";
		} else if (event.data?.type === "jellyparty:maximize") {
			iframe.style.height = "500px";
			iframe.style.width = "360px";
			iframe.style.borderRadius = "16px";
		}
	});
}
