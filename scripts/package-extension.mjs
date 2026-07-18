import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const root = process.cwd();
const extensionRoot = path.join(root, "packages/jelly-party-extension");
const artifacts = path.join(root, "artifacts");
const fixedDate = new Date("2000-01-01T00:00:00.000Z");

await rm(artifacts, { recursive: true, force: true });
await mkdir(artifacts, { recursive: true });

const chromiumDirectory = path.join(extensionRoot, "dist-chromium");
const firefoxDirectory = path.join(extensionRoot, "dist-firefox");
await validateManifest(chromiumDirectory, "chromium");
await validateManifest(firefoxDirectory, "firefox");

const chromiumArchive = await zipDirectory(chromiumDirectory);
const firefoxArchive = await zipDirectory(firefoxDirectory);
await writeFile(path.join(artifacts, "jelly-party-2.0.0-chrome.zip"), chromiumArchive);
await writeFile(path.join(artifacts, "jelly-party-2.0.0-edge.zip"), chromiumArchive);
await writeFile(path.join(artifacts, "jelly-party-2.0.0-firefox.zip"), firefoxArchive);

const sourceFiles = [
  "AGENTS.md",
  "README.md",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "vite.config.ts",
  "packages/jelly-party-extension/SOURCE-REVIEW.md",
  "packages/jelly-party-extension/manifest.json",
  "packages/jelly-party-extension/package.json",
  "packages/jelly-party-extension/tsconfig.json",
  "packages/jelly-party-extension/uno.config.ts",
  "packages/jelly-party-extension/vite.config.ts",
  ...(await filesBelow(path.join(extensionRoot, "src"))).map((file) => path.relative(root, file)),
  ...(await filesBelow(path.join(root, "packages/jelly-party-lib/src"))).map((file) =>
    path.relative(root, file),
  ),
];
await writeFile(
  path.join(artifacts, "jelly-party-2.0.0-firefox-source.zip"),
  await zipFiles(sourceFiles),
);

for (const filename of (await readdir(artifacts)).sort()) {
  const contents = await readFile(path.join(artifacts, filename));
  console.log(`${createHash("sha256").update(contents).digest("hex")}  ${filename}`);
}

async function validateManifest(directory, browser) {
  const manifest = JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
  if (
    manifest.name !== "Jelly Party" ||
    manifest.version !== "2.0.0" ||
    manifest.manifest_version !== 3
  ) {
    throw new Error(`${browser}: store identity/version changed unexpectedly`);
  }
  if (browser === "chromium") {
    if (
      manifest.side_panel?.default_path !== "src/sidebar/sidebar.html" ||
      manifest.sidebar_action
    ) {
      throw new Error("chromium: invalid side panel manifest");
    }
  } else if (
    manifest.sidebar_action?.default_panel !== "src/sidebar/sidebar.html" ||
    manifest.side_panel ||
    manifest.permissions?.includes("sidePanel") ||
    !manifest.browser_specific_settings?.gecko?.id
  ) {
    throw new Error("firefox: invalid sidebar manifest");
  }

  const scripts = (await filesBelow(directory)).filter((file) => file.endsWith(".js"));
  const builtCode = (await Promise.all(scripts.map((file) => readFile(file, "utf8")))).join("\n");
  if (!builtCode.includes("wss://v2.jelly-party.com") || builtCode.includes("ws.jelly-party.com")) {
    throw new Error(`${browser}: production WebSocket endpoint is invalid`);
  }
}

async function zipDirectory(directory) {
  const files = await filesBelow(directory);
  return zipEntries(files.map((file) => [path.relative(directory, file), file]));
}

async function zipFiles(files) {
  return zipEntries(files.sort().map((file) => [file, path.join(root, file)]));
}

async function zipEntries(entries) {
  const zip = new JSZip();
  for (const [name, file] of entries.sort(([left], [right]) => left.localeCompare(right))) {
    zip.file(name.replaceAll(path.sep, "/"), await readFile(file), {
      date: fixedDate,
      createFolders: false,
      unixPermissions: 0o100644,
    });
  }
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    platform: "UNIX",
  });
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? filesBelow(target) : [target];
    }),
  );
  return files.flat().sort();
}
