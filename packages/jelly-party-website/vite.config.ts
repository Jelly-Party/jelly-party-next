import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, lazyPlugins } from "vite-plus";
import UnoCSS from "unocss/vite";

export default defineConfig({
  plugins: lazyPlugins(() => [UnoCSS(), sveltekit()]),
});
