import { getRandomEmoji } from "jelly-party-lib";
import browser from "webextension-polyfill";

// Types
interface UserOptions {
	guid: string;
	clientName: string;
	emoji: string;
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

// Message handlers
browser.runtime.onMessage.addListener(
	(message: { type: string; payload?: unknown }) => {
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

			default:
				console.log("Jelly Party: Unknown message type:", message.type);
				return Promise.resolve(null);
		}
	},
);

// Handle extension icon click - toggle overlay on current tab
browser.action.onClicked.addListener(async (tab) => {
	if (!tab.id) return;

	console.log("Jelly Party: Extension clicked on tab:", tab.id);

	// Send message to content script to toggle the overlay
	try {
		await browser.tabs.sendMessage(tab.id, {
			type: "jellyparty:toggleOverlay",
		});
	} catch (error) {
		// Content script might not be loaded yet, inject it
		console.log("Jelly Party: Content script not ready, injecting...");
		await browser.scripting.executeScript({
			target: { tabId: tab.id },
			files: ["src/content/main.js"],
		});
		// Try again after injection
		setTimeout(async () => {
			try {
				await browser.tabs.sendMessage(tab.id!, {
					type: "jellyparty:toggleOverlay",
				});
			} catch (e) {
				console.error("Jelly Party: Failed to toggle overlay", e);
			}
		}, 500);
	}
});
