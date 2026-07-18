import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, lazyPlugins } from "vite-plus";
import UnoCSS from "unocss/vite";
import { loadBuildEnvironment } from "../../config/build-environment";
import { resolveBuildUrls } from "../../config/urls";

export default defineConfig(({ mode }) => {
  const environment = loadBuildEnvironment(mode);
  const urls = resolveBuildUrls(environment);
  return {
    define: {
      __JELLY_CHROME_STORE_URL__: JSON.stringify(urls.chromeStore),
      __JELLY_EDGE_STORE_URL__: JSON.stringify(urls.edgeStore),
      __JELLY_FIREFOX_STORE_URL__: JSON.stringify(urls.firefoxStore),
      __JELLY_REPOSITORY_URL__: JSON.stringify(urls.repository),
      __JELLY_WEBSITE_URL__: JSON.stringify(urls.website),
    },
    plugins: lazyPlugins(() => [UnoCSS(), sveltekit()]),
  };
});
