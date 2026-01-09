// Content script for join.jelly-party.com - runs at document_start
// Handles magic link redirect and permission requests

import browser from "webextension-polyfill";

// Signal to the page that extension is installed (for cross-browser detection)
document.documentElement.setAttribute("data-jellyparty-installed", "true");

const params = new URLSearchParams(window.location.search);
const partyId = params.get("jellyPartyId");
const redirectURL = params.get("redirectURL");

async function init() {
	if (!partyId || !redirectURL) return;

	try {
		const decodedURL = decodeURIComponent(redirectURL);
		// Validate URL
		const urlObj = new URL(decodedURL);
		const origin = `${urlObj.origin}/*`;

		// Check if we already have permission for this origin
		const hasPermission = await browser.permissions.contains({
			origins: [origin],
		});

		if (hasPermission) {
			// Fast path: we have permission, redirect immediately
			requestRedirect(decodedURL, partyId);
		} else {
			// Permission missing: Show UI to request it
			showPermissionPrompt(origin, decodedURL, partyId);
		}
	} catch (e) {
		console.error("Jelly Party: Invalid magic link", e);
	}
}

function requestRedirect(url: string, partyId: string) {
	console.log("Jelly Party: Requesting redirect to party", {
		partyId,
		redirectURL: url,
	});
	browser.runtime.sendMessage({
		type: "redirectToParty",
		payload: {
			redirectURL: url,
			partyId,
		},
	});
}

function showPermissionPrompt(
	origin: string,
	redirectURL: string,
	partyId: string,
) {
	// Remove existing fallback content if possible (optional, but cleaner)
	document.documentElement.innerHTML = ""; // Clear the page to show our UI
	document.body.style.margin = "0";
	document.body.style.height = "100vh";

	// Create Shadow DOM container
	const host = document.createElement("div");
	document.body.appendChild(host);
	const shadow = host.attachShadow({ mode: "open" });

	// Inject styles and UI
	shadow.innerHTML = `
    <style>
      :host {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        width: 100vw;
        background: linear-gradient(135deg, rgba(145, 100, 255, 0.25) 0%, rgba(139, 255, 244, 0.25) 100%);
        background-color: #1a1a2e;
        color: white;
      }
      .card {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 2.5rem;
        border-radius: 1.5rem;
        text-align: center;
        max-width: 450px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        animation: fadeIn 0.5s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      h1 { margin: 0 0 1rem; font-size: 1.5rem; }
      p { color: rgba(255, 255, 255, 0.8); margin-bottom: 2rem; line-height: 1.5; }
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
        box-shadow: 0 4px 15px rgba(145, 100, 255, 0.4);
      }
      button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(145, 100, 255, 0.6);
      }
      button:active { transform: translateY(0); }
    </style>
    <div class="card">
      <h1>Grant Permissions</h1>
      <p>
        Jelly-Party needs access to <span class="website">${new URL(redirectURL).host}</span> to sync videos.
        <br><br>
        Click below to grant permission and join the party!
      </p>
      <button id="grant-btn">Grant Permissions</button>
    </div>
  `;

	// Add click handler
	const btn = shadow.getElementById("grant-btn");
	if (btn) {
		btn.addEventListener("click", async () => {
			try {
				const granted = await browser.permissions.request({
					origins: [origin],
				});
				if (granted) {
					console.log("Jelly Party: Permission granted!");
					requestRedirect(redirectURL, partyId);
				} else {
					console.log("Jelly Party: Permission denied");
				}
			} catch (e) {
				console.error("Jelly Party: Failed to request permission", e);
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
