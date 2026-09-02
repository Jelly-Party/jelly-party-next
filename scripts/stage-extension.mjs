import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import webExt from "web-ext-run";
import { RELEASE_VERSION } from "../config/release.ts";

const repositoryRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const startUrl = "https://video.blender.org/w/dmhvQNzwBnrWy1iYzVv5g7";
const macosChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const macosFirefox = "/Applications/Firefox.app/Contents/MacOS/firefox";
const headless = process.env.JELLY_STAGE_HEADLESS === "1";

const chromiumBinary = findBrowser("Chrome", [
  process.env.CHROME_PATH,
  ...(process.platform === "darwin" ? [macosChrome] : []),
]);
const firefoxBinary = findBrowser("Firefox", [
  process.env.FIREFOX_BIN,
  ...(process.platform === "darwin" ? [macosFirefox] : []),
]);

console.log(`Opening Jelly Party ${RELEASE_VERSION} store builds against production.`);

const runners = await Promise.all([
  webExt.cmd.run({
    target: ["chromium"],
    sourceDir: path.join(repositoryRoot, "artifacts/chrome"),
    chromiumBinary,
    startUrl,
    ...(headless && { args: ["--headless=new"] }),
    noInput: true,
    noReload: true,
  }),
  webExt.cmd.run({
    target: ["firefox-desktop"],
    sourceDir: path.join(repositoryRoot, "artifacts/firefox"),
    firefox: firefoxBinary,
    startUrl,
    ...(headless && { args: ["-headless"] }),
    noInput: true,
    noReload: true,
  }),
]);

console.log("Chrome and Firefox are using fresh temporary profiles. Close them to finish staging.");
await Promise.all(
  runners.map(
    (runner) =>
      new Promise((resolve) => {
        runner.registerCleanup(resolve);
      }),
  ),
);

function findBrowser(name, candidates) {
  const binary = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!binary) {
    throw new Error(
      `${name} was not found. Set ${name === "Chrome" ? "CHROME_PATH" : "FIREFOX_BIN"} to its executable.`,
    );
  }
  return binary;
}
