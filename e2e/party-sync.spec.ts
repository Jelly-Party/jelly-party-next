import {
  expect,
  extensionTabId,
  launchExtensionPeer,
  openSidebar,
  sidePanelOptions,
  test,
} from "./fixtures";

const videoUrl = "http://localhost:16333/video-swap-test.html";

test("two peers create, join, chat, and synchronize playback in both directions", async () => {
  const peerA = await launchExtensionPeer();
  const peerB = await launchExtensionPeer();

  try {
    const videoA = await peerA.context.newPage();
    await videoA.goto(videoUrl);
    await expect(videoA.locator("video")).toHaveJSProperty("readyState", 4);
    let sidebarA = await openSidebar(peerA, videoA);

    await expect(sidebarA.getByTestId("video-state")).toHaveText("Video ready");
    await sidebarA.getByTestId("name-input").fill("Mira");
    await sidebarA.getByTestId("emoji-input").fill("🪼");
    await sidebarA.getByTestId("create-party").click();
    await expect(sidebarA.getByTestId("connection-status")).toContainText("Connected");
    await expect
      .poll(() => sidePanelOptions(peerA, videoA))
      .toMatchObject({
        enabled: true,
        path: expect.stringContaining(`sidebar.html?tab=${await extensionTabId(peerA, videoA)}`),
      });
    const invite = (await sidebarA.getByTestId("invite-link").textContent()) ?? "";
    expect(invite).toContain("party=");
    expect(invite).toContain(encodeURIComponent(videoUrl));

    const joinPage = await peerB.context.newPage();
    await joinPage.goto(invite);
    const sidebarB = await openSidebar(peerB, joinPage);
    await expect(sidebarB.getByTestId("video-state")).toHaveText("No video found in this tab");
    await expect(joinPage.getByRole("button", { name: "Open video and join" })).toBeEnabled();
    await joinPage.getByRole("button", { name: "Open video and join" }).click();
    await joinPage.waitForURL(videoUrl);
    await expect(joinPage.locator("video")).toHaveJSProperty("readyState", 4);

    await expect(sidebarB.getByTestId("connection-status")).toContainText("Connected");
    await expect(sidebarA.getByTestId("peer")).toHaveCount(2);
    await expect(sidebarB.getByTestId("peer")).toHaveCount(2);

    const secondInvitePage = await peerA.context.newPage();
    await secondInvitePage.goto(invite);
    await secondInvitePage.getByRole("button", { name: "Open video and join" }).click();
    await expect(secondInvitePage.locator("#status")).toContainText("already in a party");
    await expect(sidebarB.getByTestId("peer")).toHaveCount(2);

    await sidebarB.getByTestId("chat-input").fill("Ready for movie night?");
    await sidebarB.getByTestId("send-chat").click();
    await expect(sidebarA.getByTestId("messages")).toContainText("Ready for movie night?");

    await sidebarA.close();
    await expect(sidebarB.getByTestId("peer")).toHaveCount(2);

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

    const unrelatedTab = await peerA.context.newPage();
    await unrelatedTab.goto("http://localhost:16333/frame-video.html");
    await expect
      .poll(() => sidePanelOptions(peerA, unrelatedTab))
      .toMatchObject({ enabled: false });
    const awaySidebar = await openSidebar(peerA, unrelatedTab);
    await expect(awaySidebar.getByTestId("away-view")).toContainText("Your party is still active");
    await expect(awaySidebar.getByTestId("away-view")).toContainText(
      "Jelly Party local video fixture",
    );
    await awaySidebar.getByTestId("return-to-party").click();
    await awaySidebar.close();

    sidebarA = await openSidebar(peerA, videoA);
    await expect(sidebarA.getByTestId("connection-status")).toContainText("Connected");
    await expect(sidebarA.getByTestId("messages")).toContainText("Ready for movie night?");

    const unrelatedPeerBTab = await peerB.context.newPage();
    await unrelatedPeerBTab.goto("http://localhost:16333/frame-video.html");
    const awaySidebarB = await openSidebar(peerB, unrelatedPeerBTab);
    await expect(awaySidebarB.getByTestId("away-view")).toBeVisible();
    await awaySidebarB.getByTestId("leave-party").click();
    await expect(sidebarA.getByTestId("peer")).toHaveCount(1);

    await videoA.close();
    await expect(sidebarA.getByTestId("setup-view")).toBeVisible();

    expect(await extensionTabId(peerA, unrelatedTab)).toBeGreaterThan(0);
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
