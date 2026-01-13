/**
 * E2E test for Jelly Party sync flow.
 *
 * This comprehensive test covers the full party lifecycle:
 * 1. Navigate to a video site
 * 2. Trigger the extension overlay
 * 3. Create a new party
 * 4. Copy the magic link
 * 5. Join via the real magic link flow (join.jelly-party.com)
 * 6. Verify both peers see each other
 * 7. Send chat messages and verify receipt
 */

import { expect, test, triggerExtension } from "./fixtures";
import { defaultSite, type VideoSite } from "./sites.config";

// Timeout for extension/network operations
const OPERATION_TIMEOUT = 15000;

test.describe("Party Sync Flow", () => {
	test.describe.configure({ mode: "serial" });

	test(`Create and join party on ${defaultSite.displayName}`, async ({
		context,
		extensionId,
	}) => {
		const site: VideoSite = defaultSite;

		// --- Tab A: Create Party ---
		const pageA = await context.newPage();
		await pageA.goto(site.url, { waitUntil: "domcontentloaded" });

		// Wait for video to be present
		await pageA.waitForSelector(site.videoSelector, {
			timeout: OPERATION_TIMEOUT,
		});
		await pageA.waitForTimeout(1000);

		// Trigger the extension overlay (simulates clicking extension icon)
		await triggerExtension(pageA);

		// Wait for the chat iframe to be injected
		const chatIframe = pageA.frameLocator('iframe[src*="chat.html"]');

		// Wait for the overlay to be visible
		await expect(chatIframe.getByTestId("create-party-btn")).toBeVisible({
			timeout: OPERATION_TIMEOUT,
		});

		// Create a new party
		await chatIframe.getByTestId("create-party-btn").click();

		// Wait for party to be created and magic link to appear
		await expect(chatIframe.getByTestId("magic-link-input")).toBeVisible({
			timeout: OPERATION_TIMEOUT,
		});

		// Get the magic link value
		const magicLink = await chatIframe
			.getByTestId("magic-link-input")
			.inputValue();
		expect(magicLink).toContain("jellyPartyId=");

		// Extract party ID for manual join
		const partyIdMatch = magicLink.match(/jellyPartyId=([^&]+)/);
		expect(partyIdMatch).toBeTruthy();
		const partyId = partyIdMatch![1];

		// Verify we're in the party
		await expect(chatIframe.getByTestId("peer-list")).toBeVisible();

		// --- Tab B: Join Party ---
		const pageB = await context.newPage();
		// 4. Join the party from Peer B using Magic Link
		// -----------------------------------------------------------------------

		// Navigate Peer B to the magic link
		// The test build has host_permissions, so the join page should:
		// 1. Detect permissions are present
		// 2. Automatically redirect to the video page with jellyPartyId
		console.log("Peer B navigating to magic link:", magicLink);
		await pageB.goto(magicLink);

		// Wait for redirect to PeerTube
		await pageB.waitForURL((url) => url.toString().includes("peertube.tv"));

		// The extension should automatically detect the party ID and join
		// Wait for the overlay to appear
		const chatIframeB = pageB.frameLocator('iframe[src*="chat.html"]');

		// Wait for connection validation (Magic Link input shows only when connected)
		await expect(chatIframeB.getByTestId("magic-link-input")).toBeVisible({
			timeout: OPERATION_TIMEOUT,
		});

		// Verify both tabs now show 2 peers
		await pageA.bringToFront();
		const peersA = chatIframe.locator('[data-testid="peer-list"] .peer');
		await expect(peersA).toHaveCount(2, { timeout: OPERATION_TIMEOUT });

		await pageB.bringToFront();
		const peersB = chatIframeB.locator('[data-testid="peer-list"] .peer');
		await expect(peersB).toHaveCount(2, { timeout: OPERATION_TIMEOUT });

		// --- Test Chat Messages ---
		const testMessage = `Hello from Tab A! ${Date.now()}`;

		// Send message from Tab A
		await pageA.bringToFront();
		await chatIframe.getByTestId("chat-input").fill(testMessage);
		await chatIframe.getByTestId("send-btn").click();

		// Verify message appears in Tab A
		await expect(chatIframe.getByTestId("messages-container")).toContainText(
			testMessage,
		);

		// Verify message appears in Tab B
		await pageB.bringToFront();
		await expect(chatIframeB.getByTestId("messages-container")).toContainText(
			testMessage,
			{
				timeout: OPERATION_TIMEOUT,
			},
		);

		// Send a reply from Tab B
		const replyMessage = `Reply from Tab B! ${Date.now()}`;
		await chatIframeB.getByTestId("chat-input").fill(replyMessage);
		await chatIframeB.getByTestId("send-btn").click();

		// Verify reply in Tab B
		await expect(chatIframeB.getByTestId("messages-container")).toContainText(
			replyMessage,
		);

		// Verify reply in Tab A
		await pageA.bringToFront();
		await expect(chatIframe.getByTestId("messages-container")).toContainText(
			replyMessage,
			{
				timeout: OPERATION_TIMEOUT,
			},
		);

		// Cleanup
		await pageA.close();
		await pageB.close();
	});
});
