# 01 — Create and join a temporary party

**What to build:** A viewer can open Jelly Party beside the active video, choose a display name and emoji, create a temporary party, copy one magic link, and use that link to bring a second peer into the same party and video. The sidebar owns the connection and clearly explains permission, connection, retry, and leave states.

**Blocked by:** None — can start immediately.

Status: ready-for-agent

- [x] The toolbar action opens a shared Svelte sidebar application through the Chromium side panel or Firefox sidebar without injecting visual UI into the page.
- [x] A peer with a display name and emoji can create a capability-ID party for the active tab's video, copy its magic link, see connected peers, and explicitly leave; closing the sidebar also ends participation.
- [x] Opening the magic link detects whether the extension is available, requests optional access to the destination origin from a user gesture when necessary, navigates to the video, and hands the party ID to the extension.
- [x] Joining completes automatically where the browser permits; otherwise the page gives the peer a clear one-click toolbar instruction.
- [x] The in-memory backend validates bounded protocol messages, maintains ephemeral party presence, exposes a health endpoint, and production clients connect only to the secure WebSocket endpoint configured in `config/urls.ts`.
- [x] Focused tests cover protocol validation and magic-link parsing, including invalid IDs, URLs, permissions, and connection failures.
