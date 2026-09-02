/**
 * Captures the extension store assets from the website's /press page.
 *
 * Every frame is rendered by the components Jelly Party ships, so the listings cannot drift away
 * from the product. Run it through the Vite Task: `vp run assets:store`.
 *
 * Frames are captured at twice the size each store advertises, which is what the listings and any
 * other surface should show. Set JELLY_PRESS_SCALE=1 for exact-size files if a dashboard rejects
 * an upload for its dimensions.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Browser, chromium } from "@playwright/test";
import { pressShots } from "../packages/jelly-party-website/src/lib/press/shots.ts";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(repositoryRoot, "artifacts/press");
const pressUrl = `${process.env.JELLY_PRESS_URL ?? "http://127.0.0.1:16180"}/press`;
const scale = Number(process.env.JELLY_PRESS_SCALE ?? 2);
if (!Number.isInteger(scale) || scale < 1) {
  throw new Error(`JELLY_PRESS_SCALE must be a whole number of 1 or more, not ${scale}.`);
}

const widestShot = Math.max(...pressShots.map((shot) => shot.width));

const browser = await chromium.launch();
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await capture();

await browser.close();
console.log(`\n${pressShots.length} store assets written to artifacts/press/ at ${scale}× size.`);

async function capture(): Promise<void> {
  const page = await openPressPage(browser, scale);

  for (const shot of pressShots) {
    const frame = page.locator(`[data-press-shot="${shot.slug}"]`);
    const box = await frame.boundingBox();
    if (!box) throw new Error(`The /press page is missing a frame for ${shot.slug}.`);
    if (Math.round(box.width) !== shot.width || Math.round(box.height) !== shot.height) {
      throw new Error(
        `${shot.slug} renders at ${Math.round(box.width)}×${Math.round(box.height)}, but the store expects ${shot.width}×${shot.height}.`,
      );
    }

    // Nothing is resized after the fact: the browser rasterises straight to the delivered size.
    const image = await frame.screenshot({ animations: "disabled", scale: "device" });
    const expectedWidth = shot.width * scale;
    const expectedHeight = shot.height * scale;
    const written = pngSize(image);
    if (written.width !== expectedWidth || written.height !== expectedHeight) {
      throw new Error(
        `${shot.slug}.png came out ${written.width}×${written.height} instead of ${expectedWidth}×${expectedHeight}.`,
      );
    }

    await writeFile(join(outputDirectory, `${shot.slug}.png`), image);
    console.log(`${shot.slug}.png  ${expectedWidth}×${expectedHeight}  ${shot.usage}`);
  }

  await page.close();
}

async function openPressPage(instance: Browser, deviceScaleFactor: number) {
  const page = await instance.newPage({
    viewport: { width: widestShot + 160, height: 1000 },
    deviceScaleFactor,
    // Chat timestamps and the locale-formatted times in the sidebar must not depend on the machine
    // running the capture.
    locale: "en-US",
    timezoneId: "UTC",
    reducedMotion: "reduce",
  });

  // The task starts the website beside this script, so the first navigations can arrive too early.
  const startedWaiting = Date.now();
  for (;;) {
    const response = await page.goto(pressUrl, { waitUntil: "load" }).catch(() => null);
    if (response?.ok() === true) break;
    if (Date.now() - startedWaiting > 60_000) {
      await browser.close();
      throw new Error(`Could not load ${pressUrl} within 60 seconds.`);
    }
    await page.waitForTimeout(500);
  }

  // Transitions would otherwise decide what a screenshot catches.
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });

  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const stages = [...document.querySelectorAll("[data-press-media]")];
    return (
      stages.length > 0 &&
      stages.every((stage) => stage.getAttribute("data-press-media-ready") === "true")
    );
  });

  return page;
}

/** Reads the dimensions out of a PNG header, so a wrong-sized upload is caught here instead. */
function pngSize(image: Buffer): { width: number; height: number } {
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}
