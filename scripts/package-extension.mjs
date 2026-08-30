import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const FIREFOX_ADDON_GUID = "{1bce6a35-61f2-4477-9899-842359eadcef}";

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
  ".env.example",
  "AGENTS.md",
  "README.md",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".envrc",
  "flake.nix",
  "flake.lock",
  "vite.config.ts",
  "config/build-environment.ts",
  "config/extension-manifest.test.ts",
  "config/extension-manifest.ts",
  "config/urls.ts",
  "config/urls.test.ts",
  "scripts/package-extension.mjs",
  "packages/jelly-party-extension/SOURCE-REVIEW.md",
  "packages/jelly-party-extension/package.json",
  "packages/jelly-party-extension/tsconfig.json",
  "packages/jelly-party-extension/uno.config.ts",
  "packages/jelly-party-extension/vite.config.ts",
  "packages/jelly-party-lib/package.json",
  "packages/jelly-party-lib/tsconfig.json",
  ...(await filesBelow(path.join(extensionRoot, "src"))).map((file) => path.relative(root, file)),
  ...(await filesBelow(path.join(extensionRoot, "icons"))).map((file) => path.relative(root, file)),
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
    manifest.browser_specific_settings?.gecko?.id !== FIREFOX_ADDON_GUID ||
    manifest.browser_specific_settings.gecko.strict_min_version !== "140.0" ||
    manifest.browser_specific_settings.gecko.data_collection_permissions?.required?.length !== 4
  ) {
    throw new Error("firefox: invalid sidebar manifest");
  }

  // The grant page is opened by URL, so no manifest entry would catch its loss.
  const referencedFiles = [
    "src/grant/grant.html",
    manifest.side_panel?.default_path,
    manifest.sidebar_action?.default_panel,
    manifest.background?.service_worker,
    ...(manifest.background?.scripts ?? []),
    ...(manifest.content_scripts ?? []).flatMap((contentScript) => contentScript.js ?? []),
    ...Object.values(manifest.icons ?? {}),
  ].filter(Boolean);
  for (const referencedFile of referencedFiles) {
    await readFile(path.join(directory, referencedFile)).catch(() => {
      throw new Error(`${browser}: manifest references missing file ${referencedFile}`);
    });
  }

  const scripts = (await filesBelow(directory)).filter((file) => file.endsWith(".js"));
  const builtCode = (await Promise.all(scripts.map((file) => readFile(file, "utf8")))).join("\n");
  if (!/wss:\/\/[^"'`\s]+/.test(builtCode) || /ws:\/\/localhost/.test(builtCode)) {
    throw new Error(`${browser}: production build does not contain a secure WebSocket endpoint`);
  }

  const manifestText = JSON.stringify(manifest);
  if (/localhost|127\.0\.0\.1/.test(manifestText)) {
    throw new Error(`${browser}: production manifest contains a local development origin`);
  }
  if (
    !manifest.content_security_policy?.extension_pages?.includes("script-src 'self'") ||
    /script-src[^;]*https?:/.test(manifest.content_security_policy.extension_pages)
  ) {
    throw new Error(`${browser}: extension pages do not enforce a local-only script policy`);
  }

  const joinMatches = (manifest.content_scripts ?? []).flatMap(
    (contentScript) => contentScript.matches ?? [],
  );
  if (joinMatches.length !== 1 || !joinMatches[0].startsWith("https://")) {
    throw new Error(`${browser}: join content script must match one secure configured origin`);
  }

  await validateNoRemoteExecutableContent(directory, browser);
}

async function validateNoRemoteExecutableContent(directory, browser) {
  const files = await filesBelow(directory);
  const checks = [
    {
      extensions: [".html"],
      pattern: /<(?:script|link)\b[^>]*(?:src|href)=["']https?:\/\//i,
      description: "remote script or stylesheet",
    },
    {
      extensions: [".css"],
      pattern: /(?:@import|url\()\s*["']?https?:\/\//i,
      description: "remote stylesheet resource",
    },
    {
      extensions: [".js"],
      pattern: /(?:importScripts|import)\s*\(\s*["'`]https?:\/\//,
      description: "remote executable import",
    },
    {
      extensions: [".js"],
      pattern: /\beval\s*\(|\bnew\s+Function\s*\(/,
      description: "runtime-generated code",
    },
  ];

  for (const file of files) {
    const extension = path.extname(file);
    for (const check of checks) {
      if (!check.extensions.includes(extension)) continue;
      const contents = await readFile(file, "utf8");
      if (check.pattern.test(contents)) {
        throw new Error(
          `${browser}: ${check.description} found in ${path.relative(directory, file)}`,
        );
      }
    }
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
