# Sidebar API standardization research

Research date: 2026-07-18. Primary sources only.

## Executive answer

There is now a credible standards path, but not yet a portable Chrome-style per-tab sidebar API.

Chrome, Firefox, and Safari representatives agreed in March 2025 that a unified `sidebar` namespace is desirable, if the existing models can be mapped cleanly. Firefox explicitly said it was open to a contextual side-panel concept, and Safari volunteered to drive a proposal. In April 2026, the WECG recorded that all vendors remained supportive at a high level—but still needed concrete proposals and implementation bugs. The tracking issue remains open and has no specification PR attached. [WECG unified-sidebar issue](https://github.com/w3c/webextensions/issues/128), [WECG Berlin minutes](https://github.com/w3c/webextensions/blob/main/_minutes/2025-03-27-berlin-f2f.md#issue-128-unified-sidebar-proposal)

The institutional outlook improved materially in May 2026: W3C chartered a formal WebExtensions Working Group through May 2028. Its mission is to specify the common core of cross-browser extension APIs, with normative specifications and interoperability tests. Sidebar APIs are within its broad scope, but the charter neither names sidebar as a deliverable nor promises that browser-specific UI behavior will converge. It also explicitly anticipates browser-specific APIs beyond the common core and places UI specifics out of scope. [approved WG announcement](https://lists.w3.org/Archives/Public/public-webextensions/2026May/0000.html), [approved WG charter](https://www.w3.org/2026/05/webextensions-wg-charter.html)

Therefore:

- Expect a common namespace and a useful common functional subset eventually: credible, but no announced delivery date.
- Expect Firefox and Safari to reproduce Chrome's exact persistent, independent document instance per tab: possible, but not something the standards record currently supports promising.
- For Jelly Party today, use browser-specific APIs behind a small adapter and design product semantics around the lowest common behavioral denominator. Do not wait for standardization.

## What is agreed versus still open

### Agreed direction

At the March 2025 WECG face-to-face, vendor representatives resolved: “Chrome, Firefox, Safari in favor of a unified `sidebar` namespace if feasible.” Safari supported introducing a new name/alias and took the action to create a proposal superseding Firefox's `sidebarAction` and Chromium's `sidePanel`. Firefox said it was open to contextual side panels and intended to align for cross-browser compatibility. [WECG Berlin minutes](https://github.com/w3c/webextensions/blob/main/_minutes/2025-03-27-berlin-f2f.md#issue-128-unified-sidebar-proposal)

The canonical issue carries supportive labels for Chrome, Firefox, and Safari. Its latest vendor update, from the April 2026 London face-to-face, says the browsers are supportive “at a high-level” but need concrete proposals and implementation bugs. The issue remains open, unassigned, without a milestone or linked development work. [WECG issue #128](https://github.com/w3c/webextensions/issues/128)

### Not agreed

There is no published unified-sidebar WebIDL, manifest definition, proposal document, specification section, conformance test, or implementation schedule. The current WebExtensions draft does not define `sidebar`, `sidePanel`, or `sidebarAction`; it remains a sparse draft and, as published on 5 June 2026, still identifies itself as a Community Group Report rather than a W3C Standard. [current WebExtensions draft](https://w3c.github.io/webextensions/specification/)

Most importantly for Jelly Party, the WECG has not agreed on Chrome's exact per-tab instance/lifecycle semantics:

- The proposal to make action-click automatically create “one instance per tab” is still an open proposal with no browser-support labels. It documents Chrome's current manual recipe (`setOptions({ tabId, path })`, then `open({ tabId })`) and its drawbacks. [WECG issue #515](https://github.com/w3c/webextensions/issues/515)
- The separate issue about tab-specific behavior when switching tabs remains open. Its current positions are Firefox “needs triage” and Safari “neutral”; it originally documents behavioral differences even between Chrome and Edge. [WECG issue #588](https://github.com/w3c/webextensions/issues/588)

These open issues are stronger evidence about the specific lifecycle question than the high-level agreement on a common namespace.

## Current browser implementations

### Chrome

Chrome has the strongest contextual model. `sidePanel.setOptions()` can create tab-specific configuration; its documentation says that even when a tab-specific panel and the default panel use the same path, they are different instances. A panel disabled on other tabs is hidden on tab switch and automatically shown again when returning to the tab where it was open. `open({ tabId })` opens only for that tab when a tab-specific panel exists. [Chrome `sidePanel` API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)

This directly supports the user experience “the party panel belongs to tab A and disappears in tab B.” It is shipping behavior, not a standard.

### Microsoft Edge

Edge implements the Chromium `chrome.sidePanel` surface and documents `setOptions({ tabId })` and `open({ tabId })`. Its official documentation still lists a known issue: a site-specific sidebar is not automatically displayed again when returning to a tab in which it was previously open. That means common API spelling does not yet guarantee Chrome-identical lifecycle behavior. [Microsoft Edge sidebar documentation](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/sidebar)

### Firefox

Firefox exposes `sidebarAction`, not `sidePanel`. It supports selecting a panel document globally, per window, or per tab through `sidebarAction.setPanel({ tabId, panel })`. However, Firefox defines a sidebar as a pane belonging to the browser window: each window displays its sidebar across every tab and gets one sidebar document instance; that document is unloaded when the user closes the sidebar or window. [Firefox `setPanel()`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction/setPanel), [Firefox sidebar lifecycle](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Sidebars)

Thus Firefox already has “tab-specific panel selection,” but not Chrome's documented model of an independent persistent panel instance attached to each tab. The WECG record says Firefox is open to a contextual model, not that it has committed to Chrome's lifecycle.

### Safari

Safari currently has no documented `sidePanel` or `sidebarAction` WebExtension API comparable to Chrome or Firefox. Apple nevertheless participates directly in WECG, supported the unified namespace, stated that it had examined implementing the existing models, and volunteered to drive the common proposal. That is meaningful implementer interest, but it is not an implementation commitment or schedule. [WECG Berlin minutes](https://github.com/w3c/webextensions/blob/main/_minutes/2025-03-27-berlin-f2f.md#issue-128-unified-sidebar-proposal), [Apple Safari Web Extensions documentation](https://developer.apple.com/documentation/safariservices/safari-web-extensions)

## How much confidence should we place in future convergence?

### High confidence: a formal venue and shared intent exist

The May 2026 WebExtensions WG is a real standards-track improvement over the earlier Community Group. Its charter calls for normative WebExtensions specifications, Candidate Recommendation snapshots, WPT-based tests, and expressions of interest from at least two implementers for new features. Its mission is explicitly cross-browser interoperability. [WebExtensions WG charter](https://www.w3.org/2026/05/webextensions-wg-charter.html)

### Moderate confidence: a common sidebar API will emerge

All three non-Edge vendor representatives have expressed support, the issue has survived repeated face-to-face triage, and Apple volunteered to develop the mapping. This supports expecting eventual convergence on naming and a functional subset.

### Low confidence: exact Chrome per-tab instance semantics will become common soon

No concrete unified proposal exists; the per-tab-instance proposal lacks implementer positions; the lifecycle-consistency issue is still untriaged by Firefox and merely neutral for Safari; and Firefox's underlying UI lifecycle differs from Chrome's. The new WG charter also says UI specifics are out of scope and browsers will continue to expose browser-specific features. It would be speculation to predict exact parity or a timeframe.

## Practical implication for Jelly Party

Implement against current reality with a narrow browser adapter:

- Chromium: use a tab-specific side panel for the party tab so it disappears on other tabs.
- Firefox: treat the physical sidebar as window-scoped; when another tab is active, show an inactive/return-to-party state or allow the user to close the UI without ending the party.
- Keep party ownership and connection lifetime independent from the sidebar document. This remains correct even if a future unified API improves presentation, and avoids coupling product semantics to browser UI lifecycle.

If a future unified `browser.sidebar` API ships with sufficient common behavior, the adapter can collapse. The product/session model should not assume that outcome.
