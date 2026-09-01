import { describe, expect, it } from "vite-plus/test";
import { createExtensionManifest } from "./extension-manifest";
import {
  DEFAULT_BUILD_URLS,
  joinUrl,
  resolveBuildUrls,
  toWebExtensionMatchPattern,
  toWebExtensionPagePattern,
} from "./urls";

describe("extension manifest configuration", () => {
  it("propagates the configured production endpoints into Chromium", () => {
    const urls = resolveBuildUrls({
      VITE_JELLY_WEBSITE_URL: "https://invites.example",
      VITE_JELLY_WS_URL: "wss://relay.example/socket",
    });
    const manifest = createExtensionManifest(urls, { firefox: false, test: false });

    expect(manifest.host_permissions).toEqual(["https://invites.example/*"]);
    expect(manifest.content_scripts[0]?.matches).toEqual(["https://invites.example/join*"]);
    expect(manifest.content_security_policy.extension_pages).toContain(
      "connect-src 'self' wss://relay.example",
    );
    expect(manifest.permissions).toContain("sidePanel");
    expect(manifest).toHaveProperty("side_panel.default_path", "src/sidebar/sidebar.html");
  });

  it("uses the single centralized defaults for Firefox production builds", () => {
    const manifest = createExtensionManifest(DEFAULT_BUILD_URLS, {
      firefox: true,
      test: false,
    });
    const websiteMatch = toWebExtensionMatchPattern(DEFAULT_BUILD_URLS.website);
    const joinMatch = toWebExtensionPagePattern(joinUrl(DEFAULT_BUILD_URLS.website));
    const socket = new URL(DEFAULT_BUILD_URLS.websocket);

    expect(manifest.host_permissions).toEqual([websiteMatch]);
    expect(manifest.content_scripts[0]?.matches).toEqual([joinMatch]);
    expect(manifest.content_security_policy.extension_pages).toContain(
      `connect-src 'self' ${socket.protocol}//${socket.host}`,
    );
    expect(manifest.permissions).not.toContain("sidePanel");
    expect(manifest).toHaveProperty("sidebar_action.default_panel", "src/sidebar/sidebar.html");
  });

  it("pre-grants video origins only in test manifests", () => {
    const manifest = createExtensionManifest(
      resolveBuildUrls(
        {
          VITE_JELLY_WEBSITE_URL: "http://localhost:16180",
          VITE_JELLY_WS_URL: "ws://localhost:16080",
        },
        { allowInsecureLocalhost: true },
      ),
      { firefox: false, test: true },
    );

    expect(manifest.host_permissions).toEqual(["http://localhost/*", "https://*/*", "http://*/*"]);
    expect(manifest).not.toHaveProperty("optional_host_permissions");
  });
});
