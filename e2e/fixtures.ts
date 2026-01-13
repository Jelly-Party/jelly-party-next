import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, test as base, chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to the test build of the extension (with pre-granted permissions)
const EXTENSION_PATH = path.join(
	__dirname,
	"..",
	"packages",
	"jelly-party-extension",
	"dist-test",
);

export const test = base.extend<{
	context: BrowserContext;
	extensionId: string;
}>({
	context: async ({}, use) => {
		// Create a temporary user data directory
		const userDataDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "jelly-party-test-"),
		);

		const context = await chromium.launchPersistentContext(userDataDir, {
			channel: "chromium",
			headless: false, // Extensions require headed mode
			args: [
				`--disable-extensions-except=${EXTENSION_PATH}`,
				`--load-extension=${EXTENSION_PATH}`,
				"--allow-running-insecure-content",
			],
		});

		// Wait for extension service worker to load
		let serviceWorker = context.serviceWorkers()[0];
		if (!serviceWorker) {
			serviceWorker = await context.waitForEvent("serviceworker", {
				timeout: 10000,
			});
		}

		await use(context);
		await context.close();

		// Cleanup temp directory
		fs.rmSync(userDataDir, { recursive: true, force: true });
	},

	extensionId: async ({ context }, use) => {
		let [serviceWorker] = context.serviceWorkers();
		if (!serviceWorker) {
			serviceWorker = await context.waitForEvent("serviceworker");
		}
		const extensionId = serviceWorker.url().split("/")[2];
		await use(extensionId);
	},
});

export const expect = test.expect;

/**
 * Trigger the extension overlay.
 *
 * We use a robust programmatic approach:
 * 1. Try sending a message to the content script (if already injected)
 * 2. If that fails, inject the content scripts (allowed due to host_permissions in test build)
 * 3. Send the message again
 *
 * This is more reliable than keyboard shortcuts in automated testing environments.
 */
export async function triggerExtension(
	page: Awaited<ReturnType<BrowserContext["newPage"]>>,
): Promise<void> {
	await page.bringToFront();

	// Get the extension service worker
	const context = page.context();
	let serviceWorker = context.serviceWorkers()[0];
	if (!serviceWorker) {
		serviceWorker = await context.waitForEvent("serviceworker");
	}

	const result = await serviceWorker.evaluate(async () => {
		try {
			// Get the active tab
			// @ts-expect-error
			const tabs = await chrome.tabs.query({
				active: true,
				lastFocusedWindow: true,
			});
			const tab = tabs[0];
			if (!tab?.id) return { success: false, error: "No active tab" };

			const tabId = tab.id;

			// Helper to send message
			const sendMessage = async () => {
				// @ts-expect-error
				await chrome.tabs.sendMessage(tabId, {
					type: "jellyparty:showOverlay",
				});
			};

			try {
				// Try sending message first (fast path)
				await sendMessage();
				return { success: true, method: "message" };
			} catch (e) {
				// Content script not ready, need to inject
			}

			// Inject scripts (guaranteed to work with host_permissions)
			// @ts-expect-error
			await chrome.scripting.executeScript({
				target: { tabId, allFrames: true },
				files: ["src/content/videoAgent.js"],
			});
			// @ts-expect-error
			await chrome.scripting.executeScript({
				target: { tabId, allFrames: false },
				files: ["src/content/main.js"],
			});

			// Small delay for script init
			await new Promise((r) => setTimeout(r, 100));

			await sendMessage();
			return { success: true, method: "inject-and-message" };
		} catch (e) {
			return { success: false, error: String(e) };
		}
	});

	if (!result.success) {
		console.error("Failed to trigger extension:", result.error);
		throw new Error(`Failed to trigger extension: ${result.error}`);
	}

	console.log(`Extension triggered via ${result.method}`);

	// Wait for overlay to render
	await page.waitForTimeout(1000);
}
