# Jelly Party E2E Tests

This directory contains End-to-End tests using [Playwright](https://playwright.dev/).

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
- **Magic Links**: Joining a party via the `join.jelly-party.com` (local) magic link flow.
- **Auto-Join**: Automatic redirection and joining in an already-open sidebar.
- **Chat**: Real-time chat messaging between peers.
- **Video Selection**: Choosing the largest video across the top page and child frames.
- **Video Replacement**: Continuing synchronization after the page replaces its video element.
- **Video Sync (Bidirectional)**:
  - A→B: Peer A's actions sync to Peer B
  - B→A: Peer B's actions sync back to Peer A
  - Seek, play, and pause all tested in both directions
- **Leave Party**: Peer leaves and the remaining peer count updates.

## What is NOT Tested

- **Native Side Panel Container**: Playwright opens the built sidebar document directly because it cannot reliably target browser-owned side-panel chrome. The sidebar lifecycle itself is exercised across invite navigation.
- **Permission Dialogs**: The actual "Allow" permission dialog flow is bypassed by pre-granting permissions in the test build. We explicitly assume the permission request logic works (unit tested/verified manually).
- **Installation**: The actual browser installation process from the store.
