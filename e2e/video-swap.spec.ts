/**
 * E2E test for video source swap handling (simulating ads).
 *
 * This tests the extension's ability to handle scenarios where:
 * 1. The video source changes mid-playback (like YouTube ads)
 * 2. The video duration changes dramatically
 * 3. The video element is destroyed and recreated
 *
 * Expected behavior:
 * - Sync should pause when instability is detected
 * - Sync should resume when video stabilizes
 * - Peers should stay synchronized through these transitions
 */

import { expect, test, triggerExtension } from "./fixtures";
import { getSite } from "./sites.config";

// Timeout for extension/network operations
const OPERATION_TIMEOUT = 15000;
// Tolerance for video time comparison (seconds)
const TIME_TOLERANCE = 2;

test.describe("Video Swap Handling (Ad Simulation)", () => {
	test.describe.configure({ mode: "serial" });

	const site = getSite("video-swap-test");

	test("should maintain sync when video source is swapped (ad insertion)", async ({
		context,
	}) => {
		// --- Setup: Create party on Tab A ---
		const pageA = await context.newPage();
		await pageA.goto(site.url, { waitUntil: "domcontentloaded" });

		// Wait for video to be present and have duration
		await pageA.waitForSelector(site.videoSelector, {
			timeout: OPERATION_TIMEOUT,
		});
		await pageA.waitForFunction(
			() => {
				const v = document.querySelector("video");
				return v && v.readyState >= 1 && v.duration > 0;
			},
			{ timeout: OPERATION_TIMEOUT },
		);

		// Trigger extension overlay
		await triggerExtension(pageA);

		const chatIframeA = pageA.frameLocator('iframe[src*="chat.html"]');
		await expect(chatIframeA.getByTestId("create-party-btn")).toBeVisible({
			timeout: OPERATION_TIMEOUT,
		});

		// Create a party
		await chatIframeA.getByTestId("create-party-btn").click();
		await expect(chatIframeA.getByTestId("magic-link-input")).toBeVisible({
			timeout: OPERATION_TIMEOUT,
		});

		// Get the magic link
		const magicLink = await chatIframeA
			.getByTestId("magic-link-input")
			.inputValue();
		expect(magicLink).toContain("jellyPartyId=");

		// --- Setup: Join party on Tab B ---
		const pageB = await context.newPage();
		await pageB.goto(site.url, { waitUntil: "domcontentloaded" });

		// Wait for video
		await pageB.waitForSelector(site.videoSelector, {
			timeout: OPERATION_TIMEOUT,
		});
		await pageB.waitForFunction(
			() => {
				const v = document.querySelector("video");
				return v && v.readyState >= 1 && v.duration > 0;
			},
			{ timeout: OPERATION_TIMEOUT },
		);

		// Trigger extension and join party
		await triggerExtension(pageB);
		const chatIframeB = pageB.frameLocator('iframe[src*="chat.html"]');

		// Extract party ID from magic link and join manually
		const partyIdMatch = magicLink.match(/jellyPartyId=([^&]+)/);
		expect(partyIdMatch).toBeTruthy();
		const partyId = partyIdMatch![1];

		// Click "Join Party" and enter the party ID
		await chatIframeB.getByTestId("join-party-input").fill(partyId);
		await chatIframeB.getByTestId("join-party-btn").click();

		// Wait for both peers to see each other
		await pageA.bringToFront();
		const peersA = chatIframeA.locator('[data-testid="peer-list"] .peer');
		await expect(peersA).toHaveCount(2, { timeout: OPERATION_TIMEOUT });

		await pageB.bringToFront();
		const peersB = chatIframeB.locator('[data-testid="peer-list"] .peer');
		await expect(peersB).toHaveCount(2, { timeout: OPERATION_TIMEOUT });

		// --- Step 1: Establish initial sync ---
		const videoA = pageA.locator("video").first();
		const videoB = pageB.locator("video").first();

		// Seek to a known position (5 seconds into the ~15s video)
		await pageA.bringToFront();
		await videoA.evaluate((v: HTMLVideoElement) => {
			v.currentTime = 5;
		});

		// Verify B synced
		await pageB.bringToFront();
		await expect
			.poll(
				async () => {
					const bTime = await videoB.evaluate(
						(v: HTMLVideoElement) => v.currentTime,
					);
					return Math.abs(bTime - 5);
				},
				{ timeout: OPERATION_TIMEOUT },
			)
			.toBeLessThan(TIME_TOLERANCE);

		console.log("Initial sync established at 5s");

		// --- Step 2: Simulate ad insertion on Peer A ---
		// Peer A's video source changes to the 5-second "ad" video
		await pageA.bringToFront();

		// Record the current state before ad
		const preAdTimeA = await videoA.evaluate(
			(v: HTMLVideoElement) => v.currentTime,
		);
		const preAdDurationA = await videoA.evaluate(
			(v: HTMLVideoElement) => v.duration,
		);
		console.log(
			`Pre-ad state: time=${preAdTimeA.toFixed(2)}, duration=${preAdDurationA.toFixed(2)}`,
		);

		// Click the "Insert Ad" button on the test page
		await pageA.click('button:has-text("Insert 5s Ad")');

		// Wait for the ad to load (source swap AND metadata loaded)
		await pageA.waitForFunction(
			() => {
				const v = document.querySelector("video");
				return (
					v &&
					v.currentSrc?.includes("ad-video.mp4") &&
					v.readyState >= 1 &&
					!Number.isNaN(v.duration)
				);
			},
			{ timeout: OPERATION_TIMEOUT },
		);

		// Verify duration changed (ad is ~5s, main video is ~15s)
		const adDuration = await videoA.evaluate(
			(v: HTMLVideoElement) => v.duration,
		);
		console.log(`Ad duration: ${adDuration.toFixed(2)}s`);
		expect(adDuration).toBeLessThan(10); // Ad should be ~5s

		// --- Step 3: Verify Peer B is NOT disrupted by Peer A's ad ---
		// The key insight: when A's video changes to an ad, B should NOT
		// suddenly seek or pause. B should remain stable.
		await pageB.bringToFront();

		// B should still be at roughly the same position (not jumped to 0 or ad position)
		const bTimeDuringAd = await videoB.evaluate(
			(v: HTMLVideoElement) => v.currentTime,
		);
		console.log(`B time during A's ad: ${bTimeDuringAd.toFixed(2)}s`);

		// B should still be on the main video, not affected by A's ad
		const bDuration = await videoB.evaluate(
			(v: HTMLVideoElement) => v.duration,
		);
		expect(bDuration).toBeGreaterThan(10); // B should still have main video (~15s)

		// --- Step 4: Simulate ad ending on Peer A ---
		await pageA.bringToFront();

		// Click "Back to Main" to restore the original video
		await pageA.click('button:has-text("Back to Main")');

		// Wait for main video to load
		await pageA.waitForFunction(
			() => {
				const v = document.querySelector("video");
				return v && v.currentSrc?.includes("main-video.mp4") && v.duration > 10;
			},
			{ timeout: OPERATION_TIMEOUT },
		);

		const postAdDurationA = await videoA.evaluate(
			(v: HTMLVideoElement) => v.duration,
		);
		console.log(`Post-ad duration: ${postAdDurationA.toFixed(2)}s`);
		expect(postAdDurationA).toBeGreaterThan(10);

		// --- Step 5: Verify sync resumes correctly ---
		// After ad, A should resync to where B is (or B to A, depending on design)
		// For now, we verify that manual sync still works

		// A seeks to 10 seconds
		await pageA.bringToFront();
		await videoA.evaluate((v: HTMLVideoElement) => {
			v.currentTime = 10;
		});

		// B should sync
		await pageB.bringToFront();
		await expect
			.poll(
				async () => {
					const bTime = await videoB.evaluate(
						(v: HTMLVideoElement) => v.currentTime,
					);
					return Math.abs(bTime - 10);
				},
				{ timeout: OPERATION_TIMEOUT },
			)
			.toBeLessThan(TIME_TOLERANCE);

		console.log("Sync resumed successfully after ad");

		// Cleanup
		await pageA.close();
		await pageB.close();
	});

	test("should handle video element destruction and recreation", async ({
		context,
	}) => {
		// --- Setup: Create party on Tab A ---
		const pageA = await context.newPage();
		await pageA.goto(site.url, { waitUntil: "domcontentloaded" });

		await pageA.waitForSelector(site.videoSelector, {
			timeout: OPERATION_TIMEOUT,
		});
		await pageA.waitForFunction(
			() => {
				const v = document.querySelector("video");
				return v && v.readyState >= 1 && v.duration > 0;
			},
			{ timeout: OPERATION_TIMEOUT },
		);

		await triggerExtension(pageA);

		const chatIframeA = pageA.frameLocator('iframe[src*="chat.html"]');
		await expect(chatIframeA.getByTestId("create-party-btn")).toBeVisible({
			timeout: OPERATION_TIMEOUT,
		});

		await chatIframeA.getByTestId("create-party-btn").click();
		await expect(chatIframeA.getByTestId("magic-link-input")).toBeVisible({
			timeout: OPERATION_TIMEOUT,
		});

		// --- Setup: Join party on Tab B ---
		const magicLink = await chatIframeA
			.getByTestId("magic-link-input")
			.inputValue();
		const partyIdMatch = magicLink.match(/jellyPartyId=([^&]+)/);
		expect(partyIdMatch).toBeTruthy();
		const partyId = partyIdMatch![1];

		const pageB = await context.newPage();
		await pageB.goto(site.url, { waitUntil: "domcontentloaded" });

		await pageB.waitForSelector(site.videoSelector, {
			timeout: OPERATION_TIMEOUT,
		});
		await pageB.waitForFunction(
			() => {
				const v = document.querySelector("video");
				return v && v.readyState >= 1 && v.duration > 0;
			},
			{ timeout: OPERATION_TIMEOUT },
		);

		await triggerExtension(pageB);
		const chatIframeB = pageB.frameLocator('iframe[src*="chat.html"]');

		await chatIframeB.getByTestId("join-party-input").fill(partyId);
		await chatIframeB.getByTestId("join-party-btn").click();

		// Wait for both peers
		await pageA.bringToFront();
		const peersA = chatIframeA.locator('[data-testid="peer-list"] .peer');
		await expect(peersA).toHaveCount(2, { timeout: OPERATION_TIMEOUT });

		// --- Step 1: Establish initial sync ---
		const videoA = pageA.locator("video").first();
		const videoB = pageB.locator("video").first();

		await pageA.bringToFront();
		await videoA.evaluate((v: HTMLVideoElement) => {
			v.currentTime = 5;
		});

		await pageB.bringToFront();
		await expect
			.poll(
				async () => {
					const bTime = await videoB.evaluate(
						(v: HTMLVideoElement) => v.currentTime,
					);
					return Math.abs(bTime - 5);
				},
				{ timeout: OPERATION_TIMEOUT },
			)
			.toBeLessThan(TIME_TOLERANCE);

		console.log("Initial sync established");

		// --- Step 2: Destroy video element on A ---
		await pageA.bringToFront();
		await pageA.click('button:has-text("Destroy Video")');

		// Verify video is gone
		const videoCount = await pageA.locator("video").count();
		expect(videoCount).toBe(0);
		console.log("Video destroyed on A");

		// B should remain stable (not crash or lose its video)
		await pageB.bringToFront();
		const bStillHasVideo = await pageB.locator("video").count();
		expect(bStillHasVideo).toBe(1);

		// --- Step 3: Recreate video on A ---
		await pageA.bringToFront();
		await pageA.click('button:has-text("Recreate Video")');

		// Wait for new video
		await pageA.waitForSelector("video", { timeout: OPERATION_TIMEOUT });
		await pageA.waitForFunction(
			() => {
				const v = document.querySelector("video");
				return v && v.readyState >= 1 && v.duration > 0;
			},
			{ timeout: OPERATION_TIMEOUT },
		);

		console.log("Video recreated on A");

		// --- Step 4: Verify sync can be re-established ---
		const newVideoA = pageA.locator("video").first();

		// B seeks, A should follow
		await pageB.bringToFront();
		await videoB.evaluate((v: HTMLVideoElement) => {
			v.currentTime = 8;
		});

		await pageA.bringToFront();
		await expect
			.poll(
				async () => {
					const aTime = await newVideoA.evaluate(
						(v: HTMLVideoElement) => v.currentTime,
					);
					return Math.abs(aTime - 8);
				},
				{ timeout: OPERATION_TIMEOUT },
			)
			.toBeLessThan(TIME_TOLERANCE);

		console.log("Sync re-established after video recreation");

		// Cleanup
		await pageA.close();
		await pageB.close();
	});
});
