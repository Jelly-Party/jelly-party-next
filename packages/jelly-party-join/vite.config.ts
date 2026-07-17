import { defineConfig } from "vite-plus";

export default defineConfig({
  root: "public",
  server: {
    port: 5180,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
