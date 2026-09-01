import type { BuildUrls } from "./urls";
import { joinUrl, toWebExtensionMatchPattern, toWebExtensionPagePattern } from "./urls";

export interface ExtensionManifestOptions {
  firefox: boolean;
  test: boolean;
}

export function createExtensionManifest(urls: BuildUrls, options: ExtensionManifestOptions) {
  const websiteMatch = toWebExtensionMatchPattern(urls.website);
  const joinMatch = toWebExtensionPagePattern(joinUrl(urls.website));
  const socket = new URL(urls.websocket);
  const permissions = ["activeTab", "storage", "scripting"];
  if (!options.firefox) permissions.push("sidePanel");

  const manifest = {
    name: "Jelly Party",
    version: "2.0.0",
    description: "Watch videos with your friends — in sync!",
    manifest_version: 3,
    permissions,
    host_permissions: options.test
      ? [...new Set([websiteMatch, "https://*/*", "http://*/*"])]
      : [websiteMatch],
    ...(!options.test && {
      optional_host_permissions: ["https://*/*", "http://*/*"],
    }),
    action: {
      default_icon: ICONS,
    },
    ...(!options.firefox && {
      side_panel: { default_path: "src/sidebar/sidebar.html" },
    }),
    background: options.firefox
      ? { scripts: ["src/background/index.ts"], type: "module" }
      : { service_worker: "src/background/index.ts", type: "module" },
    content_scripts: [
      {
        matches: [joinMatch],
        js: ["src/content/join.ts"],
        run_at: "document_start",
      },
    ],
    icons: ICONS,
    content_security_policy: {
      extension_pages: `script-src 'self'; object-src 'self'; connect-src 'self' ${socket.protocol}//${socket.host}`,
    },
    ...(options.firefox && {
      sidebar_action: { default_panel: "src/sidebar/sidebar.html" },
      commands: {
        _execute_sidebar_action: {
          suggested_key: { default: "Alt+Shift+J" },
        },
      },
      browser_specific_settings: {
        gecko: {
          // Must match the published AMO add-on GUID or the upload becomes a new
          // listing instead of an update for existing users.
          id: "{1bce6a35-61f2-4477-9899-842359eadcef}",
          strict_min_version: "140.0",
          data_collection_permissions: {
            required: [
              "browsingActivity",
              "personalCommunications",
              "personallyIdentifyingInfo",
              "websiteActivity",
            ],
          },
        },
      },
    }),
  };

  return manifest;
}

const ICONS = {
  "16": "16x16.png",
  "32": "32x32.png",
  "48": "48x48.png",
  "128": "128x128.png",
};
