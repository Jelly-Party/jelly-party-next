---
trigger: always_on
---

# Technical Architecture & Guidelines

**Jelly Party** is a browser extension + backend for watch parties. Sync videos across browsers with minimal friction—install, share a link, done.

## System Architecture

### Extension Model (Manifest V3)

The extension operates under MV3 constraints: service workers only, no persistent background page.

**Permission strategy**: We never ask for "all sites" access. Instead:
1. User clicks the extension icon → request permission for *this* origin only.
2. User clicks a magic link (`join.jelly-party.com/?redirectURL=...`) → extension intercepts, requests permission for the *target* origin, then redirects.

This keeps things privacy-friendly and avoids the scary install prompts.

### Component Communication

Message passing architecture within the browser:

| Component | Location | What it does |
|-----------|----------|--------------|
| **Background** | Service Worker | Orchestrates permissions, routing, icon clicks. Has access to `browser.*` APIs. |
| **Chat Iframe** | `src/chat/chat.html` | Holds the WebSocket, stores party state. Lives in `chrome-extension://` origin—isolated from the host page. |
| **Main Script** | `src/content/main.ts` | Runs in top frame. Bridges the iframe to video agents via `postMessage`. |
| **VideoAgent** | `src/content/videoAgent.ts` | Runs in *all* frames. Finds `<video>` elements, hooks events, executes commands. |

**Data flow for video sync:**
```
Server ──(WS)──► Chat Iframe ──(postMessage)──► Main Script ──(postMessage)──► VideoAgent ──(DOM)──► <video>
```

Why this chain? The Chat Iframe can't touch the host page (different origin). VideoAgents might be inside cross-origin iframes (e.g. Vimeo embed on a blog). The bridge in the top frame stitches them together.

### Sync Logic (`VideoController`)

- **Time reference**: We sync using `timeFromEnd` (duration - currentTime), not absolute time. Ad-blockers and regional pre-roll differences often shift video start times. Syncing from the end keeps the actual content aligned.

- **Echo cancellation**: When applying a remote command, set an `ignoreNext` flag before mutating the video. The browser fires an event, the controller sees the flag, drops it. Simple.

## Development Rules

### Stack

- **Svelte 5**: Runes only (`$state`, `$effect`). No `export let` for state, no legacy store syntax.
- **Tailwind v4**: Zero-config. Styles in `app.css` or `<style>` blocks.
- **TypeScript**: Strict mode. No `any`. Shared types go in `jelly-party-lib`.

### Testing

**E2E (Playwright)**:
- Use `fixtures.ts` to load the extension.
- Test sync by spawning two browser contexts and asserting they stay in lockstep.

**Unit (Vitest)**:
- Test `VideoController` with mocked `HTMLVideoElement`.

### Workflow

- **Protocol changes**: Edit `jelly-party-lib` first. Run `just build-pkg jelly-party-lib` before other packages will see the new types.
- **Commands**: Use `just` for everything. Run `just` to see available tasks.
- **Hot reload**: The extension builds in watch mode, but you have to manually reload at `chrome://extensions` after changing `manifest.json` or service worker code.
