import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      dev: {
        command: [
          "vp run jelly-party-lib#build",
          'vp exec concurrently --kill-others "vp run jelly-party-server#dev" "vp run jelly-party-join#dev" "vp run jelly-party-extension#dev" "vp run jelly-party-website#dev" --names "server,join,ext,web" --prefix-colors "blue,green,magenta,cyan"',
        ],
        cache: false,
      },
      "dev:services": {
        command:
          'vp exec concurrently --kill-others "vp run jelly-party-server#dev" "vp run jelly-party-join#dev" --names "server,join" --prefix-colors "blue,green"',
        cache: false,
      },
      "test:services": {
        command:
          'vp exec concurrently --kill-others "PORT=16080 vp run test:server" "vp run test:join" --names "server,join" --prefix-colors "blue,green"',
        cache: false,
      },
      "test:server": {
        command: [
          "vp run jelly-party-lib#build",
          "vp exec wrangler dev --config wrangler.jsonc --local --port 16080",
        ],
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
      "dev:server": {
        command: "vp run jelly-party-server#dev",
        cache: false,
      },
      "dev:website": {
        command: "vp run jelly-party-website#dev",
        cache: false,
      },
      "build:artifacts": {
        command: [
          "vp run jelly-party-extension#build",
          "vp run jelly-party-extension#build:firefox",
          "vp exec node scripts/package-extension.mjs",
        ],
        cache: false,
      },
      "build:all": {
        command: ['vp run --filter "./packages/*" build', "vp run build:artifacts"],
        cache: false,
      },
      "test:all": {
        command: ["vp test --run", "vp run test:e2e", "vp run test:e2e:firefox"],
        cache: false,
      },
      "test:e2e": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_JOIN_URL=http://localhost:16180 vp run jelly-party-extension#build:test",
          "vp exec playwright test",
        ],
        cache: false,
      },
      "test:e2e:production": {
        command: ["vp run jelly-party-extension#build", "vp exec node e2e/production-join.ts"],
        cache: false,
      },
      "test:e2e:staging": {
        command: [
          'VITE_JELLY_WS_URL="$JELLY_PARTY_STAGING_WS_URL" VITE_JELLY_JOIN_URL=http://localhost:16180 vp run jelly-party-extension#build:test',
          "vp exec playwright test",
        ],
        cache: false,
      },
      "test:e2e:firefox": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_JOIN_URL=http://localhost:16180 vp run jelly-party-extension#build:test:firefox",
          'vp exec concurrently --kill-others --success first "vp run test:services" "vp dev e2e/fixtures --port 16334 --strictPort" "vp exec node e2e/firefox-extension.ts"',
        ],
        cache: false,
      },
      "test:e2e:ui": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_JOIN_URL=http://localhost:16180 vp run jelly-party-extension#build:test",
          "vp exec playwright test --ui",
        ],
        cache: false,
      },
      "test:e2e:headed": {
        command: [
          "VITE_JELLY_WS_URL=ws://localhost:16080 VITE_JELLY_JOIN_URL=http://localhost:16180 vp run jelly-party-extension#build:test",
          "JELLY_E2E_HEADED=1 vp exec playwright test --headed",
        ],
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
  test: {
    expect: { requireAssertions: true },
    environment: "node",
    include: [
      "config/**/*.{test,spec}.ts",
      "packages/jelly-party-lib/src/**/*.{test,spec}.ts",
      "packages/jelly-party-extension/src/**/*.{test,spec}.ts",
    ],
  },
});
