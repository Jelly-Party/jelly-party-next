# Sidebar architecture for Jelly Party

Research date: 2026-07-17

## Question

Should Jelly Party replace its injected chat iframe with Chrome/Edge side panels and a Firefox sidebar, and what page integration would still be required?

## Findings

### A sidebar is the right home for the product UI

- Chrome's `sidePanel` API hosts an extension page beside the website and can be configured so the toolbar action opens it. Programmatic `open()` requires a user action. [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- Edge implements the same `chrome.sidePanel` API and describes the panel as a persistent extension context alongside the page. [Microsoft Edge sidebar extensions](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/sidebar)
- Firefox has the same product concept but a different API and manifest shape: `sidebar_action` and `browser.sidebarAction`. Its sidebar remains loaded while the user interacts with pages, until the sidebar or browser window closes. [Firefox sidebars](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Sidebars), [`sidebar_action`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action)

This removes Jelly Party's visual dependency on arbitrary page CSS, stacking contexts, fullscreen behavior, CSP, and page layout. It also gives chat a stable size and extension origin.

### It cannot remove page integration entirely

Sidebar pages are extension documents, not part of the active tab's DOM. They cannot discover or control a page's `HTMLVideoElement` directly. Jelly Party still needs a content-side video driver in each frame that might contain the active video.

Script injection requires `scripting` plus host access (or temporary `activeTab` access), and `allFrames` is the mechanism for reaching matching subframes. [Chrome Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting), [MDN script injection](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/executeScript)

The useful simplification is therefore:

- remove the injected chat iframe and its page styling;
- remove the top-frame UI/bridge manager;
- retain a small, UI-free video driver in relevant frames;
- route driver events and commands through extension runtime messaging, using tab/frame identity rather than page `postMessage("*")` traffic.

This is a substantially smaller and safer website-integration surface, but not a zero-injection architecture.

### One codebase needs browser adapters and browser-specific manifests

Chrome and Edge can share `side_panel`, the `sidePanel` permission, and `chrome.sidePanel`. Firefox needs `sidebar_action` and `browser.sidebarAction`.

The background declaration also differs. Chrome MV3 uses `background.service_worker`; Firefox still does not support it and uses `background.scripts`/an event page. MDN recommends specifying both for a cross-browser MV3 manifest, although producing explicit Chromium and Firefox manifests is easier to validate and submit. [MDN background manifest](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)

Firefox MV3 signing also requires an explicit extension ID, and current AMO submissions require data-collection declarations. [Firefox browser-specific settings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)

The practical shape is shared application code with two thin build targets:

1. Chromium manifest and sidebar adapter for Chrome and Edge.
2. Firefox manifest and sidebar adapter.

### Magic-link joining needs a deliberate portable gesture

Both Chrome/Edge `sidePanel.open()` and Firefox `sidebarAction.open()` are gated by user action. Firefox explicitly does not treat a click in an ordinary website handled by a content script—and then forwarded to a background handler—as an eligible extension user action. [Firefox user actions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/User_actions), [`sidebarAction.open()`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction/open)

The current join page requests optional host permission through a website content script and background message. That is not a reliable cross-browser user-gesture boundary and should not be the basis of the new Firefox flow.

A portable join flow is:

1. The magic-link page records a validated pending join payload with the extension.
2. It tells the user to click the Jelly Party toolbar icon.
3. That browser-owned action opens the side panel/sidebar on every launch browser.
4. If host access is missing, an explicit button inside the extension sidebar requests it.
5. The extension navigates the tab, injects the video driver, and joins the party.

Chrome and Edge may later reduce clicks where their gesture propagation permits it, but the portable flow should remain the tested baseline.

### State should not depend on an injected page

Party/chat state and the WebSocket client belong in the sidebar application, with only small handoff state (pending join, current tab/party association, user options) persisted through extension storage/background coordination. Closing the sidebar can intentionally leave the party for the initial release. This avoids making the party depend on Chromium service-worker lifetime while keeping behavior understandable across browsers.

If background party persistence while the sidebar is closed becomes a real requirement, decide and test that separately; it is not needed for the pragmatic launch.

## Recommendation

Adopt the sidebar architecture before production, with this boundary:

> Shared Svelte party UI in browser chrome; Chromium and Firefox sidebar adapters/manifests; a small per-frame video driver as the only streaming-page integration; runtime messages as the driver protocol; toolbar-click-based magic-link handoff as the portable baseline.

This aligns with the desired flexible architecture and removes the most fragile part of the current implementation—the injected visual UI—without pretending browser sidebars can control page video by themselves.

Do not build site-specific "drivers" yet. Keep the existing generic `HTMLVideoElement` controller and introduce a driver interface only around video discovery/control. Add a site-specific implementation only when a launch-supported service proves the generic driver insufficient. That keeps the seam ready without paying speculative complexity.

## Production implications discovered

- The current manifest is not yet Firefox-ready because it declares only a service-worker background and has no Firefox sidebar/signing metadata.
- The website's current browser detection sends Edge users to the Chrome listing; a dedicated Edge Store link should be part of release polish.
- Cross-browser end-to-end coverage must exercise the sidebar UI rather than the current injected iframe selectors.
- Optional per-origin access remains appropriate because video control still needs page access; the sidebar does not eliminate that permission.
