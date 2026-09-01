import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, lazyPlugins } from "vite-plus";
import UnoCSS from "unocss/vite";
import webExtension from "vite-plugin-web-extension";
import { loadBuildEnvironment } from "../../config/build-environment";
import { createExtensionManifest } from "../../config/extension-manifest";
import { joinUrl, resolveBuildUrls } from "../../config/urls";

export default defineConfig(({ mode }) => {
  const isTest = mode.endsWith("test");
  const isFirefox = mode.startsWith("firefox");
  const isDevelopment = mode.endsWith("development");
  const browser = isFirefox ? "firefox" : "chrome";
  const buildEnvironment = loadBuildEnvironment(mode);
  const environment = isDevelopment
    ? {
        ...buildEnvironment,
        VITE_JELLY_WEBSITE_URL: buildEnvironment.VITE_JELLY_WEBSITE_URL || "http://localhost:5180",
        VITE_JELLY_WS_URL: buildEnvironment.VITE_JELLY_WS_URL || "ws://localhost:8080",
      }
    : buildEnvironment;
  const urls = resolveBuildUrls(environment, {
    allowInsecureLocalhost: isTest || isDevelopment,
  });

  return {
    publicDir: "icons",
    run: {
      tasks: {
        dev: {
          command:
            'vp exec concurrently --kill-others "vp build --watch --mode development" "vp build --watch --mode firefox-development" --names "chrome,firefox" --prefix-colors "magenta,cyan"',
          cache: false,
        },
        build: {
          command: ["vp build --mode production", "vp build --mode firefox"],
          cache: false,
        },
        "build:test": {
          command: "vp build --mode test",
          cache: false,
        },
        "build:test:firefox": {
          command: "vp build --mode firefox-test",
          cache: false,
        },
      },
    },
    build: {
      outDir: isTest
        ? isFirefox
          ? "dist-firefox-test"
          : "dist-test"
        : isDevelopment
          ? `../../latest/dev/${browser}`
          : `../../artifacts/${browser}`,
      emptyOutDir: true,
    },
    define: {
      __JELLY_WS_URL__: JSON.stringify(urls.websocket),
      __JELLY_JOIN_URL__: JSON.stringify(joinUrl(urls.website)),
      __JELLY_WEBSITE_URL__: JSON.stringify(urls.website),
    },
    plugins: lazyPlugins(() => [
      svelte(),
      UnoCSS(),
      webExtension({
        manifest: () => createExtensionManifest(urls, { firefox: isFirefox, test: isTest }),
        disableAutoLaunch: true,
        watchFilePaths: ["../../config/extension-manifest.ts", "../../config/urls.ts"],
        additionalInputs: [
          "src/sidebar/sidebar.html",
          "src/grant/grant.html",
          "src/content/video.ts",
        ],
      }),
    ]),
  };
});
