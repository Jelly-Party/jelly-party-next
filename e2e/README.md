# Jelly Party E2E Tests

This directory contains loaded-extension end-to-end acceptance tests.

- `party-sync.spec.ts` uses Playwright's officially supported bundled-Chromium extension path.
- `firefox-extension.ts` uses Selenium/geckodriver because Playwright does not support loading
  Firefox WebExtensions. It temporarily installs the built package, verifies that Firefox's native
  sidebar loads the packaged panel and survives close/reopen, then drives that same panel document
  in a normal extension tab for stable DOM assertions. Firefox keeps the panel in a remote nested
  browser context that WebDriver cannot target reliably.

Run them with `vp run test:e2e` and `vp run test:e2e:firefox`. The Nix flake supplies all browser
and driver binaries.

## How it works

The tests run against a **special test build** of the extension (`dist-test`), which has:

1. `host_permissions` pre-granted (converted from `optional_host_permissions`).
2. Environment variables pointing to dedicated test services (`localhost:16080`, `localhost:16180`).

This setup allows us to test the **real user flow** (magic links, chat, synchronization) without manually interacting with native browser permission dialogs, which are difficult to automate.

## Running Tests

The Vite Task starts the test services on dedicated `16xxx` ports, then runs Playwright:

```bash
vp run test:e2e:headed # Runs in visible browser
# OR
vp run test:e2e        # Runs headless
```

## What is Tested

- **Party Creation**: Creating a party from the extension sidebar.
- **Magic Links**: Joining a party through the locally configured invitation flow.
- **Auto-Join**: Automatic redirection and joining in an already-open sidebar.
- **Chat**: Real-time chat messaging between peers.
- **Video Selection**: Choosing the largest video across the top page and child frames.
- **Video Replacement**: Continuing synchronization after the page replaces its video element.
- **Video Sync (Bidirectional)**:
  - A→B: Peer A's actions sync to Peer B
  - B→A: Peer B's actions sync back to Peer A
  - Seek, play, and pause all tested in both directions
- **Leave Party**: Peer leaves and the remaining peer count updates.
- **Firefox Away State**: An unrelated tab shows Return and Leave without ending the party.

## What is NOT Tested

- **Browser-owned Panel DOM**: The native Chromium panel container and Firefox's remote nested panel
  DOM are not directly driven. Chromium and Firefox assert the packaged panel document directly;
  Firefox additionally asserts the real native container's loaded URL and close/reopen lifecycle.
- **Permission Dialogs**: The actual "Allow" permission dialog flow is bypassed by pre-granting permissions in the test build. We explicitly assume the permission request logic works (unit tested/verified manually).
- **Store Installation**: Draft uploads, permission prompts, and branded Chrome/Edge/Firefox toolbar
  smoke tests remain release-checklist items because they require store accounts or browser-owned UI.
