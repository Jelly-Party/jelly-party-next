# Jelly Party E2E Tests

This directory contains End-to-End tests using [Playwright](https://playwright.dev/).

## How it works

The tests run against a **special test build** of the extension (`dist-test`), which has:
1. `host_permissions` pre-granted (converted from `optional_host_permissions`).
2. Environment variables pointing to local dev services (`localhost:8080`, `localhost:5180`).

This setup allows us to test the **real user flow** (magic links, chat, synchronization) without manually interacting with native browser permission dialogs, which are difficult to automate.

## Running Tests

To run the tests, you need the dev services running:

```bash
just dev-server  # Starts the backend and join site
```

Then run the tests:

```bash
just test-headed # Runs in visible browser
# OR
just test        # Runs headless
```

## What is Tested

- **Party Creation**: Creating a party from the extension overlay.
- **Magic Links**: Joining a party via the `join.jelly-party.com` (local) magic link flow.
- **Auto-Join**: Automatic redirection and joining from the magic link.
- **Chat**: Real-time messaging between peers.
- **Synchronization**: (Coming soon) Video playback state sync.

## What is NOT Tested

- **Popup UI**: The extension popup (clicked via toolbar icon) is not tested as it's separate from the content script overlay.
- **Permission Dialogs**: The actual "Allow" permission dialog flow is bypassed by pre-granting permissions in the test build. We explicitly assume the permission request logic works (unit tested/verified manually).
- **Installation**: The actual browser installation process from the store.
