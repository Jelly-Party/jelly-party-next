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
- New protocol and backend at `wss://v2.jelly-party.com`; no old-client compatibility

The implementation contract is the [Jelly Party 2.0 specification](.scratch/jelly-party/spec.md).

## Repository

| Package                 | Responsibility                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| `jelly-party-extension` | Shared sidebar UI, browser adapters, and small page video driver |
| `jelly-party-server`    | In-memory WebSocket party relay and health endpoint              |
| `jelly-party-join`      | Static magic-link handoff and optional-origin permission flow    |
| `jelly-party-lib`       | Shared validated protocol and small cross-package utilities      |
| `jelly-party-website`   | Static project, install, support, and privacy pages              |

The sidebar owns the party connection, presence, and chat. A small content script runs in relevant frames to discover and control an HTML video. The two communicate with extension runtime messages. The server only validates and relays messages; it stores nothing.

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

## Quality loop

```bash
vp check          # format, lint, and type-check
vp test --run     # Vitest
vp run test:e2e   # Playwright two-peer flow
vp run build:all  # all deployable and store artifacts
```

The Playwright flow is the main acceptance test: create a party, join from a second peer through the shared link, exchange chat, and synchronize play, pause, and seek in both directions. Add focused Vitest coverage only for logic that can fail independently.
