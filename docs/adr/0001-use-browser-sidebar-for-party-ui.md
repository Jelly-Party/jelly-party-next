# Use the browser sidebar for the party UI

Jelly Party will host its party and chat UI in browser chrome: `sidePanel` on Chrome and Edge, and `sidebar_action` on Firefox. A small UI-free driver remains in relevant page frames to discover and control video, communicating with the sidebar through extension runtime messages; this removes the fragile injected visual overlay while preserving the page access video synchronization requires.

Chromium and Firefox will use thin browser-specific manifests and sidebar adapters over shared application code. Magic-link joining will use the extension toolbar action as the portable user gesture, with optional host permission requested from inside the sidebar. For the initial production release, closing the sidebar leaves the party, and service-specific video drivers will be added only when verified compatibility requires them.

The decision trades a small amount of browser-specific packaging and an explicit join gesture for stable CSS isolation, a smaller page-integration surface, and a clean seam for future service-specific behavior. The supporting browser research is recorded in [the production-launch research note](../../.scratch/production-launch/research/sidebar-architecture.md).
