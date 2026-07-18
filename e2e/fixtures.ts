import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContext, type Page, chromium, test } from "@playwright/test";

const directory = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.join(directory, "..", "packages", "jelly-party-extension", "dist-test");

export interface ExtensionPeer {
  context: BrowserContext;
  extensionId: string;
  close(): Promise<void>;
}

export async function launchExtensionPeer(): Promise<ExtensionPeer> {
  const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "jelly-party-e2e-"));
  const context = await chromium.launchPersistentContext(userDataDirectory, {
    channel: "chromium",
    headless: process.env.JELLY_E2E_HEADED !== "1",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  return {
    context,
    extensionId,
    async close() {
      await context.close();
      fs.rmSync(userDataDirectory, { recursive: true, force: true });
    },
  };
}

export async function extensionTabId(peer: ExtensionPeer, page: Page): Promise<number> {
  const worker = peer.context.serviceWorkers()[0];
  const url = page.url();
  return worker.evaluate(async (pageUrl) => {
    const extension = globalThis as typeof globalThis & {
      chrome: { tabs: { query(query: object): Promise<Array<{ id?: number; url?: string }>> } };
    };
    const tabs = await extension.chrome.tabs.query({});
    const tab = tabs.find((candidate) => candidate.url === pageUrl);
    if (!tab?.id) throw new Error(`No extension tab for ${pageUrl}`);
    return tab.id;
  }, url);
}

export async function openSidebar(peer: ExtensionPeer, videoPage: Page): Promise<Page> {
  const tabId = await extensionTabId(peer, videoPage);
  const sidebar = await peer.context.newPage();
  await sidebar.goto(
    `chrome-extension://${peer.extensionId}/src/sidebar/sidebar.html?tab=${tabId}`,
  );
  return sidebar;
}

export { test };
export const expect = test.expect;
