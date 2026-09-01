# Jelly Party

Watch videos with friends, in sync.

Jelly Party is a browser extension and small Cloudflare Durable Object relay. Open the sidebar on a video, create a party, share the magic link, and chat while play, pause, and seek stay synchronized. There are no accounts; the latest 10,000 chat messages are retained for one year after the party becomes inactive.

## Product

- Chrome, Firefox, and Edge extension published over the existing store listings
- Native browser sidebar/side-panel UI
- Display name plus emoji—no avatars
- Magic-link joining with optional per-site permissions
- Ephemeral peer list and up to 10,000 messages of one-year party chat history
- Bidirectional HTML video play, pause, and seek synchronization
- New protocol and backend at `wss://www.jelly-party.com`; no old-client compatibility

The implementation contract is the [Jelly Party 2.0 specification](.scratch/jelly-party/spec.md).

## Repository

| Package                 | Responsibility                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| `jelly-party-extension` | Shared sidebar UI, browser adapters, and small page video driver |
| `jelly-party-server`    | Cloudflare Worker and one Durable Object per party               |
| `jelly-party-lib`       | Shared validated protocol and small cross-package utilities      |
| `jelly-party-website`   | Website, `/join` handoff, support, and privacy pages             |

The extension background process owns the party connection and presence so closing or navigating away from the sidebar does not leave the party. A small content script runs in relevant frames to discover and control an HTML video. The components communicate through extension runtime messages. A party-scoped Durable Object validates and relays messages, keeps its latest 10,000 chat messages, and clears all party data one year after its final peer disconnects. Rejoining before then restarts that one-year countdown.

## Development

The Nix development shell is configured to activate through nix-direnv after a one-time approval and provides the Playwright browsers. [Vite+](https://viteplus.dev/) manages Node.js, pnpm, formatting, linting, tests, builds, and project tasks through the `vp` CLI.

```bash
# Approve the shell once after cloning, then install dependencies
direnv allow
vp install

# Start the local Worker and website, and watch both extension builds
vp run dev

# Explore project tasks
vp run
```

`vp run dev` keeps self-contained development extensions current in:

- `latest/dev/chrome`
- `latest/dev/firefox`

Load the Chrome directory as an unpacked extension. In Firefox, load the Firefox directory's
`manifest.json` as a temporary add-on. The builds target the local website and `/join` route on
port 5180 and the local Worker on port 8080. The website listens on all interfaces, so a Lima guest
can be reached from macOS through the VM's forwarded port. Reload the installed extension after a
rebuild.

Cross-package workflows belong in Vite Task and are listed by `vp run`.

## Build configuration

All public endpoints and project/store links have validated production defaults in `config/urls.ts`.
Every value can be overridden at build time with the corresponding variable shown in `.env.example`.
These values are baked into the website and store archives. `vp run build` leaves the complete
production output together in `artifacts`: unpacked `chrome` and `firefox` directories for manual
testing, plus validated deterministic ZIPs for store submission. Building does not publish an
extension or deploy a Worker or site; those remain explicit manual operations.

Production builds require HTTPS URLs and a WSS relay. Test builds are the only mode that permits
explicit localhost HTTP/WS overrides.

## Cloudflare deployment

One Cloudflare Worker deploys the website, `/join` handoff, health endpoint, WebSocket relay, and
party Durable Object together. Static files bypass Worker execution; `/health` and `/party/*` run
Worker-first. Local development uses `wrangler dev --local` plus the website dev server.

Deploy the isolated staging Worker and assets with:

```bash
vp run deploy:staging
```

Deploy the same application to production after validation:

```bash
vp run deploy
```

Production is served at `https://www.jelly-party.com` and `https://jelly-party.com`; invite links use
`/join` and the extension connects to the same origin. The browser extension remains a separately
packaged store artifact and is never published by these deploy tasks.

Run the full two-peer browser acceptance flow against staging with:

```bash
JELLY_PARTY_STAGING_WS_URL=wss://jelly-party-relay-staging.<account>.workers.dev \
  vp run test:e2e:staging
```

## Quality loop

```bash
vp check          # format, lint, and type-check
vp test --run     # Vitest
vp run test:e2e   # Playwright two-peer flow
vp run test:e2e:firefox # Firefox loaded-extension acceptance flow
vp run test:e2e:production # store build against the deployed /join route
vp run build      # loadable production folders plus validated store ZIPs
vp run build:all  # every deployable build plus store archives
```

Both acceptance flows build a test extension whose manifest pre-grants every origin, so they
cannot see the optional site permission real users hit on their first join. `test:e2e:production`
covers that gap by driving the store build against the deployed `/join` route, through the grant page
that replaces the invite in the same tab and asks for the destination origin. Accepting the
browser's own permission dialog cannot be automated, so finish that step by hand before publishing.

The Chromium Playwright flow is the main acceptance test: it loads two real extension profiles,
creates a party, joins through the shared link, exchanges chat, and synchronizes play, pause, and seek
in both directions. Because Playwright cannot load Firefox WebExtensions, the Firefox task runs the
same high-value flow against a native Firefox sidebar through Selenium. Add focused Vitest coverage
only for logic that can fail independently.
