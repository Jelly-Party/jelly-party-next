import { createLogger, getRandomEmoji } from "jelly-party-lib";
import browser from "webextension-polyfill";
import { initDevLogger } from "../lib/devLogger";

initDevLogger();

const log = createLogger("bg");

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

// Track tabs that need showOverlay when content script is ready
const pendingShowOverlay = new Map<number, boolean>();

// Initialize on install
browser.runtime.onInstalled.addListener(async () => {
	log.info("Extension installed");

	// Check if options already exist
	const result = await browser.storage.local.get("options");
	if (!result.options) {
		const options: UserOptions = {
			guid: generateUUID(),
			clientName: generateRandomName(),
			emoji: getRandomEmoji(),
		};
		await browser.storage.local.set({ options });
		log.info("Initialized with options", options);
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
	log.info("redirectToParty called", { tabId, partyId });

	// Build the target URL with partyId
	const targetUrl = new URL(redirectURL);
	targetUrl.searchParams.set("jellyPartyId", partyId);
	const finalUrl = targetUrl.toString();

	log.debug("Built final URL", { finalUrl });

	// First, check if we have permission for this origin
	const origin = `${targetUrl.origin}/*`;
	const hasPermission = await browser.permissions.contains({
		origins: [origin],
	});
	log.debug("Permission check", { origin, hasPermission });

	if (!hasPermission) {
		log.warn("Missing permission", { origin });
	}

	// 1. Setup listener BEFORE navigation to avoid race condition
	log.debug("Setting up navigation listener");
	const navigationComplete = new Promise<void>((resolve) => {
		const listener = (
			tid: number,
			changeInfo: browser.Tabs.OnUpdatedChangeInfoType,
		) => {
			if (tid === tabId && changeInfo.status === "complete") {
				browser.tabs.onUpdated.removeListener(listener);
				resolve();
			}
		};
		browser.tabs.onUpdated.addListener(listener);
	});

	// 2. Update the tab to the target URL
	log.debug("Updating tab", { url: finalUrl });
	await browser.tabs.update(tabId, { url: finalUrl });

	// 3. Wait for navigation to complete
	log.debug("Waiting for tab to load");
	await navigationComplete;

	log.debug("Tab loaded, injecting scripts");

	try {
		// Mark this tab as needing showOverlay when content script sends "contentReady"
		// This ensures the overlay appears automatically after injection
		pendingShowOverlay.set(tabId, true);

		// 1. Inject VideoAgent into all frames
		await browser.scripting.executeScript({
			target: { tabId, allFrames: true },
			files: ["src/content/videoAgent.js"],
		});
		// 2. Inject SyncManager (main) into top frame only
		await browser.scripting.executeScript({
			target: { tabId, allFrames: false },
			files: ["src/content/main.js"],
		});
		log.info("Content script injected successfully");
	} catch (e) {
		log.error("Script injection failed", { error: String(e) });
		pendingShowOverlay.delete(tabId);
	}
}

// Message handlers
browser.runtime.onMessage.addListener(
	(message: unknown, sender: browser.Runtime.MessageSender) => {
		const msg = message as { type: string; payload?: unknown };

		switch (msg.type) {
			case "jellyparty:contentReady": {
				// Content script is ready - check if we need to show overlay
				const tabId = sender.tab?.id;
				if (tabId && pendingShowOverlay.has(tabId)) {
					pendingShowOverlay.delete(tabId);
					log.info("Content ready, showing overlay", { tabId });
					return browser.tabs.sendMessage(tabId, {
						type: "jellyparty:showOverlay",
					});
				}
				return Promise.resolve(null);
			}

			case "getTabId":
				// Return the sender's tab ID for log identification
				return Promise.resolve({ tabId: sender.tab?.id ?? null });

			case "getOptions":
				return browser.storage.local.get("options").then((r) => r.options);

			case "setOptions":
				return browser.storage.local.set({
					options: msg.payload,
				});

			case "getPartyId":
				return browser.storage.local
					.get("currentPartyId")
					.then((r) => r.currentPartyId);

			case "setPartyId":
				return browser.storage.local.set({
					currentPartyId: msg.payload,
				});

			case "redirectToParty": {
				log.info("Received redirectToParty", msg.payload);
				const payload = msg.payload as RedirectPayload;
				const tabId = sender.tab?.id;
				log.debug("Sender tab", { tabId });
				if (tabId && payload.redirectURL && payload.partyId) {
					redirectToParty(tabId, payload.redirectURL, payload.partyId);
				} else {
					log.error("Missing tabId or payload", { tabId, payload });
				}
				return Promise.resolve({ success: true });
			}

			case "checkPermission": {
				const { origin } = msg.payload as { origin: string };
				log.debug("Checking permission", { origin });
				return browser.permissions
					.contains({ origins: [origin] })
					.then((hasPermission) => {
						log.debug("Permission check result", { origin, hasPermission });
						return { hasPermission };
					});
			}

			case "requestPermission": {
				const { origin } = msg.payload as { origin: string };
				log.debug("Requesting permission", { origin });
				return browser.permissions
					.request({ origins: [origin] })
					.then((granted) => {
						log.info("Permission request result", { origin, granted });
						return { granted };
					})
					.catch((e) => {
						log.error("Permission request failed", { error: String(e) });
						return { granted: false, error: String(e) };
					});
			}

			default:
				log.debug("Unknown message type", { type: msg.type });
				return Promise.resolve(null);
		}
	},
);

// Handle extension icon click - inject and show overlay on current tab
browser.action.onClicked.addListener(async (tab) => {
	if (!tab.id) return;

	const tabId = tab.id;
	log.info("Extension icon clicked", { tabId });

	// First try to send message to existing content script
	try {
		await browser.tabs.sendMessage(tabId, {
			type: "jellyparty:showOverlay",
		});
	} catch {
		// Content script not loaded yet, inject it
		log.debug("Injecting content script");
		try {
			// Mark this tab as needing showOverlay when content script is ready
			pendingShowOverlay.set(tabId, true);

			// 1. Inject VideoAgent into all frames
			await browser.scripting.executeScript({
				target: { tabId, allFrames: true },
				files: ["src/content/videoAgent.js"],
			});
			// 2. Inject SyncManager (main) into top frame only
			await browser.scripting.executeScript({
				target: { tabId, allFrames: false },
				files: ["src/content/main.js"],
			});
			// Content script will send "contentReady" message which triggers showOverlay
		} catch (e) {
			pendingShowOverlay.delete(tabId);
			log.error("Failed to inject content script", { error: String(e) });
		}
	}
});
