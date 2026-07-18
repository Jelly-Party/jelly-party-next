import { expect, extensionTabId, launchExtensionPeer, openSidebar, test } from "./fixtures";

const videoUrl = "http://localhost:16333/video-swap-test.html";

test("two peers create, join, chat, and synchronize playback in both directions", async () => {
  const peerA = await launchExtensionPeer();
  const peerB = await launchExtensionPeer();

  try {
    const videoA = await peerA.context.newPage();
    await videoA.goto(videoUrl);
    await expect(videoA.locator("video")).toHaveJSProperty("readyState", 4);
    const sidebarA = await openSidebar(peerA, videoA);

    await expect(sidebarA.getByTestId("video-state")).toHaveText("Video ready");
    await sidebarA.getByTestId("name-input").fill("Mira");
    await sidebarA.getByTestId("emoji-input").fill("🪼");
    await sidebarA.getByTestId("create-party").click();
    await expect(sidebarA.getByTestId("connection-status")).toHaveText("connected");
    const invite = await sidebarA.getByTestId("invite-link").inputValue();
    expect(invite).toContain("party=");
    expect(invite).toContain(encodeURIComponent(videoUrl));

    const joinPage = await peerB.context.newPage();
    await joinPage.goto(invite);
    await expect(joinPage.getByRole("button", { name: "Open video and join" })).toBeEnabled();
    await joinPage.getByRole("button", { name: "Open video and join" }).click();
    await joinPage.waitForURL(videoUrl);
    await expect(joinPage.locator("video")).toHaveJSProperty("readyState", 4);
    const sidebarB = await openSidebar(peerB, joinPage);

    await expect(sidebarB.getByTestId("connection-status")).toHaveText("connected");
    await expect(sidebarA.getByTestId("peer")).toHaveCount(2);
    await expect(sidebarB.getByTestId("peer")).toHaveCount(2);

    await sidebarB.getByTestId("chat-input").fill("Ready for movie night?");
    await sidebarB.getByTestId("send-chat").click();
    await expect(sidebarA.getByTestId("messages")).toContainText("Ready for movie night?");

    const secondaryVideo = joinPage.frameLocator("iframe").locator("video");
    await expect(secondaryVideo).toHaveJSProperty("readyState", 4);
    await secondaryVideo.evaluate((video: HTMLVideoElement) => {
      video.currentTime = 2;
    });
    await joinPage.waitForTimeout(500);
    expect(await currentTime(videoA)).toBeLessThan(0.5);

    await seek(joinPage, 1);
    await expect.poll(() => currentTime(videoA)).toBeCloseTo(1, 0);

    await videoA.locator("video").evaluate((video: HTMLVideoElement) => video.play());
    await expect.poll(() => paused(joinPage)).toBe(false);
    await videoA.locator("video").evaluate((video: HTMLVideoElement) => video.pause());
    await expect.poll(() => paused(joinPage)).toBe(true);

    await videoA.locator("video").evaluate((video: HTMLVideoElement) => {
      const replacement = video.cloneNode(true) as HTMLVideoElement;
      video.replaceWith(replacement);
      replacement.load();
    });
    await expect(videoA.locator("video")).toHaveJSProperty("readyState", 4);
    await seek(videoA, 3);
    await expect.poll(() => currentTime(joinPage)).toBeCloseTo(3, 0);
    await joinPage.locator("video").evaluate((video: HTMLVideoElement) => video.play());
    await expect.poll(() => paused(videoA)).toBe(false);
    await joinPage.locator("video").evaluate((video: HTMLVideoElement) => video.pause());
    await expect.poll(() => paused(videoA)).toBe(true);

    await sidebarB.getByTestId("leave-party").click();
    await expect(sidebarA.getByTestId("peer")).toHaveCount(1);

    expect(await extensionTabId(peerA, videoA)).toBeGreaterThan(0);
  } finally {
    await peerB.close();
    await peerA.close();
  }
});

async function seek(page: import("@playwright/test").Page, seconds: number): Promise<void> {
  await page.locator("video").evaluate((video: HTMLVideoElement, target) => {
    video.currentTime = target;
  }, seconds);
}

async function currentTime(page: import("@playwright/test").Page): Promise<number> {
  return page.locator("video").evaluate((video: HTMLVideoElement) => video.currentTime);
}

async function paused(page: import("@playwright/test").Page): Promise<boolean> {
  return page.locator("video").evaluate((video: HTMLVideoElement) => video.paused);
}
