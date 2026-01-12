/**
 * Content script entry point - runs on all pages
 * Injects Jelly Party overlay when triggered by extension icon click
 */

import { createLogger } from "jelly-party-lib";
import browser from "webextension-polyfill";
import { videoController } from "../lib/VideoController";

const log = createLogger("content");

// Initialize on load
initJellyParty();

function initJellyParty() {
	log.info("Initializing Jelly Party content script");

	// Listen for messages from popup/background
	browser.runtime.onMessage.addListener((message) => {
		if (message.type === "jellyparty:showOverlay") {
			showOverlay();
			return Promise.resolve({ success: true });
		}
		return false;
	});

	// Check for party ID in URL (for join links) - auto-show overlay
	const partyId = new URLSearchParams(window.location.search).get(
		"jellyPartyId",
	);
	if (partyId) {
		log.info("Found party ID in URL", { partyId });
		showOverlay();
		// Notify chat iframe to auto-join after a delay
		// The iframe has its own window, so we need to postMessage to it
		setTimeout(() => {
			const iframe = document.getElementById(
				"jellyPartyChat",
			) as HTMLIFrameElement;
			if (iframe?.contentWindow) {
				iframe.contentWindow.postMessage(
					{ type: "jellyparty:autoJoin", partyId },
					"*",
				);
				log.info("Posted autoJoin message to chat iframe", { partyId });
			} else {
				log.warn("Chat iframe not found or not ready for autoJoin");
			}
		}, 1000);
	}

	// Listen for messages from iframe
	window.addEventListener("message", handleIframeMessage);

	log.info("Jelly Party ready - click extension icon to open");
}

function handleIframeMessage(event: MessageEvent) {
	const iframe = getOrCreateIframe();
	if (!iframe) return;

	switch (event.data?.type) {
		case "jellyparty:minimize":
			iframe.style.height = "60px";
			iframe.style.width = "60px";
			iframe.style.borderRadius = "50%";
			break;
		case "jellyparty:maximize":
			iframe.style.height = "600px";
			iframe.style.width = "380px";
			iframe.style.maxHeight = "80vh";
			iframe.style.maxWidth = "90vw";
			iframe.style.borderRadius = "16px";
			break;
		case "jellyparty:close":
			iframe.style.display = "none";
			log.debug("Overlay hidden");
			break;
	}
}

function showOverlay(): void {
	const iframe = getOrCreateIframe();
	if (!iframe) return;

	// If already visible and expanded, do nothing
	if (iframe.style.display === "block" && iframe.style.width === "360px") {
		log.debug("Overlay already visible");
		return;
	}

	// Show expanded
	iframe.style.display = "block";
	iframe.style.width = "380px";
	iframe.style.height = "600px";
	iframe.style.maxHeight = "80vh";
	iframe.style.maxWidth = "90vw";
	iframe.style.borderRadius = "16px";
	log.debug("Overlay shown");
}

function getOrCreateIframe(): HTMLIFrameElement | null {
	// Check for existing iframe
	let iframe = document.getElementById("jellyPartyChat") as HTMLIFrameElement;
	if (iframe) {
		return iframe;
	}

	// Try to attach to video if present
	const video = document.querySelector("video");
	if (video) {
		videoController.attach();
	}

	// Create new iframe
	iframe = document.createElement("iframe");
	iframe.id = "jellyPartyChat";
	// Pass parent page URL as hash to the chat iframe
	const parentUrl = encodeURIComponent(window.location.href);
	iframe.src = browser.runtime.getURL(
		`src/chat/chat.html#parentUrl=${parentUrl}`,
	);
	iframe.style.cssText = `
		position: fixed;
		bottom: 20px;
		right: 20px;
		width: 60px;
		height: 60px;
		border: none;
		border-radius: 50%;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		z-index: 2147483647;
		background: transparent;
		transition: all 0.3s ease;
		display: none;
	`;

	document.body.appendChild(iframe);
	log.debug("Overlay iframe created");
	return iframe;
}
