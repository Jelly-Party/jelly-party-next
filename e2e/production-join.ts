/**
 * Guards the store build's join flow, which the Playwright suite cannot see: its
 * test manifest pre-grants every origin, so it never exercises the optional
 * host permission that real users hit on first join.
 *
 * Runs against the deployed join site and the production extension build.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const directory = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.join(directory, "..", "artifacts", "chrome");
const joinUrl = process.env.JELLY_PARTY_JOIN_URL ?? "https://v2-join.jelly-party.com";
const destination = "https://example.com/watch";
// Matches PARTY_ID_LENGTH in the protocol; a shorter id makes the invite unparseable.
const partyId = "ProductionSmokeTest".padEnd(22, "0");
const invite = `${joinUrl.replace(/\/$/, "")}/#${partyId}@${destination.slice("https://".length)}`;

const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "jelly-party-production-"));
const context = await chromium.launchPersistentContext(userDataDirectory, {
  channel: "chromium",
  headless: process.env.JELLY_E2E_HEADED !== "1",
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

try {
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker");
  // A permission request from the worker always fails: it has no user gesture.
  await worker.evaluate(() => {
    const extension = globalThis as typeof globalThis & {
      chrome: { permissions: { request(options: object): Promise<boolean> } };
      __requestedFromWorker: boolean;
    };
    extension.__requestedFromWorker = false;
    const original = extension.chrome.permissions.request.bind(extension.chrome.permissions);
    extension.chrome.permissions.request = (options: object) => {
      extension.__requestedFromWorker = true;
      return original(options);
    };
  });

  const page = await context.newPage();
  const pagesBeforeGrant = context.pages().length;
  await page.goto(invite, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/src\/grant\/grant\.html\?/, { timeout: 20000 });

  // Installed users hand off automatically in the invite tab. The one button
  // they click belongs to the extension and can open browser-gated UI.
  const grant = page;
  assert.equal(context.pages().length, pagesBeforeGrant, "The grant flow opened another window");
  assert.match(
    (await grant.locator("#description").textContent()) ?? "",
    /example\.com/,
    "The grant page did not name the destination",
  );

  // The whole point of this page: its click must still count as a user gesture.
  await grant.evaluate(() => {
    const extension = globalThis as typeof globalThis & {
      chrome: { permissions: { request(options: object): Promise<boolean> } };
      __grantTrace: string[];
    };
    extension.__grantTrace = [];
    const original = extension.chrome.permissions.request.bind(extension.chrome.permissions);
    extension.chrome.permissions.request = (options: object) => {
      extension.__grantTrace.push("called");
      return original(options).then(
        (result: boolean) => {
          extension.__grantTrace.push(`resolved:${result}`);
          return result;
        },
        (error: unknown) => {
          extension.__grantTrace.push(`rejected:${String(error)}`);
          throw error;
        },
      );
    };
  });
  await grant.locator("#allow").click();
  await grant.waitForTimeout(3000);

  // The browser now shows its own permission dialog, so the request stays pending;
  // a lost gesture would instead have rejected immediately.
  const grantTrace = await grant.evaluate(
    () => (globalThis as typeof globalThis & { __grantTrace: string[] }).__grantTrace,
  );
  assert.ok(grantTrace.includes("called"), "The grant button did not reach permissions.request()");
  assert.ok(
    !grantTrace.some((entry) => entry.includes("user gesture")),
    `The grant page lost the click's user gesture: ${grantTrace.join(", ")}`,
  );

  assert.equal(
    await worker.evaluate(
      () =>
        (globalThis as typeof globalThis & { __requestedFromWorker: boolean })
          .__requestedFromWorker,
    ),
    false,
    "The worker requested a permission it cannot be granted",
  );

  console.log("production join hand-off verified");
} finally {
  await context.close();
  fs.rmSync(userDataDirectory, { recursive: true, force: true });
}
