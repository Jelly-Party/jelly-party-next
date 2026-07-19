# Jelly Party

Watch videos with friends, in sync.

Jelly Party is a browser extension and small WebSocket backend. Open the sidebar on a video, create a party, share the magic link, and chat while play, pause, and seek stay synchronized. Parties and chat are temporary; there are no accounts or history.

## Product

- Chrome, Firefox, and Edge extension published over the existing store listings
- Native browser sidebar/side-panel UI
- Display name plus emoji—no avatars
- Magic-link joining with optional per-site permissions
- Ephemeral peer list and text chat
- Bidirectional HTML video play, pause, and seek synchronization
- New protocol and backend at `wss://v2-ws.jelly-party.com`; no old-client compatibility

The implementation contract is the [Jelly Party 2.0 specification](.scratch/jelly-party/spec.md).

## Repository

| Package                 | Responsibility                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| `jelly-party-extension` | Shared sidebar UI, browser adapters, and small page video driver |
| `jelly-party-server`    | In-memory WebSocket party relay and health endpoint              |
| `jelly-party-join`      | Static magic-link handoff and optional-origin permission flow    |
| `jelly-party-lib`       | Shared validated protocol and small cross-package utilities      |
| `jelly-party-website`   | Static project, install, support, and privacy pages              |

The extension background process owns the party connection, presence, and chat so closing or navigating away from the sidebar does not leave the party. A small content script runs in relevant frames to discover and control an HTML video. The components communicate through extension runtime messages. The server only validates and relays messages; it stores nothing.

## Development

The Nix development shell is configured to activate through nix-direnv after a one-time approval and provides the Playwright browsers. [Vite+](https://viteplus.dev/) manages Node.js, pnpm, formatting, linting, tests, builds, and project tasks through the `vp` CLI.

```bash
# Approve the shell once after cloning, then install dependencies
direnv allow
vp install

# Start the hot-reloading development environment
vp run dev

# Explore project tasks
vp run
```

The extension should rebuild and reload while developing. Cross-package workflows belong in Vite Task, listed by `vp run`.

## Build configuration

All public endpoints and project/store links have validated production defaults in `config/urls.ts`.
Every value can be overridden at build time with the corresponding variable shown in `.env.example`.
These values are baked into static sites and store archives, so set them before `vp run build:all` and
do not change the service origins after submitting an extension version.

Production builds require HTTPS URLs and a WSS relay. Test builds are the only mode that permits
explicit localhost HTTP/WS overrides.

## Server deployment

`deploy/docker-compose.yml` builds and runs only the stateless WebSocket relay, bound to
`127.0.0.1:8080`. The VPS-wide Caddy instance should proxy `v2-ws.jelly-party.com` to that loopback
port. See `deploy/README.md` for the complete clone, start, update, and health-check procedure.

## Quality loop

```bash
vp check          # format, lint, and type-check
vp test --run     # Vitest
vp run test:e2e   # Playwright two-peer flow
vp run build:all  # all deployable and store artifacts
```

The Chromium Playwright flow is the main acceptance test: it loads two real extension profiles,
creates a party, joins through the shared link, exchanges chat, and synchronizes play, pause, and seek
in both directions. Firefox uses the same application sources and receives manifest/build validation,
but Playwright does not support Firefox WebExtension loading; see the release research in `.scratch`
for the native manual gate. Add focused Vitest coverage only for logic that can fail independently.
