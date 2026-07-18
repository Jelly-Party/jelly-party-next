# 02 — Chat and synchronize playback

**What to build:** Two connected peers can chat and keep their videos synchronized in both directions. The extension finds and controls the relevant page video while the sidebar remains the only visible extension UI, and ordinary playback or video-discovery failures remain understandable and recoverable.

**Blocked by:** 01 — Create and join a temporary party.

**Status:** done

- [x] Connected peers can send and receive bounded ephemeral text messages, with no account or history introduced.
- [x] Small page scripts select the most relevant HTML video across frames, report local play, pause, and seek actions, and apply remote actions through extension runtime messaging.
- [x] Finite-video synchronization uses position from the end, works in both directions, tolerates small drift, and prevents applied remote actions from echoing back into the party.
- [x] The sidebar shows useful missing-video, disconnected, and retry states without adding site-specific adapters.
- [x] Focused tests cover playback position and echo handling, plus video replacement/frame selection only where the main flow cannot cover it clearly.
- [x] One Playwright flow creates a party, joins through the magic link in a second browser context, verifies presence and chat, and verifies bidirectional play, pause, and seek.
