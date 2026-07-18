# Decide the cross-browser build and package shape

Type: prototype
Status: resolved
Blocked by: 06, 08

## Question

What is the smallest maintainable build shape that produces valid Chrome, Edge, and Firefox MV3 submission artifacts from shared code while isolating only genuine manifest and sidebar differences?

## Answer

Use **two runtime builds and three store packages**.

- Build one `chromium` target and one `firefox` target from the same extension application source. Package the Chromium output separately as `chrome.zip` and `edge.zip`; those two archives must remain byte-identical until a verified Edge requirement creates a genuine difference. Package the Firefox output as `firefox.zip` and also produce `firefox-source.zip` for AMO review.
- Put the runtime variation behind one small build-selected browser-sidebar module with exactly two adapters: Chromium uses `chrome.sidePanel`, while Firefox uses `browser.sidebarAction`. No other caller branches on browser brand.
- Generate manifests from one readable common definition plus explicit Chromium and Firefox fragments. Chromium owns `sidePanel`, `side_panel`, and the module service worker. Firefox owns `sidebar_action`, `background.scripts`, and checked-in `browser_specific_settings.gecko` metadata, including the preserved add-on ID, Firefox 140+ minimum, and required data-collection declarations. Do not use a generic deep-merge system.
- Give the release workflow one Vite Task interface that reads one checked-in extension version and either produces the complete release inventory or fails without leaving a partial inventory. Package-level build tasks remain implementation details.
- Emit versioned, deterministic artifacts with `SHA256SUMS` and an inventory recording target, channel, generated manifest, and file hashes. Validate matching versions, forbidden cross-target manifest keys, referenced files, production endpoints, packaged-only executable assets, absence of development/test/source-map material, and the preserved Firefox identity.
- Make the Firefox source archive a minimal reproducible workspace slice: extension and shared-library source, workspace/lock manifests, Vite+ configuration, Nix flake inputs, and concise `vp` instructions—never dependencies, build output, secrets, or unrelated packages.
- Leave signing to the stores. Archive the exact unsigned uploads, returned signed or approved packages where available, reviewer material, checksums, and inventory for every release.

Rejected a three-build shape because Chrome and Edge have no genuine runtime difference today; it creates a hypothetical seam and permits accidental drift. Rejected a universal package because Firefox's sidebar, background, signing identity, and disclosure manifest are materially different from Chromium.

The approved throwaway decision prototype is preserved on branch `codex/prototype-cross-browser-build-shape` at commit `3db2335`.
