# Ship Jelly Party 2.0 to production

## Destination

A production launch specification and sequenced handoff plan for replacing the existing Jelly Party website, backend, and Chrome/Firefox/Edge store packages with Jelly Party 2.0, with every material decision resolved before implementation and release work begins.

## Notes

- Optimize for finishing soon: pragmatic reliability and clear seams, without speculative platform work.
- Planning only. Implementation begins after the map makes the route clear.
- Use the domain language in `CONTEXT.md` and respect `docs/adr/0001-use-browser-sidebar-for-party-ui.md` and `docs/adr/0002-use-an-atomic-page-video-interface.md`.
- All implementation and tooling decisions must follow [Set the implementation standards](issues/15-set-the-implementation-standards.md).
- Use `codebase-design` for module seams, `domain-modeling` for vocabulary/ADRs, `prototype` for join UX or build-shape questions, and `research` for current browser-store requirements.

## Decisions so far

- [Define the launch promise](issues/01-define-the-launch-promise.md) — Launch in place on Chrome, Firefox, and Edge with an evidence-based support contract; YouTube, Netflix, and Jellyfin are the non-negotiable service targets.
- [Choose the extension UI architecture](issues/02-choose-the-extension-ui-architecture.md) — Put party UI in browser sidebars and retain only a small UI-free video driver in page frames.
- [Define the page-video contract](issues/03-define-the-page-video-contract.md) — Apply atomic playback intent through a deep generation-safe module; defer service adapters until evidence requires a second implementation.
- [Choose the production hosting topology](issues/04-choose-the-production-hosting-topology.md) — Use Vercel for static sites, one Docker/Caddy VPS for the new backend, and Alloy forwarding to free Grafana Cloud.
- [Choose the store and protocol rollout](issues/05-choose-the-store-and-protocol-rollout.md) — Update existing listings to MV3 in place, use `v2.jelly-party.com` for the clean new protocol, and provide no dual-protocol application compatibility.
- [Set the implementation standards](issues/15-set-the-implementation-standards.md) — Use TypeScript, UnoCSS, minimal dependencies, simple idiomatic code, and Vite+ consistently across the workspace.
- [Audit the repository against the launch contract](issues/08-audit-the-repository-against-the-launch-contract.md) — The repo is a reusable MV3/backend/deploy prototype, but sidebar, atomic page-video, three-browser packaging/evidence, clean v2 protocol, privacy-safe operations, and release machinery all remain launch gaps.
- [Decide the cross-browser build and package shape](issues/09-decide-the-cross-browser-build-and-package-shape.md) — Use two runtime builds and three deterministic store packages, with byte-identical Chrome/Edge archives and Firefox-specific manifest, sidebar, and source-review material.

## Not yet specified

- Exact implementation tickets and ordering; these depend on the remaining build, join, verification, cutover, and release decisions.
- Whether any launch-target service requires a private service-specific media adapter rather than generic HTML5 behavior.
- Store-review feedback or disclosure changes that cannot be known before submission artifacts exist.
- Exact production defects uncovered by cross-browser and real-service verification.

## Out of scope

- Voice or video chat, accounts, durable party/chat history, and social discovery.
- Live-stream synchronization and dynamically loaded third-party driver plugins.
- Safari, mobile browsers, and browsers other than current Chrome, Firefox, and Edge.
- Kubernetes, multi-region infrastructure, a database, or a managed realtime platform.
- Exhaustive compatibility claims for subscription services that cannot be verified.
