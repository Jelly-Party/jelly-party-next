import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(repositoryRoot, "packages/jelly-party-website/static/jelly-party.svg");
const outputDirectory = join(repositoryRoot, "packages/jelly-party-extension/icons");
const svg = await readFile(source, "utf8");
const browser = await chromium.launch();

try {
  for (const size of [16, 32, 48, 128]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body,svg{display:block;width:100%;height:100%;margin:0}</style>${svg}`,
    );
    const png = await page.screenshot({ omitBackground: true });
    await writeFile(join(outputDirectory, `${size}x${size}.png`), png);
    console.log(`${size}x${size}.png`);
    await page.close();
  }
} finally {
  await browser.close();
}
