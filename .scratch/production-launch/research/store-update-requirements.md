# In-place MV2 → MV3 store update requirements

Research snapshot: 2026-07-18. Sources are first-party store/browser documentation. **Confirmed** means the linked documentation states the fact; **Recommendation** is launch advice derived from it; **Unknown** means the store's current public documentation does not promise the capability or timing.

## Executive recommendation

Ship three browser-specific packages through the **existing** Chrome Web Store item, AMO add-on page, and Edge Partner Center product. Use the same monotonically increasing `1–4`-component numeric version in all three packages, preserve Firefox's existing add-on ID exactly, request only permissions exercised by the submitted build, and update all privacy/listing fields to describe Jelly Party 2 rather than the legacy product.

Prepare one reviewer document and test party account that works without paid streaming subscriptions: exact install/start/join/chat/play/pause/seek steps on an openly accessible test video, expected sidebar behavior, backend URLs, and the MV2→MV3 change summary. Keep the old backend alive through review; point the submitted builds at `v2.jelly-party.com` and make that service fully functional before submitting.

Operationally, use Chrome's deferred publishing, but do **not** design the launch around simultaneous approval or percentage rollout: Firefox and Edge do not document equivalent extension controls. Treat rollback as Chrome/Firefox-only and have a forward-fix package ready for Edge.

## Cross-store release gate

- **Confirmed:** MV3 packages may not execute remotely hosted code in Chrome/Chromium; JavaScript must be packaged with the extension. Chrome also replaces background pages with a service worker. [Chrome MV3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3) Edge's submission flow likewise says remote code is not permitted for MV3. [Edge publishing/privacy flow](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- **Confirmed:** Firefox MV3 is not manifest-identical to Chromium: it requires an explicit Gecko ID for signing; Firefox uses event-driven `background.scripts` rather than Chromium's service-worker model, and has Firefox-only manifest keys such as `sidebar_action`. [Firefox browser-specific settings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings) [Firefox MV3 migration guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/) [Firefox manifest keys](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
- **Recommendation:** generate separate `chrome`, `edge`, and `firefox` manifests from shared source. Chrome/Edge should declare `sidePanel`/their Chromium background configuration; Firefox should preserve `sidebar_action`, `background.scripts`, and the existing `browser_specific_settings.gecko.id`.
- **Recommendation:** use a version such as `2.0.0` in all stores. The common safe shape is one to four dot-separated integers; AMO accepts up to nine digits per component while Chrome limits each component to `0..65535`. [Firefox/Chrome version formats](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version)
- **Recommendation:** compare the new required and host permissions against the currently published packages before upload. Move per-site access to optional/runtime host permission where practical; adding permissions can interrupt automatic adoption.
- **Recommendation:** archive the exact submitted ZIP/XPI inputs, source bundle, lockfile, generated manifests, checksums, store text/assets, and reviewer notes for every release.

## Chrome Web Store

### Identity, package, version, and signing

- **Confirmed:** update the existing dashboard item with **Upload New Package**; upload a complete ZIP containing changed and unchanged packaged files. The manifest `version` must be greater than the published version. This preserves the existing store item/update channel instead of creating a second listing. [Update a Chrome Web Store item](https://developer.chrome.com/docs/webstore/update/)
- **Confirmed:** publishing/updating requires 2-step verification on the owning Google account. [Chrome Web Store API prerequisites](https://developer.chrome.com/docs/webstore/using-api)
- **Confirmed:** ordinary dashboard updates are ZIP uploads. **Verified CRX Uploads** is an optional opt-in protection; once enabled, future updates must be signed with the registered RSA key, and losing it requires support intervention. [Chrome update and Verified CRX Uploads](https://developer.chrome.com/docs/webstore/update/)
- **Recommendation:** verify whether the legacy item already opted into Verified CRX Uploads before building the release procedure; do not opt in during the launch unless secure key custody is already solved.

### Permissions, warnings, privacy, and review access

- **Confirmed:** an update that adds warning-triggering permissions prompts users to accept them or leaves/disables the extension; broad host/sensitive execution permissions also tend to lengthen review. [Chrome update behavior](https://developer.chrome.com/docs/webstore/update/) [Chrome review process](https://developer.chrome.com/docs/webstore/review-process)
- **Confirmed:** the Privacy practices tab requires a narrow single-purpose statement, justification for every declared permission, remote-code declaration, user-data categories/limited-use certifications, and a privacy-policy URL describing collection, use, and disclosure. Broader-than-needed permissions can cause rejection. [Chrome privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/)
- **Confirmed:** data handling must be disclosed even if processing/storage stays on-device; extensions handling user data must publish a privacy policy and securely transmit it. [Chrome User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/)
- **Confirmed:** the dashboard has a **Test instructions** tab for instructions and credentials where needed. [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/)
- **Recommendation:** explain why the narrow page-driver permissions are required, explicitly state that UI lives in the browser side panel, identify every datum sent to `v2.jelly-party.com` (party/chat/playback state, operational logs if any), and supply a no-subscription test path.

### Listing assets

- **Confirmed:** current listing guidance calls for a 128×128 store icon, at least one 1280×800 screenshot (up to five), and a 440×280 small promo tile; a 1400×560 marquee is optional. Listing copy, privacy fields, screenshots, icon, and promotional images must be current and accurate. [Chrome listing fields/assets](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) [Chrome listing policy](https://developer.chrome.com/docs/webstore/program-policies/policies)
- **Recommendation:** replace legacy screenshots and description before submission. Show the actual side panel plus a supported video page; do not imply that best-effort services are officially supported.

### Publication, rollout, rollback, and timing

- **Confirmed:** deferred publishing holds an approved update for manual release for up to 30 days. [Chrome update/deferred publishing](https://developer.chrome.com/docs/webstore/update/)
- **Confirmed:** percentage rollout is available only to already-published items with **over 10,000 seven-day active users**; the percentage can be increased without review. It is unavailable for warned/taken-down current versions and only one partial rollout can exist. [Chrome percentage rollout](https://developer.chrome.com/docs/webstore/update/)
- **Confirmed:** Web Store rollback republishes the immediately previous version under a new higher version; it becomes live in the store within about a minute without review, after which normal client update timing applies. [Chrome rollback](https://developer.chrome.com/docs/webstore/rollback)
- **Confirmed:** most reviews finish within a few days but may take weeks; Google says to contact support after three weeks. As of April 2026, the official page warns of elevated review times. Significant code changes and broad permissions can take longer. [Chrome review timing](https://developer.chrome.com/docs/webstore/review-process)
- **Recommendation:** submit with deferred publishing at least 2–3 weeks before the desired launch window, and keep the previous Chrome package as a tested rollback target.

### 2025–2026 policy/platform changes

- **Confirmed:** Chrome disabled MV2 everywhere on 2025-07-24; all remaining MV2 items are scheduled for removal from the Chrome Web Store on 2026-08-31. [Chrome MV2 support timeline](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline)
- **Confirmed:** current policy explicitly calls out side-panel extensions that hijack browsing/search as a single-purpose violation, and rejects inaccurate/outdated listing or privacy metadata. [Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- **Recommendation:** frame and implement the side panel strictly as watch-party UI; never replace search/navigation or make claims beyond tested service support.

## Firefox Add-ons (AMO)

### Identity, package, version, and signing

- **Confirmed:** upload the update from the **existing add-on's AMO page** so AMO recognizes it as a new version rather than a new add-on. [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- **Confirmed:** MV3 signing requires an explicit `browser_specific_settings.gecko.id`. For an MV2→MV3 update, use the permanent ID of the current AMO add-on; the listing exposes it via **Copy add-on ID**. [Extensions and the add-on ID](https://extensionworkshop.com/documentation/develop/extensions-and-the-add-on-id/)
- **Confirmed:** release/Beta Firefox only installs Mozilla-signed extensions. AMO performs the signing. [Signing and distribution overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- **Confirmed:** Firefox updates only to a greater version. The MV3 version must be higher than earlier listed or experimental versions. [Distribute MV2 and MV3 extensions](https://extensionworkshop.com/documentation/publish/distribute-manifest-versions/)
- **Action:** retrieve the old add-on ID before generating the Firefox manifest, upload from that product's **Upload New Version** flow, and omit `update_url` for the normal listed AMO channel.

### Permissions, warnings, privacy, and review access

- **Confirmed:** Firefox normally asks users to approve additional update permissions before installing the update. Mozilla's MV3 migration guide documents an important exception/known issue: newly added MV3 **host permissions** are not shown to users on update. [Request the right permissions](https://extensionworkshop.com/documentation/develop/request-the-right-permissions/) [Firefox MV3 migration guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)
- **Confirmed:** if any data leaves the device, the AMO listing requires a privacy policy; **Notes for Reviewers** can contain dummy-login details, source/build context, or similar testing help. [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- **Confirmed:** bundled/minified/generated code requires a source archive for every version, reproducible build instructions, exact tool versions, and a lockfile; obfuscated code is prohibited. Mozilla's documented default build environment is Ubuntu 24.04.4 ARM64 with Node 24.14.0/npm 11.9.0, unless the submission specifies otherwise. [AMO source-code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/)
- **Recommendation:** supply the Vite+/Nix build instructions and lockfile in the source upload, explicitly stating the required environment rather than assuming Mozilla's default Node/npm build. The built output must reproduce byte-for-byte.

### Listing assets

- **Confirmed:** AMO's update flow retains a listing but expects current name, summary, description, categories, support details, license, privacy policy, and release notes. Mozilla recommends 32×32 and 64×64 icons and 1280×800 (or 1.6:1) screenshots. [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/) [Create an appealing AMO listing](https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/)
- **Recommendation:** update the legacy description, release notes, icon, and screenshots to the sidebar product in the same submission cycle.

### Publication, rollout, rollback, and timing

- **Confirmed:** listed versions are published/available after submission/validation and may be manually reviewed at any time; Mozilla does not publish a guaranteed review SLA on the current submission documentation. [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/) [Signing and distribution overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- **Confirmed:** AMO does not support pre-release channels. Limited beta distribution requires a separately signed, self-hosted build/update channel. [Distribute pre-release versions](https://extensionworkshop.com/documentation/publish/distribute-pre-release-versions/)
- **Confirmed:** AMO rollback is available when at least two versions are approved. It republishes the immediately previous listed version under a version higher than every prior submission; clients normally receive it on their next update check, by default within 24 hours. [AMO version rollback](https://extensionworkshop.com/documentation/publish/version-rollback/)
- **Unknown:** no first-party AMO documentation found for deferred/scheduled publication or percentage rollout of a listed extension. Do not assume either exists.
- **Recommendation:** pre-test a self-distributed signed build internally, then upload the listed release only when ready for it to become public; keep the previous approved AMO version rollback-ready.

### 2025–2026 policy/platform changes

- **Confirmed:** Firefox's built-in data-collection consent is supported from desktop Firefox 140. New add-ons created from 2025-11-03 must declare `browser_specific_settings.gecko.data_collection_permissions`; updates to older add-ons are temporarily exempt but Mozilla says they will be required later, without a published date. [Firefox built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/) [Firefox browser-specific settings](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)
- **Confirmed:** Mozilla's first-party rollback workflow was documented in the AMO guidance updated 2025-09-16; it supports Developer Hub and Submission API rollback under the eligibility/version rules above. [AMO version rollback](https://extensionworkshop.com/documentation/publish/version-rollback/)
- **Confirmed:** current (April 2026) policy requires necessary-only transmission and user control; browsing activity may be transmitted only as part of the primary function. [Firefox Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- **Recommendation:** adopt `data_collection_permissions` in this MV3 update now (including `required: ["none"]` only if truthful), target Firefox 140+ if that is acceptable, and align it exactly with the privacy policy and runtime behavior rather than relying on the legacy-item exemption.

## Microsoft Edge Add-ons

### Identity, package, version, and signing

- **Confirmed:** select the **existing extension** in Partner Center, update its package/metadata, and publish; changing the package requires a higher manifest version. Using the existing Partner Center product/Product ID is what makes this an in-place update. [Update an Edge extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/update-extension) [Edge Update API terminology](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api)
- **Confirmed:** Partner Center accepts a ZIP and the publishing process converts store-hosted packages to CRX. [Edge extension hosting](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/hosting-and-updating)
- **Recommendation:** do not include a developer `update_url` in the store build. Partner Center owns distribution; preserve the existing Product ID by updating, never recreating, the listing.

### Permissions, warnings, privacy, and review access

- **Confirmed:** permissions are declared in `permissions`, `optional_permissions`, and MV3 `host_permissions`; some generate consent warnings. Store policy prohibits unnecessary/future-proof permissions. [Edge permissions](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/declare-permissions) [Edge Add-ons policies](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)
- **Confirmed:** the new Partner Center Privacy page requires a single-purpose description, justification for every permission, remote-code declaration, data-use disclosure/certifications, and privacy-policy URL; incomplete/inconsistent disclosures may delay or fail certification. [Publish an Edge extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- **Confirmed:** Notes for certification should contain test credentials, hidden-feature access, regional differences, and—on updates—a summary of changes. Policy requires a working server and a test account, or a reasonable explanation why credentials cannot be supplied. [Edge certification notes](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension) [Edge testability policy](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)
- **Unknown:** Microsoft documents permission warnings but does not clearly document the precise installed-user behavior when a store update adds warning-triggering permissions. Test this with the exact packaged update; do not infer Chrome behavior as a contractual Edge fact.

### Listing assets

- **Confirmed:** for each package language, Partner Center requires a description (250–10,000 characters) and square logo (recommended 300×300, minimum 128×128). It allows up to six optional screenshots at 640×480 or 1280×800, an optional 440×280 small tile, and optional 1400×560 large tile. Name/short description come from the manifest and require re-upload to change. [Edge store-listing fields](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- **Recommendation:** replace the legacy description/logo/screenshots and keep localized fields aligned with the manifest and actual service-support promise.

### Publication, rollout, rollback, and timing

- **Confirmed:** selecting **Publish** starts certification; after passing, the update is published. Certification can take up to seven business days. Canceling/editing during certification removes it from the queue and starts a new review. [Update an Edge extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/update-extension) [Edge publishing flow](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- **Unknown:** current first-party Edge extension documentation does not expose deferred/scheduled publication, percentage rollout, or a previous-version rollback facility for Partner Center extensions. Windows-app gradual rollout documentation is not evidence that Edge Add-ons supports it.
- **Recommendation:** submit Edge with a full seven-business-day buffer. Assume approval publishes immediately. For rollback, keep a higher-version package containing the previous known-good code ready to submit as an ordinary update, subject to another certification.

### 2025–2026 policy/platform changes

- **Confirmed:** Edge still lists its own MV2 shutdown/update deadlines as **TBD**, while Partner Center has refused new MV2 extensions since July 2022 and explicitly permits existing products to submit MV3 migrations. [Edge MV3 timeline](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/manifest-v3)
- **Confirmed:** Partner Center's dedicated Privacy page rollout was planned to reach all developers by the end of May 2026, replacing older privacy fields in Properties. [Edge publishing/privacy flow](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- **Recommendation:** complete the new Privacy page even if the legacy product still shows older Properties fields, and treat Microsoft's still-TBD MV2 retirement date as irrelevant: this release should be MV3-only.

## Submission packet checklist

1. Export and record the three existing identities: Chrome item ID, Firefox add-on ID, Edge Product ID.
2. Record every currently published version and choose one higher cross-store version.
3. Build three store packages; verify no remote executable code and no store-build `update_url`.
4. Diff old/new permissions and manually test install plus update permission prompts in Chrome, Firefox, and Edge.
5. Publish an accurate privacy policy covering party/chat/playback state, URL/site data, retention, deletion, logs/metrics, processors, and transport security; make store declarations match it exactly.
6. Prepare reproducible Firefox source/build upload with Nix/Vite+ instructions and lockfile.
7. Refresh listing copy, icons, screenshots, support URL, release notes, and supported-vs-best-effort service claims.
8. Prepare reviewer/test notes and a durable no-subscription test flow; keep `v2.jelly-party.com` healthy throughout review.
9. Submit Chrome deferred, Firefox only when public-ready, and Edge with an immediate-on-approval assumption.
10. Archive approved artifacts and rehearse Chrome rollback, AMO rollback, and Edge forward-fix before public cutover.
