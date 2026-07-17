import tailwindcss from "@tailwindcss/vite";
import { defineConfig, lazyPlugins } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  run: {
    tasks: {
      dev: {
        command: "vp exec node .dev/dev.js",
        cache: false,
      },
      "dev:all": {
        command:
          'vp run jelly-party-lib#build && mkdir -p .dev && vp exec concurrently --kill-others "vp run dev:logs" "vp run jelly-party-server#dev" "vp run jelly-party-join#dev" "vp run jelly-party-extension#dev" "vp run jelly-party-website#dev" --names "logs,server,join,ext,web" --prefix-colors "yellow,blue,green,magenta,cyan" | tee .dev/dev.log',
        cache: false,
      },
      "dev:logs": {
        command: "vp exec node .dev/log-streamer.js",
        cache: false,
      },
      "dev:services": {
        command:
          'vp exec concurrently --kill-others "vp run jelly-party-server#dev" "vp run jelly-party-join#dev" --names "server,join" --prefix-colors "blue,green"',
        cache: false,
      },
      "test:services": {
        command:
          'vp exec concurrently --kill-others "LOG_STREAMER_PORT=16300 vp run dev:logs" "PORT=16080 METRICS_PORT=16090 vp run jelly-party-server#dev" "vp run test:join" --names "logs,server,join" --prefix-colors "yellow,blue,green"',
        cache: false,
      },
      "test:join": {
        command: "vp dev --port 16180 --strictPort",
        cwd: "packages/jelly-party-join",
        cache: false,
      },
      "dev:extension": {
        command: "vp run jelly-party-extension#dev",
        cache: false,
      },
      "dev:extension:firefox": {
        command: "vp dev --mode development -- --browser firefox",
        cache: false,
        cwd: "packages/jelly-party-extension",
      },
      "dev:server": {
        command: "vp run jelly-party-server#dev",
        cache: false,
      },
      "dev:website": {
        command: "vp run jelly-party-website#dev",
        cache: false,
      },
      "build:all": 'vp run --filter "./packages/*" --filter "!jelly-party-status" build',
      "test:all": {
        command: ["vp test --run", "vp run test:e2e"],
        cache: false,
      },
      "test:e2e": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_JOIN_URL=http://localhost:16180 VITE_JELLY_LOG_URL=ws://localhost:16300 vp run jelly-party-extension#build:test",
          "vp exec playwright test",
        ],
        cache: false,
      },
      "test:e2e:ui": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_JOIN_URL=http://localhost:16180 VITE_JELLY_LOG_URL=ws://localhost:16300 vp run jelly-party-extension#build:test",
          "vp exec playwright test --ui",
        ],
        cache: false,
      },
      "test:e2e:headed": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_JOIN_URL=http://localhost:16180 VITE_JELLY_LOG_URL=ws://localhost:16300 vp run jelly-party-extension#build:test",
          "JELLY_E2E_HEADED=1 vp exec playwright test --headed",
        ],
        cache: false,
      },
      stop: {
        command: "vp exec node .dev/stop.js",
        cache: false,
      },
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: lazyPlugins(() => [tailwindcss(), sveltekit()]),

  test: {
    expect: { requireAssertions: true },

    projects: [
      {
        extends: "./vite.config.ts",

        test: {
          name: "client",

          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium", headless: true }],
          },

          include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          exclude: ["src/lib/server/**"],
        },
      },

      {
        extends: "./vite.config.ts",

        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.{test,spec}.{js,ts}"],
          exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
        },
      },
    ],
  },
});
