// Content script for join.jelly-party.com - runs at document_start
// Handles magic link redirect and permission requests via background script

import { createLogger } from "jelly-party-lib";
import browser from "webextension-polyfill";
import { initDevLogger } from "../lib/devLogger";

initDevLogger();

const log = createLogger("join");

// Signal to the page that extension is installed (for cross-browser detection)
document.documentElement.setAttribute("data-jellyparty-installed", "true");

const params = new URLSearchParams(window.location.search);
const partyId = params.get("jellyPartyId");
const redirectURL = params.get("redirectURL");

async function init() {
	log.info("Init", { partyId, redirectURL });

	if (!partyId || !redirectURL) {
		log.debug("No partyId or redirectURL, showing fallback");
		return;
	}

	try {
		const decodedURL = decodeURIComponent(redirectURL);
		log.debug("Decoded redirectURL", { decodedURL });

		// Validate URL
		const urlObj = new URL(decodedURL);
		const origin = `${urlObj.origin}/*`;
		log.debug("Parsed origin", { origin });

		// Ask background to check if we already have permission
		const response = await browser.runtime.sendMessage({
			type: "checkPermission",
			payload: { origin },
		});
		log.debug("Permission check response", response);

		if (response?.hasPermission) {
			// We have permission, proceed directly to redirect
			log.info("Permission already granted, redirecting");
			requestRedirect(decodedURL, partyId);
		} else {
			// Show permission prompt
			showPermissionPrompt(origin, decodedURL, partyId);
		}
	} catch (e) {
		log.error("Error in init", { error: String(e) });
		// Fallback: show permission prompt anyway
		if (partyId && redirectURL) {
			try {
				const decodedURL = decodeURIComponent(redirectURL);
				const urlObj = new URL(decodedURL);
				const origin = `${urlObj.origin}/*`;
				showPermissionPrompt(origin, decodedURL, partyId);
			} catch {
				log.error("Could not parse redirectURL");
			}
		}
	}
}

function requestRedirect(url: string, partyId: string) {
	log.info("Requesting redirect", { partyId, url });
	browser.runtime.sendMessage({
		type: "redirectToParty",
		payload: { redirectURL: url, partyId },
	});
}

function showPermissionPrompt(
	origin: string,
	redirectURL: string,
	partyId: string,
) {
	log.debug("Showing permission prompt");

	// Wait for DOM to be ready
	if (!document.body) {
		document.addEventListener("DOMContentLoaded", () =>
			showPermissionPrompt(origin, redirectURL, partyId),
		);
		return;
	}

	// Clear page and show our UI
	document.body.innerHTML = "";
	document.body.style.cssText =
		"margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(145,100,255,0.25) 0%,rgba(139,255,244,0.25) 100%);background-color:#1a1a2e;";

	// Create Shadow DOM container
	const host = document.createElement("div");
	document.body.appendChild(host);
	const shadow = host.attachShadow({ mode: "open" });

	const hostname = new URL(redirectURL).host;
	shadow.innerHTML = `
		<style>
			:host { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: white; }
			.card {
				background: rgba(255,255,255,0.08);
				backdrop-filter: blur(20px);
				border: 1px solid rgba(255,255,255,0.1);
				padding: 2.5rem;
				border-radius: 1.5rem;
				text-align: center;
				max-width: 450px;
				box-shadow: 0 8px 32px rgba(0,0,0,0.3);
				animation: fadeIn 0.5s ease-out;
			}
			@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
			h1 { margin: 0 0 1rem; font-size: 1.5rem; }
			p { color: rgba(255,255,255,0.8); margin-bottom: 2rem; line-height: 1.5; }
			.website { color: #a78bfa; font-weight: bold; }
			button {
				background: linear-gradient(135deg, #ff9494 0%, #9164ff 100%);
				border: none;
				padding: 1rem 2rem;
				border-radius: 50px;
				color: white;
				font-weight: bold;
				font-size: 1.1rem;
				cursor: pointer;
				transition: transform 0.2s, box-shadow 0.2s;
				box-shadow: 0 4px 15px rgba(145,100,255,0.4);
			}
			button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(145,100,255,0.6); }
			button:active { transform: translateY(0); }
			button:disabled { opacity: 0.7; cursor: wait; }
			.status { margin-top: 1rem; font-size: 0.9rem; color: rgba(255,255,255,0.6); }
		</style>
		<div class="card">
			<h1>Join the Party</h1>
			<p>
				Jelly-Party needs access to <span class="website">${hostname}</span> to sync videos.
				<br><br>
				Click below to grant permission and join your friends!
			</p>
			<button id="grant-btn">Grant Permissions & Join</button>
			<div id="status" class="status"></div>
		</div>
	`;

	const btn = shadow.getElementById("grant-btn") as HTMLButtonElement;
	const status = shadow.getElementById("status") as HTMLDivElement;

	if (btn) {
		btn.addEventListener("click", async () => {
			btn.disabled = true;
			btn.textContent = "Requesting...";
			status.textContent = "";

			try {
				log.debug("Requesting permission via background", { origin });
				const response = await browser.runtime.sendMessage({
					type: "requestPermission",
					payload: { origin },
				});
				log.info("Permission request response", response);

				if (response?.granted) {
					status.textContent = "Permission granted! Joining party...";
					requestRedirect(redirectURL, partyId);
				} else {
					status.textContent = "Permission denied. Please try again.";
					btn.disabled = false;
					btn.textContent = "Grant Permissions & Join";
				}
			} catch (e) {
				log.error("Error requesting permission", { error: String(e) });
				status.textContent = "Error requesting permission. Try again.";
				btn.disabled = false;
				btn.textContent = "Grant Permissions & Join";
			}
		});
	}
}

// Start
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
