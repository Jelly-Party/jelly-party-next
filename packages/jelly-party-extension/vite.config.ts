import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, lazyPlugins } from "vite-plus";
import UnoCSS from "unocss/vite";
import webExtension from "vite-plugin-web-extension";
import { loadBuildEnvironment } from "../../config/build-environment";
import { createExtensionManifest } from "../../config/extension-manifest";
import { joinUrl, resolveBuildUrls } from "../../config/urls";

const DEVELOPMENT_START_URL = "https://video.blender.org/w/dmhvQNzwBnrWy1iYzVv5g7";

export default defineConfig(({ mode }) => {
  const isTest = mode.endsWith("test");
  const isFirefox = mode.startsWith("firefox");
  const isDevelopment = mode.endsWith("development");
  const browser = isFirefox ? "firefox" : "chrome";
  const developmentPort = isFirefox ? 5182 : 5181;
  const buildEnvironment = loadBuildEnvironment(mode);
  const developmentWebsite =
    buildEnvironment.VITE_JELLY_WEBSITE_URL ||
    (isDevelopment ? "http://127.0.0.1:5180" : undefined);
  const environment = {
    ...buildEnvironment,
    ...(developmentWebsite && { VITE_JELLY_WEBSITE_URL: developmentWebsite }),
    ...((isDevelopment || isTest) &&
      developmentWebsite && {
        VITE_JELLY_JOIN_URL: buildEnvironment.VITE_JELLY_JOIN_URL || joinUrl(developmentWebsite),
      }),
    ...(isDevelopment && {
      VITE_JELLY_WS_URL: buildEnvironment.VITE_JELLY_WS_URL || "ws://localhost:8080",
    }),
  };
  const urls = resolveBuildUrls(environment, {
    allowInsecureLocalhost: isTest || isDevelopment,
  });

  return {
    publicDir: "icons",
    run: {
      tasks: {
        dev: {
          command:
            'vp exec concurrently --kill-others "vp dev --mode development --port 5181 --strictPort" "vp dev --mode firefox-development --port 5182 --strictPort" --names "chrome,firefox" --prefix-colors "magenta,cyan"',
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
      __JELLY_JOIN_URL__: JSON.stringify(urls.join),
      __JELLY_WEBSITE_URL__: JSON.stringify(urls.website),
    },
    plugins: lazyPlugins(() => [
      svelte(),
      UnoCSS(),
      webExtension({
        manifest: () => createExtensionManifest(urls, { firefox: isFirefox, test: isTest }),
        browser,
        disableAutoLaunch: !isDevelopment,
        ...(isDevelopment && {
          webExtConfig: {
            target: isFirefox ? "firefox-desktop" : "chromium",
            startUrl: DEVELOPMENT_START_URL,
            ...(process.env.JELLY_DEV_HEADLESS === "1" && {
              args: [isFirefox ? "-headless" : "--headless=new"],
            }),
            ...(isFirefox
              ? { firefoxBinary: process.env.FIREFOX_BIN }
              : { chromiumBinary: process.env.CHROME_PATH }),
          },
        }),
        watchFilePaths: ["../../config/extension-manifest.ts", "../../config/urls.ts"],
        additionalInputs: [
          "src/sidebar/sidebar.html",
          "src/grant/grant.html",
          "src/content/video.ts",
        ],
      }),
      {
        name: "jelly-party:development-server-origin",
        enforce: "post",
        config: () =>
          isDevelopment
            ? { server: { origin: `http://localhost:${developmentPort}` } }
            : undefined,
      },
    ]),
  };
});
