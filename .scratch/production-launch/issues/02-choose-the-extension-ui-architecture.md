# Choose the extension UI architecture

Type: research
Status: resolved

## Question

Should Jelly Party use browser sidebars across Chrome, Firefox, and Edge, and what page integration remains necessary?

## Answer

Use Chrome/Edge `sidePanel` and Firefox `sidebar_action` through thin browser adapters and browser-specific manifests over shared application code. The sidebar owns UI, party state, chat, and the WebSocket. A small UI-free driver remains in relevant page frames because browser sidebars cannot directly control page video. Runtime messaging replaces the injected visual iframe, top-frame bridge, and page `postMessage("*")` traffic. Toolbar action is the portable gesture for opening the sidebar and completing magic-link joins.

Context: [sidebar architecture research](../research/sidebar-architecture.md) and [ADR 0001](../../../docs/adr/0001-use-browser-sidebar-for-party-ui.md).
