# 03 — Package and validate Jelly Party 2.0

**What to build:** Jelly Party has one straightforward development workflow and produces deterministic, store-ready Jelly Party 2.0 artifacts for the existing Chrome, Edge, and Firefox listings, together with the supporting static sites.

**Blocked by:** 02 — Chat and synchronize playback.

**Status:** done

- [x] Vite+ is the only JavaScript toolchain, UnoCSS owns styling, unnecessary packages and compatibility code are removed, and one Vite Task hot-reloads the backend, extension, join site, and website.
- [x] The compact sidebar and static sites provide accessible keyboard behavior, responsive layouts, and useful empty and error states without reproducing obsolete architecture or visual details.
- [x] Shared extension source builds Chromium and Firefox variants with the existing store identities and the required side-panel/sidebar manifest differences.
- [x] The build produces deterministic named Chrome, Edge, and Firefox store archives, validates their manifests, includes Firefox source-review material, and keeps the Chrome and Edge archives byte-identical unless a store requirement prevents it.
- [x] `vp check`, `vp test --run`, the Playwright end-to-end task, and the all-artifacts build pass from the Nix development environment.
