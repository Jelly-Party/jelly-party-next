import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, lazyPlugins } from "vite-plus";
import UnoCSS from "unocss/vite";
import webExtension from "vite-plugin-web-extension";
import { loadBuildEnvironment } from "../../config/build-environment";
import { createExtensionManifest } from "../../config/extension-manifest";
import { resolveBuildUrls } from "../../config/urls";

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
        manifest: () => createExtensionManifest(urls, { firefox: isFirefox, test: isTest }),
        disableAutoLaunch: Boolean(process.env.CI),
        watchFilePaths: ["../../config/extension-manifest.ts", "../../config/urls.ts"],
        additionalInputs: ["src/sidebar/sidebar.html", "src/content/video.ts"],
        transformManifest(manifest) {
          if (mode === "development" && manifest.manifest_version === 3) {
            // The dev server adds this permission after every input build. Remove its previous
            // injection so multi-input extension rebuilds keep a valid, duplicate-free manifest.
            manifest.host_permissions = manifest.host_permissions?.filter(
              (permission: string) => permission !== "http://localhost/*",
            );
          }
          return manifest;
        },
      }),
    ]),
  };
});
