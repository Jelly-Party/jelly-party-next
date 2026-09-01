import { readFileSync } from "node:fs";
import { parse } from "jsonc-parser";
import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_BUILD_URLS,
  joinUrl,
  resolveBuildUrls,
  toWebExtensionMatchPattern,
  toWebExtensionPagePattern,
} from "./urls";

describe("build URL configuration", () => {
  it("provides the production endpoints and public project links by default", () => {
    expect(resolveBuildUrls({})).toEqual(DEFAULT_BUILD_URLS);
  });

  it("accepts explicit build-time overrides for every public URL", () => {
    expect(
      resolveBuildUrls({
        VITE_JELLY_WEBSITE_URL: "https://site.example",
        VITE_JELLY_JOIN_URL: "https://join.example/invite",
        VITE_JELLY_WS_URL: "wss://socket.example/ws",
        VITE_JELLY_REPOSITORY_URL: "https://code.example/jelly-party",
        VITE_JELLY_CHROME_STORE_URL: "https://store.example/chrome",
        VITE_JELLY_EDGE_STORE_URL: "https://store.example/edge",
        VITE_JELLY_FIREFOX_STORE_URL: "https://store.example/firefox",
      }),
    ).toEqual({
      website: "https://site.example",
      join: "https://join.example/invite",
      websocket: "wss://socket.example/ws",
      repository: "https://code.example/jelly-party",
      chromeStore: "https://store.example/chrome",
      edgeStore: "https://store.example/edge",
      firefoxStore: "https://store.example/firefox",
    });
  });

  it("rejects unsafe production schemes and URL credentials", () => {
    expect(() => resolveBuildUrls({ VITE_JELLY_WEBSITE_URL: "http://site.example" })).toThrow(
      "VITE_JELLY_WEBSITE_URL",
    );
    expect(() => resolveBuildUrls({ VITE_JELLY_WS_URL: "ws://socket.example" })).toThrow(
      "VITE_JELLY_WS_URL",
    );
    expect(() =>
      resolveBuildUrls({ VITE_JELLY_WEBSITE_URL: "https://user:secret@site.example" }),
    ).toThrow("VITE_JELLY_WEBSITE_URL");
  });

  it("allows local HTTP and WebSocket endpoints only when explicitly enabled for tests", () => {
    expect(
      resolveBuildUrls(
        {
          VITE_JELLY_WEBSITE_URL: "http://localhost:16180",
          VITE_JELLY_JOIN_URL: "http://localhost:16180/join",
          VITE_JELLY_WS_URL: "ws://localhost:16080",
        },
        { allowInsecureLocalhost: true },
      ),
    ).toMatchObject({
      website: "http://localhost:16180",
      join: "http://localhost:16180/join",
      websocket: "ws://localhost:16080",
    });
  });

  it("converts configured origins to portable extension match patterns without ports", () => {
    expect(toWebExtensionMatchPattern("http://localhost:16180")).toBe("http://localhost/*");
    expect(toWebExtensionMatchPattern("https://join.example/path")).toBe("https://join.example/*");
  });

  it("derives the invite route and its exact extension page pattern from the website", () => {
    expect(joinUrl("https://www.example.com")).toBe("https://www.example.com/join");
    expect(toWebExtensionPagePattern("https://www.example.com/join")).toBe(
      "https://www.example.com/join*",
    );
  });

  it("keeps every production service endpoint on a route deployed by Wrangler", () => {
    const wrangler = parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8")) as {
      routes?: Array<{ pattern?: string; zone_name?: string }>;
    };
    const routes = new Set(
      (wrangler.routes ?? []).map((route) => `${route.pattern}|${route.zone_name}`),
    );

    expect(DEFAULT_BUILD_URLS).toMatchObject({
      website: "https://jelly-party.com",
      join: "https://join.jelly-party.com/join",
      websocket: "wss://meet.jelly-party.com",
    });
    for (const endpoint of [
      DEFAULT_BUILD_URLS.website,
      DEFAULT_BUILD_URLS.join,
      DEFAULT_BUILD_URLS.websocket,
    ]) {
      expect(routes).toContain(`${new URL(endpoint).hostname}/*|jelly-party.com`);
    }
  });
});
