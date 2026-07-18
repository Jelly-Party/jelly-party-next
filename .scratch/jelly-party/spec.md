# Jelly Party 2.0

Status: ready-for-agent

## Problem Statement

Jelly Party already has the right product: open the extension on a video, create a party, share a link, chat, and keep playback in sync. The current code needs a small production-focused rebuild, not a new product or an elaborate architecture. It must be pleasant to develop, straightforward to package for the existing browser-store listings, and simple enough to finish quickly.

## Solution

Rebuild the existing Jelly Party flow as a small TypeScript monorepo. Keep the familiar create, share, join, chat, play, pause, seek, and leave behavior. Move the extension UI from an injected iframe into the browser sidebar/side panel, keep page integration limited to finding and controlling the video, and connect only to the new backend at `wss://v2.jelly-party.com`.

Use Vite+ for the complete development loop, UnoCSS for the design, Playwright for the real two-peer flow, and Vitest only for logic that benefits from focused tests. Publish the result as in-place updates to the existing Chrome, Firefox, and Edge listings.

## User Stories

1. As a viewer, I want the extension toolbar action to open Jelly Party beside my video, so that the website layout is not covered or modified.
2. As a viewer, I want to create a party for the video in my active tab, so that friends can watch with me.
3. As a viewer, I want to copy one magic link, so that a friend can join the same party and video.
4. As an invited viewer, I want the magic link to guide me through installing the extension or granting access to the destination site, so that joining requires no technical knowledge.
5. As an invited viewer, I want to land on the shared video and join the party automatically where the browser permits it, so that joining is quick.
6. As a peer, I want a display name and an emoji, so that other peers can identify me without an avatar system.
7. As a peer, I want to see who is in the party, so that I know my friends connected.
8. As a peer, I want to send and receive ephemeral text chat, so that we can talk while watching.
9. As a peer, I want play, pause, and seek actions to propagate in both directions, so that everyone stays at roughly the same point.
10. As a peer, I want synchronization to use position from the end of the video, so that differing pre-roll durations are less disruptive.
11. As a peer, I want remote playback changes not to echo back into the party, so that one action does not loop.
12. As a peer, I want clear connection, missing-video, permission, and retry states, so that ordinary failures are recoverable.
13. As a peer, I want leaving or closing the sidebar to leave the party, so that participation is explicit and temporary.
14. As a developer, I want one hot-reloading command for the backend, extension, join site, and website, so that changes are visible immediately.
15. As a developer, I want one Vite+ toolchain for runtime management, dependencies, formatting, linting, type-checking, unit tests, builds, and tasks, so that the repository has one obvious workflow.
16. As a releaser, I want deterministic Chrome, Firefox, and Edge packages, so that the existing listings can be updated without manual archive surgery.

## Implementation Decisions

- Preserve the current monorepo responsibilities: a browser extension, an in-memory WebSocket backend, a static magic-link join site, a static marketing site, and a small shared protocol package. Remove packages or dependencies that do not earn their keep.
- Write TypeScript throughout. Use Svelte for extension and website UI, UnoCSS for styling, and browser/platform APIs before adding dependencies.
- Use Vite+ as the only JavaScript toolchain. `vp dev`, `vp check`, `vp test --run`, `vp build`, and Vite Task must cover the standard loop. Do not add another task runner or separate formatter/linter.
- Provide a single Vite Task that hot-reloads the backend and sites and rebuilds/reloads the extension during development.
- Put party creation, joining, peer presence, chat, connection state, and the WebSocket in one shared sidebar application. Use Chrome/Edge `sidePanel` and Firefox `sidebar_action` with thin browser-specific manifest/configuration differences.
- Keep page code small: find the most relevant HTML video in each frame, report local play/pause/seek, and apply remote actions. Use extension runtime messaging between the page and sidebar/background; do not inject a visual iframe or maintain a public service-driver framework.
- Keep the old, understandable event-shaped playback behavior. Synchronize finite videos with `timeFromEnd`, suppress echoes, tolerate small drift, and add site-specific handling only after a real site proves it necessary.
- A party has a capability-style random ID, a set of connected peers, ephemeral chat, and no persistence. A peer has a generated ID, display name, and emoji. There are no avatars or avatar assets.
- Magic links contain the party ID and destination video URL. The join site detects the extension, requests optional access to the destination origin from a user click when needed, navigates to the video, and hands the party ID to the extension. If a browser cannot open its sidebar automatically, the page tells the peer to click the toolbar action once.
- Production clients connect only to `wss://v2.jelly-party.com`. The protocol may be changed freely; there is no compatibility code for the old backend or extension.
- The backend remains a small in-memory WebSocket relay. It validates incoming message shapes and sensible size limits, broadcasts party/chat/playback messages, and exposes a basic health endpoint. No database is required.
- Build two extension variants from shared source: Chromium and Firefox. Produce three deterministic store archives: Chrome and Edge may use the same Chromium archive; Firefox gets its manifest/sidebar differences and source-review material. Preserve the existing store identities and publish Jelly Party 2.0 over the old listings.
- The interface should feel intentional and compact, but design work must not grow the architecture. UnoCSS owns styling; accessible HTML, keyboard behavior, useful empty/error states, and a responsive sidebar are enough.

## Testing Decisions

- The primary acceptance seam is one Playwright test against a local video fixture, local backend, join site, and built extension. It creates a party in one browser context, joins through the magic link in a second, verifies both peers and chat, then verifies bidirectional play, pause, and seek. This replaces tests of internal UI structure.
- Keep a small Playwright test for video replacement/frame selection only if that behavior cannot be covered clearly in the main flow.
- Use Vitest for pure, failure-prone logic such as protocol validation, magic-link parsing, and playback position/echo handling. Do not unit-test trivial components, stores, or wiring.
- Build validation must produce the Chromium and Firefox variants plus the three named store archives and validate their manifests. Chrome and Edge archives should be byte-identical unless a store requirement forces a difference.
- A change is ready when `vp check`, `vp test --run`, the Playwright task, and the all-artifacts build pass from the Nix development environment.

## Out of Scope

- Compatibility with the old protocol or backend.
- Avatars, accounts, durable party/chat history, social discovery, voice/video chat, or live-stream synchronization.
- Safari, mobile browsers, and browsers other than current Chrome, Firefox, and Edge.
- Site-specific video adapters until generic HTML video behavior demonstrably fails on a site worth supporting.
- A database, Kubernetes, multi-region deployment, elaborate observability, staged-rollout machinery, or a browser compatibility lab.
- Reproducing every old visual detail or retaining code solely because the old extension had it.

## Further Notes

- Be pragmatic. Prefer deleting complexity over documenting it.
- The existing extension is behavioral reference material, not an architecture to preserve. Keep what users notice; simplify everything else.
- The implementation should be treated as a short rebuild with one end-to-end flow, not as a platform project.
