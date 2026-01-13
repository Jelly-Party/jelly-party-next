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
 * 7. Verify "joined" system message appears
 * 8. Send chat messages and verify receipt
 * 9. Verify video sync: play/pause/seek events
 * 10. Verify event messages appear in chat
 */

import { expect, test, triggerExtension } from "./fixtures";
import { defaultSite, type VideoSite } from "./sites.config";

// Timeout for extension/network operations
const OPERATION_TIMEOUT = 15000;
// Tolerance for video time comparison (seconds)
const TIME_TOLERANCE = 2;

test.describe("Party Sync Flow", () => {
	test.describe.configure({ mode: "serial" });

	test(`Create and join party on ${defaultSite.displayName}`, async ({
		context,
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

		// --- Test System Messages: "joined" event ---
		// When Peer B joins, Peer A should see a "joined the party" message
		// (Peer B doesn't see their own join message - they're just joining)
		await pageA.bringToFront();
		await expect(
			chatIframe.getByTestId("system-message").first(),
		).toContainText("joined the party", { timeout: OPERATION_TIMEOUT });

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

		// --- Test Video Sync ---
		const videoA = pageA.locator("video").first();
		const videoB = pageB.locator("video").first();

		// Wait for video metadata to be loaded on both pages
		await pageA.bringToFront();
		await pageA.waitForFunction(
			() => {
				const v = document.querySelector("video");
				return v && v.readyState >= 1 && v.duration > 0;
			},
			{ timeout: OPERATION_TIMEOUT },
		);

		await pageB.bringToFront();
		await pageB.waitForFunction(
			() => {
				const v = document.querySelector("video");
				return v && v.readyState >= 1 && v.duration > 0;
			},
			{ timeout: OPERATION_TIMEOUT },
		);

		// Get video duration for seek calculations
		const duration = await videoA.evaluate((v: HTMLVideoElement) => v.duration);
		console.log("Video duration:", duration);

		// Ensure both videos start paused
		await pageA.bringToFront();
		await videoA.evaluate((v: HTMLVideoElement) => v.pause());
		await pageA.waitForTimeout(500);

		await pageB.bringToFront();
		await videoB.evaluate((v: HTMLVideoElement) => v.pause());
		await pageB.waitForTimeout(500);

		// Seek to a known position first (10 seconds or 5% of duration)
		const seekTarget = Math.min(10, duration * 0.05);
		console.log("Seeking to:", seekTarget);

		await pageA.bringToFront();
		await videoA.evaluate((v: HTMLVideoElement, t: number) => {
			v.currentTime = t;
		}, seekTarget);

		// Verify Peer B synced to similar position using polling
		await pageB.bringToFront();
		await expect
			.poll(
				async () => {
					const bTime = await videoB.evaluate(
						(v: HTMLVideoElement) => v.currentTime,
					);
					return Math.abs(bTime - seekTarget);
				},
				{ timeout: OPERATION_TIMEOUT },
			)
			.toBeLessThan(TIME_TOLERANCE);
		console.log("Peer B synced to seek position");

		// Test: Peer A plays video → Peer B should sync (best-effort, depends on video player)
		await pageA.bringToFront();
		await videoA.evaluate((v: HTMLVideoElement) => v.play());

		// Verify Peer B starts playing
		await pageB.bringToFront();
		await expect
			.poll(
				async () => await videoB.evaluate((v: HTMLVideoElement) => v.paused),
				{ timeout: OPERATION_TIMEOUT },
			)
			.toBe(false);
		console.log("Peer B is now playing");

		// Test: Peer A pauses video → Peer B should sync
		await pageA.bringToFront();
		await videoA.evaluate((v: HTMLVideoElement) => v.pause());

		// Verify Peer B pauses
		await pageB.bringToFront();
		await expect
			.poll(
				async () => await videoB.evaluate((v: HTMLVideoElement) => v.paused),
				{ timeout: OPERATION_TIMEOUT },
			)
			.toBe(true);
		console.log("Peer B is now paused");

		// --- Test Bidirectional Sync: B → A ---
		// This is crucial: sync must work both ways, not just A→B

		// Test: Peer B seeks → Peer A should sync
		const seekTarget2 = 30;
		console.log("Peer B seeking to:", seekTarget2);
		await pageB.bringToFront();
		await videoB.evaluate((v: HTMLVideoElement, t: number) => {
			v.currentTime = t;
		}, seekTarget2);

		// Verify Peer A synced
		await pageA.bringToFront();
		await expect
			.poll(
				async () => {
					const aTime = await videoA.evaluate(
						(v: HTMLVideoElement) => v.currentTime,
					);
					return Math.abs(aTime - seekTarget2);
				},
				{ timeout: OPERATION_TIMEOUT },
			)
			.toBeLessThan(TIME_TOLERANCE);
		console.log("Peer A synced to Peer B's seek position");

		// Test: Peer B plays → Peer A should sync
		await pageB.bringToFront();
		await videoB.evaluate((v: HTMLVideoElement) => v.play());

		await pageA.bringToFront();
		await expect
			.poll(
				async () => await videoA.evaluate((v: HTMLVideoElement) => v.paused),
				{ timeout: OPERATION_TIMEOUT },
			)
			.toBe(false);
		console.log("Peer A is now playing (synced from B)");

		// Test: Peer B pauses → Peer A should sync
		await pageB.bringToFront();
		await videoB.evaluate((v: HTMLVideoElement) => v.pause());

		await pageA.bringToFront();
		await expect
			.poll(
				async () => await videoA.evaluate((v: HTMLVideoElement) => v.paused),
				{ timeout: OPERATION_TIMEOUT },
			)
			.toBe(true);
		console.log("Peer A is now paused (synced from B)");

		// Verify event messages appeared in chat
		// The join event + any video events should be visible
		await pageA.bringToFront();
		const systemMessages = chatIframe.getByTestId("system-message");
		const systemMessageCount = await systemMessages.count();
		console.log("System message count:", systemMessageCount);

		// Should have at least the join event
		expect(systemMessageCount).toBeGreaterThanOrEqual(1);

		// --- Test Leave Party ---
		// When Peer B leaves, Peer A should see a "left the party" message

		// Peer B clicks leave button
		await pageB.bringToFront();
		await chatIframeB.getByTestId("leave-party-btn").click();

		// Confirm the leave modal
		await chatIframeB.getByTestId("modal-confirm-btn").click();

		// Verify Peer A sees the "left" message
		await pageA.bringToFront();
		await expect(chatIframe.getByTestId("messages-container")).toContainText(
			"left the party",
			{ timeout: OPERATION_TIMEOUT },
		);
		console.log("Peer A sees 'left the party' message");

		// Verify peer count decreased (now just 1 peer)
		await expect(peersA).toHaveCount(1, { timeout: OPERATION_TIMEOUT });
		console.log("Peer count is now 1");

		// Cleanup
		await pageA.close();
		await pageB.close();
	});
});
