import type { BuildUrls } from "./urls";
import { toWebExtensionMatchPattern } from "./urls";

export interface ExtensionManifestOptions {
  firefox: boolean;
  test: boolean;
}

export function createExtensionManifest(urls: BuildUrls, options: ExtensionManifestOptions) {
  const joinMatch = toWebExtensionMatchPattern(urls.join);
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
      ? [...new Set([joinMatch, "https://*/*", "http://*/*"])]
      : [joinMatch],
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
          id: "jelly-party@jelly-party.com",
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
