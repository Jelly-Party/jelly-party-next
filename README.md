# Jelly Party

**Watch videos with friends, in sync.**

A browser extension + backend for watch parties. Install the extension, share a link, sync videos. That's it.

## Architecture

A pnpm monorepo with four packages:

| Package | What it does |
|---------|--------------|
| `jelly-party-extension` | MV3 browser extension. Service worker orchestrates, content scripts handle the page, an iframe hosts the UI. |
| `jelly-party-server` | WebSocket broker. Manages `Party` rooms and forwards messages between peers. Doesn't touch video state. |
| `jelly-party-join` | The `join.jelly-party.com` site. A single-page app that triggers permission requests for arbitrary origins. |
| `jelly-party-lib` | Shared types. The protocol contract lives here—`PartyState`, `ClientState`, all WebSocket message shapes. |

### How the extension works

The extension can't just run on every site—it uses **optional permissions**. When you share a "magic link" (`join.jelly-party.com/?redirectURL=...`), the extension intercepts the navigation, prompts for access to the target domain, then redirects and injects.

Inside a page, there are three moving parts:

```
┌─────────────────────────────────────────────────────────────────┐
│  Host Page (e.g. netflix.com)                                   │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │  Main Content Script │◄──►│  Chat Iframe         │          │
│  │  (bridge)            │    │  (chrome-extension://)│◄──► WS  │
│  └──────────┬───────────┘    └──────────────────────┘          │
│             │ postMessage                                       │
│             ▼                                                   │
│  ┌──────────────────────┐                                       │
│  │  VideoAgent          │──► <video> element                    │
│  │  (runs in all frames)│                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

- **Chat Iframe**: Isolated in the extension's origin. Holds the WebSocket connection, stores party state. Safe from the host page's CSP.
- **Main Script**: Runs in the top frame. Bridges the iframe to the video agents via `postMessage`.
- **VideoAgent**: Injected into every frame. Detects `<video>` elements, hooks into play/pause/seek, and executes remote commands.

This chain exists because the iframe can't touch the host page directly, and videos can be nested in cross-origin iframes (Vimeo embeds, etc.).

### Sync logic

Video sync uses `timeFromEnd` (duration minus current time) rather than absolute timestamps. Why? Ad-blockers and regional differences can result in different pre-roll lengths. Syncing from the end keeps the actual content aligned.

Echo cancellation is straightforward: when a remote command arrives, the controller sets an `ignoreNext` flag before mutating the video. The subsequent browser event fires, sees the flag, and gets dropped.

## Development

We use [`just`](https://github.com/casey/just) as a task runner.

```bash
# Start everything (server, extension, join site)
just dev

# See all commands
just
```

The extension builds in watch mode. After changing `manifest.json` or background scripts, the extension reloads automatically.

### Monorepo notes

- **Protocol changes**: Edit `jelly-party-lib` first. Rebuild it (`just build-pkg jelly-party-lib`) before other packages pick up the types.
- **E2E tests**: `just test` builds a special test extension with pre-granted permissions (no prompts in CI). Tests spawn two browser contexts and verify sync between them.

## Packages

### `jelly-party-lib`

The source of truth. All TypeScript interfaces and message types live here. If it's not in the lib, it's not part of the protocol.

Exports: `ClientState`, `Peer`, `PartyState`, `WSMessage`, `ENDPOINTS`, `createLogger`.

### `jelly-party-extension`

Structure:
- `src/background/` — Service worker. Handles permissions, icon clicks, message routing.
- `src/content/` — Content scripts. `main.ts` is the bridge, `videoAgent.ts` controls video.
- `src/chat/` — The Svelte app inside the iframe. Manages party state, chat, sync controls.
- `src/popup/` — Extension popup (minimal, just shows status / opens overlay).

### `jelly-party-server`

A Hono app with WebSocket support. Creates `Party` rooms on demand, broadcasts messages to all peers except the sender. Exposes Prometheus metrics on `:9090/metrics`.

The server is intentionally dumb. Sync logic lives entirely in the clients.

### `jelly-party-join`

Static site deployed to Vercel. When you land on `join.jelly-party.com/?redirectURL=...`, the extension's content script reads the URL, asks the service worker to request permissions for the target origin, then redirects you there with the party ID in the query string.
