/**
 * Content script entry point - runs on all pages
 * Injects Jelly Party overlay when triggered by extension icon click
 */

import { createLogger } from "jelly-party-lib";
import browser from "webextension-polyfill";
import { videoController } from "../lib/VideoController";

const log = createLogger("content");

// Track overlay state
let overlayInjected = false;
let overlayVisible = false;
let iframe: HTMLIFrameElement | null = null;

// Check if we're already loaded
if ((window as unknown as { jellyPartyLoaded?: boolean }).jellyPartyLoaded) {
	log.debug("Already loaded, skipping");
} else {
	(window as unknown as { jellyPartyLoaded: boolean }).jellyPartyLoaded = true;
	initJellyParty();
}

async function initJellyParty() {
	log.info("Initializing Jelly Party content script");

	// Listen for messages from background script
	browser.runtime.onMessage.addListener((message) => {
		if (message.type === "jellyparty:toggleOverlay") {
			toggleOverlay();
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
		// Auto-inject and join
		injectOverlay();
		showOverlay();
		// Notify chat window to auto-join after a delay
		setTimeout(() => {
			window.dispatchEvent(
				new CustomEvent("jellyparty:autoJoin", { detail: { partyId } }),
			);
		}, 500);
	}

	log.info("Jelly Party ready - click extension icon to open");
}

function toggleOverlay() {
	if (!overlayInjected) {
		injectOverlay();
		showOverlay();
	} else if (overlayVisible) {
		hideOverlay();
	} else {
		showOverlay();
	}
}

function injectOverlay(): void {
	if (overlayInjected) return;

	// Try to attach to video if present
	const video = document.querySelector("video");
	if (video) {
		videoController.attach();
	}

	// Remove existing iframe if any (cleanup for re-injection)
	const existing = document.getElementById("jellyPartyChat");
	if (existing) {
		existing.remove();
	}

	// Create iframe for chat/overlay window
	iframe = document.createElement("iframe");
	iframe.id = "jellyPartyChat";
	iframe.src = browser.runtime.getURL("src/chat/chat.html");
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
	overlayInjected = true;
	log.debug("Overlay injected");

	// Listen for minimize/maximize from chat
	window.addEventListener("message", (event) => {
		if (event.data?.type === "jellyparty:minimize") {
			if (iframe) {
				iframe.style.height = "60px";
				iframe.style.width = "60px";
				iframe.style.borderRadius = "50%";
			}
		} else if (event.data?.type === "jellyparty:maximize") {
			if (iframe) {
				iframe.style.height = "500px";
				iframe.style.width = "360px";
				iframe.style.borderRadius = "16px";
			}
		}
	});
}

function showOverlay(): void {
	if (!iframe) return;
	iframe.style.display = "block";
	// Start expanded
	iframe.style.width = "360px";
	iframe.style.height = "500px";
	iframe.style.borderRadius = "16px";
	overlayVisible = true;
	log.debug("Overlay shown");
}

function hideOverlay(): void {
	if (!iframe) return;
	iframe.style.display = "none";
	overlayVisible = false;
	log.debug("Overlay hidden");
}
