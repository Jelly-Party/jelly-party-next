import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, lazyPlugins } from "vite-plus";
import UnoCSS from "unocss/vite";
import webExtension from "vite-plugin-web-extension";
import { loadBuildEnvironment } from "../../config/build-environment";
import { resolveBuildUrls, toWebExtensionMatchPattern } from "../../config/urls";

interface MutableManifest {
  permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  content_scripts?: Array<{ matches?: string[] }>;
  background?: { scripts?: string[]; service_worker?: string; type?: "module" };
  content_security_policy?: { extension_pages: string };
  side_panel?: { default_path: string };
  sidebar_action?: { default_panel: string };
  browser_specific_settings?: object;
  commands?: Record<string, object>;
}

export default defineConfig(({ mode }) => {
  const isTest = mode.endsWith("test");
  const isFirefox = mode.startsWith("firefox");
  const isDevelopment = mode === "development";
  const buildEnvironment = loadBuildEnvironment(mode);
  const environment = isDevelopment
    ? {
        ...buildEnvironment,
        VITE_JELLY_JOIN_URL: buildEnvironment.VITE_JELLY_JOIN_URL || "http://localhost:5180",
        VITE_JELLY_WS_URL: buildEnvironment.VITE_JELLY_WS_URL || "ws://localhost:8080",
      }
    : buildEnvironment;
  const urls = resolveBuildUrls(environment, {
    allowInsecureLocalhost: isTest || isDevelopment,
  });

  return {
    publicDir: "icons",
    server: { port: 5174, strictPort: true },
    build: {
      outDir: isFirefox
        ? isTest
          ? "dist-firefox-test"
          : "dist-firefox"
        : isTest
          ? "dist-test"
          : "dist-chromium",
      emptyOutDir: true,
    },
    define: {
      __JELLY_WS_URL__: JSON.stringify(urls.websocket),
      __JELLY_JOIN_URL__: JSON.stringify(urls.join),
      __JELLY_WEBSITE_URL__: JSON.stringify(urls.website),
    },
    plugins: lazyPlugins(() => [
      svelte(),
      UnoCSS(),
      webExtension({
        additionalInputs: ["src/sidebar/sidebar.html", "src/content/video.ts"],
        transformManifest(manifest) {
          const mutableManifest = manifest as unknown as MutableManifest;
          const socket = new URL(urls.websocket);
          const joinMatch = toWebExtensionMatchPattern(urls.join);
          mutableManifest.content_security_policy = {
            extension_pages: `script-src 'self'; object-src 'self'; connect-src 'self' ${socket.protocol}//${socket.host}`,
          };
          mutableManifest.host_permissions = mutableManifest.host_permissions?.map((permission) =>
            permission === DEFAULT_JOIN_MATCH ? joinMatch : permission,
          );
          for (const contentScript of mutableManifest.content_scripts || []) {
            contentScript.matches = contentScript.matches?.map((match) =>
              match === DEFAULT_JOIN_MATCH ? joinMatch : match,
            );
          }
          if (isFirefox) {
            delete mutableManifest.side_panel;
            mutableManifest.permissions = mutableManifest.permissions?.filter(
              (permission) => permission !== "sidePanel",
            );
            mutableManifest.sidebar_action = { default_panel: "src/sidebar/sidebar.html" };
            mutableManifest.commands = {
              _execute_sidebar_action: {
                suggested_key: { default: "Alt+Shift+J" },
              },
            };
            mutableManifest.background = { scripts: ["src/background/index.js"], type: "module" };
            mutableManifest.browser_specific_settings = {
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
            };
          }
          // For test mode: convert optional_host_permissions to host_permissions
          // This pre-grants permissions so script injection works without user gesture
          if (isTest && mutableManifest.optional_host_permissions) {
            mutableManifest.host_permissions = [
              ...new Set([
                ...(mutableManifest.host_permissions ?? []),
                ...mutableManifest.optional_host_permissions,
                joinMatch,
              ]),
            ];
            delete mutableManifest.optional_host_permissions;
          }

          return manifest;
        },
      }),
    ]),
  };
});

const DEFAULT_JOIN_MATCH = "https://join.jelly-party.com/*";
