# Audit the repository against the launch contract

Type: task
Status: resolved

## Question

What concrete gaps exist between the current repository and the confirmed launch promise, sidebar architecture, page-video contract, cross-browser targets, hosting topology, and clean-slate rollout?

## Answer

The repository is a useful Jelly Party 2.0 prototype and deployment skeleton, not a production-replacement candidate. It currently cannot substantiate a launch-supported-service claim on any of the three target browsers. The reusable foundations are the MV3 Chromium baseline, optional-origin permission flow, shared TypeScript protocol package, memory-only WebSocket broker, static website/join packages, Docker/Caddy/Alloy skeleton, and Chromium/local video-sync fixtures. The concrete gaps are below.

### Launch promise and verification

- The browser E2E harness launches only Playwright Chromium. It does not exercise installed Chrome, Edge, or Firefox packages, native sidebars, store builds, real permission prompts, or installation/update behavior. Its test build converts optional permissions into pre-granted host permissions and programmatically injects the old overlay, bypassing the launch join gesture.
- The only configured external fixture is PeerTube; YouTube is commented out, and Netflix and Jellyfin have no fixtures or recorded manual evidence. There is therefore no two-peer create, join, play, pause, seek, and chat evidence for YouTube, Netflix, or Jellyfin on current Chrome, Firefox, and Edge.
- The website currently presents Disney+, Jellyfin, Netflix, Prime Video, Vimeo, and YouTube as working without the evidence required by the launch promise. It does not distinguish launch-supported from best-effort services.
- The ordinary `vp test --run` suite covers only two scaffold tests, not the extension, backend protocol, or launch flow. The existing E2E suite is a separate task, depends on an external PeerTube page, and has no checked-in CI workflow or durable real-service evidence process.

### Sidebar architecture, join flow, and browser packages

- The extension has one Chromium-shaped manifest and one generic build. It declares neither Chromium `side_panel`/`sidePanel` nor Firefox `sidebar_action`; it contains no thin browser sidebar adapters, per-browser manifests, or separate Chrome, Edge, and Firefox submission artifacts.
- Party UI, state, chat, and the WebSocket still live in a page-injected extension iframe. The toolbar action injects `main.ts` and `videoAgent.ts`, and the page bridge resizes/hides an overlay. This is the architecture explicitly replaced by the sidebar decision.
- UI/frame/video traffic still uses wildcard `window.postMessage(..., "*")`. The manager trusts page-visible message shapes and routes via `Window` references rather than authenticated extension runtime messages with tab/frame identity.
- The manifest lacks the existing Firefox add-on ID, Firefox minimum version and data-collection declarations, browser-specific background/sidebar differences, a strict extension CSP, and store-specific permission metadata. The build emits a directory, not review-ready archives plus Firefox source/build material.
- Magic links are handled by a content script that replaces the join page DOM, asks the background page to request permission, navigates with `jellyPartyId` in the query string, injects the overlay, and auto-joins there. It does not implement the decided toolbar-to-sidebar handoff, portable user gesture, close-sidebar-leaves behavior, or a shared cross-browser failure/retry model.

### Page-video and clean-slate protocol contracts

- `VideoController` exposes separate `play`, `pause`, and `seek` methods returning booleans, with separate event callbacks. There is no atomic `PlaybackIntent`, media-generation identifier, `apply(intent)`, `dispose()`, or typed stale/unavailable/autoplay/unsupported/timeout outcome.
- Commands are launched without awaiting or serializing them. Replacement detection, readiness, pause/seek/resume sequencing, and echo counters remain externally observable through event-shaped traffic rather than being hidden behind one deep module.
- Frame selection is only “largest advertised area.” Advertisements carry page URL/dimensions but no stable frame/media generation, a frame with removed media never advertises unavailability, and the router can retain a stale `Window`; an intent is not routed back to the exact generation that advertised itself.
- The shared wire protocol is still event-shaped (`videoUpdate` with `playPause`/`seek`, `tick`, and `paused`) and the production extension still targets `wss://ws.jelly-party.com`, not the clean new `wss://v2.jelly-party.com` protocol. Constants also retain old production/staging endpoints. Version strings saying `2.0.0` do not make this the confirmed clean-slate protocol.
- Party capabilities are created from only eight hexadecimal UUID characters (about 32 bits), below the confirmed ≥128-bit requirement. Client and server parse untrusted JSON with unchecked casts and do not enforce message schemas, field/range/size limits, party capability shape, or protocol-version rejection. The backend therefore lacks a defensible clean protocol boundary even though its in-memory/no-history topology is directionally correct.

### Hosting, observability, privacy, and cutover

- Docker Compose, Caddy, Alloy, Prometheus metrics, and an internal health handler exist, but production configuration does not establish `v2.jelly-party.com`: `DOMAIN_NAME` is absent from `.env.example`, the extension points at the old host, and no DNS/TLS/VPS provisioning or cutover procedure is documented.
- The health handler is on the internal metrics port while Caddy proxies only the WebSocket application port. There is no externally usable readiness endpoint, uptime check configuration, alert policy, go/no-go signal, backup artifact inventory, or tested rollback/forward-fix runbook.
- Deployment instructions keep secrets in a local `.env` but do not define host access, secret protection/rotation, Grafana access controls/region/retention, or an operational recovery procedure. The `caddy:alpine` image is floating rather than release-pinned.
- Server logs include party IDs, peer UUIDs, and names; extension logs include party IDs and URLs; Alloy forwards whole Docker log lines. This violates the confirmed production allowlist. The extension also imports Google Fonts remotely.
- The public privacy policy is generic text dated 2020, omits the extension's chat/playback/URL processing and Grafana/provider facts, and says identifying information is not shared with third parties. It cannot support current store declarations. Store listing copy, disclosure forms, reviewer instructions, screenshots, signed-package identities, and rollback artifacts are not represented in the repository.
- The join package has Vercel metadata, but the website has no equivalent checked-in deployment/domain configuration. Neither static surface has a documented atomic cutover, redirect/old-link policy, browser-specific install routing, or release-state messaging.

### Confirmed implementation standards and repository hygiene

- Tailwind remains configured at the root and in the extension, website, and status package; UnoCSS is absent.
- Server/library package scripts still invoke `tsx`, `tsc`, and `node` directly, rather than expressing those workflows consistently through Vite+ package configuration and Vite Task. The workspace also retains an unrelated root Svelte scaffold, an empty status package, a `.svelte.tmp` file, and documentation describing the rejected iframe architecture.
- `vp run build:all` builds the five active packages, but there is no single release task that checks, tests, produces all three store archives and Firefox sources, builds both Vercel sites and the server image, records checksums, and refuses partial output.
- The quality gate is not green: `vp check` currently stops on a formatting error in the production-launch research note; `vp check --no-fmt` reports 19 warnings, including unhandled promises in permission, injection, reconnect, and media-command paths. `vp test --run` passes its two tests only when run inside the configured Nix environment; merely having `vp` on `PATH` does not supply the pinned Playwright browser. The workspace-wide build succeeds, with extension accessibility and toolchain deprecation warnings.

### Planning consequence

The audit does not expose a separate decision beyond the existing frontier. [Decide the cross-browser build and package shape](09-decide-the-cross-browser-build-and-package-shape.md), [Decide the magic-link and sidebar join experience](10-decide-the-magic-link-and-sidebar-join-experience.md), [Decide the launch verification matrix](11-decide-the-launch-verification-matrix.md), [Decide the website and domain cutover](12-decide-the-website-and-domain-cutover.md), and [Define production go/no-go and rollback](13-define-production-go-no-go-and-rollback.md) now have the concrete baseline they need. Exact implementation tickets and sequencing should remain unspecified until those decisions resolve; creating them now would prematurely choose the build, join, verification, cutover, and release shapes.
