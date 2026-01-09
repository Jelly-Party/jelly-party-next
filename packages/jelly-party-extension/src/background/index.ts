import { getRandomEmoji } from "jelly-party-lib";
import browser from "webextension-polyfill";

// Types
interface UserOptions {
	guid: string;
	clientName: string;
	emoji: string;
}

interface RedirectPayload {
	redirectURL: string;
	partyId: string;
}

// Generate random name from adjective + animal
const adjectives = [
	"Happy",
	"Silly",
	"Brave",
	"Clever",
	"Swift",
	"Gentle",
	"Wild",
	"Calm",
];
const animals = [
	"Panda",
	"Koala",
	"Fox",
	"Owl",
	"Tiger",
	"Dolphin",
	"Eagle",
	"Wolf",
];

function generateRandomName(): string {
	const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	const animal = animals[Math.floor(Math.random() * animals.length)];
	return `${adj} ${animal}`;
}

function generateUUID(): string {
	return crypto.randomUUID();
}

// Initialize on install
browser.runtime.onInstalled.addListener(async () => {
	console.log("Jelly Party: Extension installed!");

	// Check if options already exist
	const result = await browser.storage.local.get("options");
	if (!result.options) {
		const options: UserOptions = {
			guid: generateUUID(),
			clientName: generateRandomName(),
			emoji: getRandomEmoji(),
		};
		await browser.storage.local.set({ options });
		console.log("Jelly Party: Initialized with options:", options);
	}
});

/**
 * Redirect to a party URL and inject the content script.
 * This handles magic link redirects from join.jelly-party.com.
 */
async function redirectToParty(
	tabId: number,
	redirectURL: string,
	partyId: string,
): Promise<void> {
	// Build the target URL with partyId
	const targetUrl = new URL(redirectURL);
	targetUrl.searchParams.set("jellyPartyId", partyId);
	const finalUrl = targetUrl.toString();

	console.log("Jelly Party: Redirecting to party", { finalUrl, partyId });

	// First, check if we have permission for this origin
	const origin = `${targetUrl.origin}/*`;
	const hasPermission = await browser.permissions.contains({
		origins: [origin],
	});

	if (!hasPermission) {
		console.warn("Jelly Party: Missing permission for", origin);
		// We cannot request permission here in background context without user gesture.
		// join.ts should have handled this. We'll try to proceed anyway,
		// relying on activeTab if applicable, but mostly likely executeScript will fail
		// if host permission wasn't granted.
	}

	// Update the tab to the target URL
	await browser.tabs.update(tabId, { url: finalUrl });

	// Inject content script with retries (page may take time to load)
	const delays = [1000, 3000, 5000];
	for (const delay of delays) {
		await new Promise((resolve) => setTimeout(resolve, delay));
		try {
			await browser.scripting.executeScript({
				target: { tabId },
				files: ["src/content/main.js"],
			});
			console.log(
				"Jelly Party: Content script injected successfully after",
				delay,
				"ms",
			);
			break;
		} catch (e) {
			console.log(
				"Jelly Party: Script injection attempt failed, retrying...",
				e,
			);
		}
	}
}

// Message handlers
browser.runtime.onMessage.addListener(
	(message: { type: string; payload?: unknown }, sender) => {
		switch (message.type) {
			case "getOptions":
				return browser.storage.local.get("options").then((r) => r.options);

			case "setOptions":
				return browser.storage.local.set({
					options: message.payload,
				});

			case "getPartyId":
				return browser.storage.local
					.get("currentPartyId")
					.then((r) => r.currentPartyId);

			case "setPartyId":
				return browser.storage.local.set({
					currentPartyId: message.payload,
				});

			case "redirectToParty": {
				const payload = message.payload as RedirectPayload;
				const tabId = sender.tab?.id;
				if (tabId && payload.redirectURL && payload.partyId) {
					redirectToParty(tabId, payload.redirectURL, payload.partyId);
				}
				return Promise.resolve({ success: true });
			}

			default:
				console.log("Jelly Party: Unknown message type:", message.type);
				return Promise.resolve(null);
		}
	},
);

// Handle extension icon click - inject and show overlay on current tab
browser.action.onClicked.addListener(async (tab) => {
	if (!tab.id) return;

	console.log("Jelly Party: Extension clicked on tab:", tab.id);

	// First try to send message to existing content script
	try {
		await browser.tabs.sendMessage(tab.id, {
			type: "jellyparty:showOverlay",
		});
	} catch {
		// Content script not loaded yet, inject it
		console.log("Jelly Party: Injecting content script...");
		try {
			await browser.scripting.executeScript({
				target: { tabId: tab.id },
				files: ["src/content/main.js"],
			});
			// Wait a bit for script to initialize, then send message
			setTimeout(async () => {
				try {
					await browser.tabs.sendMessage(tab.id!, {
						type: "jellyparty:showOverlay",
					});
				} catch (e) {
					console.error("Jelly Party: Failed to show overlay", e);
				}
			}, 300);
		} catch (e) {
			console.error("Jelly Party: Failed to inject content script", e);
		}
	}
});
