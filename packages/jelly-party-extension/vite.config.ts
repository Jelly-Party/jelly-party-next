import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, lazyPlugins } from "vite-plus";
import UnoCSS from "unocss/vite";
import webExtension from "vite-plugin-web-extension";

interface MutableManifest {
  permissions?: string[];
  host_permissions?: string[];
  optional_host_permissions?: string[];
  content_scripts?: Array<{ matches?: string[] }>;
  background?: { scripts?: string[]; service_worker?: string; type?: "module" };
  side_panel?: { default_path: string };
  sidebar_action?: { default_panel: string };
  browser_specific_settings?: object;
}

export default defineConfig(({ mode }) => {
  const isTest = mode === "test";
  const isProd = mode === "production";
  const isFirefox = mode === "firefox";

  // URL configuration based on mode
  const wsUrl = isProd || isFirefox ? "wss://v2.jelly-party.com" : "ws://localhost:8080";
  const joinUrl = isProd || isFirefox ? "https://join.jelly-party.com" : "http://localhost:5180";
  const websiteUrl = "https://www.jelly-party.com";
  const configuredJoinUrl = process.env.VITE_JELLY_JOIN_URL || joinUrl;

  return {
    publicDir: "icons",
    server: { port: 5174, strictPort: true },
    build: {
      outDir: isTest ? "dist-test" : isFirefox ? "dist-firefox" : "dist-chromium",
      emptyOutDir: true,
    },
    define: {
      __JELLY_WS_URL__: JSON.stringify(process.env.VITE_JELLY_WS_URL || wsUrl),
      __JELLY_JOIN_URL__: JSON.stringify(configuredJoinUrl),
      __JELLY_WEBSITE_URL__: JSON.stringify(process.env.VITE_JELLY_WEBSITE_URL || websiteUrl),
    },
    plugins: lazyPlugins(() => [
      svelte(),
      UnoCSS(),
      webExtension({
        additionalInputs: ["src/sidebar/sidebar.html", "src/content/video.ts"],
        transformManifest(manifest) {
          const mutableManifest = manifest as unknown as MutableManifest;
          if (isFirefox) {
            delete mutableManifest.side_panel;
            mutableManifest.permissions = mutableManifest.permissions?.filter(
              (permission) => permission !== "sidePanel",
            );
            mutableManifest.sidebar_action = { default_panel: "src/sidebar/sidebar.html" };
            mutableManifest.background = { scripts: ["src/background/index.js"], type: "module" };
            mutableManifest.browser_specific_settings = {
              gecko: { id: "jelly-party@jelly-party.com", strict_min_version: "121.0" },
            };
          }
          // For test mode: convert optional_host_permissions to host_permissions
          // This pre-grants permissions so script injection works without user gesture
          if (isTest && mutableManifest.optional_host_permissions) {
            mutableManifest.host_permissions = [
              ...(mutableManifest.host_permissions ?? []),
              ...mutableManifest.optional_host_permissions,
              `${configuredJoinUrl}/*`,
            ];
            delete mutableManifest.optional_host_permissions;
          }

          if (isTest) {
            for (const contentScript of mutableManifest.content_scripts || []) {
              contentScript.matches = contentScript.matches?.map((match) =>
                match === "http://localhost:5180/*" ? `${configuredJoinUrl}/*` : match,
              );
            }
          }

          return manifest;
        },
      }),
    ]),
  };
});
