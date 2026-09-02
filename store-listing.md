# Store listing

The text and images used when publishing Jelly Party to the Chrome Web Store, Microsoft Edge
Add-ons and addons.mozilla.org. Keep this file and the extension in step: the images are rendered
from the shipping components, so the words should describe the same product.

## Images

Every image is generated, never hand-drawn. `/press` on the website renders each frame at its exact
store size from the components in `packages/jelly-party-extension` and `packages/jelly-party-website`,
and `vp run assets:store` screenshots them into `artifacts/press/`.

```bash
vp run assets:store
```

| File                                               | Size     | Where it goes                        |
| -------------------------------------------------- | -------- | ------------------------------------ |
| `01-watch-together.png`                            | 1280×800 | Screenshot 1 — Chrome, Edge, Firefox |
| `02-start-a-party.png`                             | 1280×800 | Screenshot 2 — Chrome, Edge, Firefox |
| `03-chat-beside-the-video.png`                     | 1280×800 | Screenshot 3 — Chrome, Edge, Firefox |
| `04-everyone-in-sync.png`                          | 1280×800 | Screenshot 4 — Chrome, Edge, Firefox |
| `05-works-where-you-watch.png`                     | 1280×800 | Screenshot 5 — Chrome, Edge, Firefox |
| `promo-small-tile.png`                             | 440×280  | Chrome Web Store small promo tile    |
| `promo-marquee.png`                                | 1400×560 | Chrome Web Store marquee promo tile  |
| `store-logo.png`                                   | 300×300  | Edge Add-ons store logo              |
| `packages/jelly-party-extension/icons/128x128.png` | 128×128  | Chrome and Firefox listing icon      |

The video in every screenshot is `static/sync-demo.webm`, which ships with this repository. No
screenshot may show a third party's streaming service, player skin or copyrighted footage: reviewers
treat that as someone else's trademark, and the listing outlives whatever was on screen that day.

The sizes above are the slots the stores describe; the captured files are twice those dimensions,
which is what addons.mozilla.org and every other surface should get. Chrome and Edge validate some
slots on exact pixel size, so if an upload is refused, regenerate exact-size files with:

```bash
JELLY_PRESS_SCALE=1 vp run assets:store
```

Confirm the current dimension rules in each dashboard before uploading; the stores adjust them
occasionally, and the capture script asserts both the layout size and the written pixel size.

## Name

Jelly Party

## Short summary (132 characters or fewer)

Watch videos with your friends — in sync. Start a party beside any video, share one link, and chat
while you watch.

## Description

Jelly Party turns any video you can already watch into a watch party.

Open the sidebar next to the video, start a party, and send your friends the invite link. Everyone
lands on the same video. When the leader changes videos, every party tab follows automatically, and
play, pause and seek carry to every screen. The chat lives in the browser's own sidebar, so the page
you are watching is left alone.

- Private through one long, unguessable link. No accounts, profiles, or room codes.
- One leader picks the video, and can hand the lead to anyone in the party.
- Everyone stays at the same moment: play, pause and seek are shared.
- Chat and the peer list sit in the sidebar, beside the video.
- Works on the streaming sites you already use, and on any other page with a video.
- Free and open source.

Jelly Party asks for access to a site the first time you start or join a party there. Anyone with the
unguessable party link can join, so share it only with the people you want to invite.

## Category and tags

- Category: Entertainment (Chrome, Edge) / Social & Communication (Firefox)
- Tags: watch party, watch together, sync video, video chat, remote movie night

## Support and policy links

- Website: https://www.jelly-party.com
- Privacy policy: https://www.jelly-party.com/privacy-policy
- Supported services: https://www.jelly-party.com/supported-services
