import { defineConfig, lazyPlugins } from "vite-plus";
import UnoCSS from "unocss/vite";
import { loadBuildEnvironment } from "../../config/build-environment";
import { resolveBuildUrls } from "../../config/urls";

export default defineConfig(({ mode }) => {
  const environment = loadBuildEnvironment(mode);
  const urls = resolveBuildUrls(environment, { allowInsecureLocalhost: mode === "test" });
  return {
    root: "public",
    define: { __JELLY_WEBSITE_URL__: JSON.stringify(urls.website) },
    server: {
      port: 5180,
    },
    build: {
      outDir: "../dist",
      emptyOutDir: true,
    },
    plugins: lazyPlugins(() => [UnoCSS()]),
  };
});
