# Extension testing and publishing research

Research date: 2026-07-18. Primary, first-party sources only.

## Executive answer

Jelly Party can have high-confidence automated extension tests in both Chromium and Firefox, but they cannot honestly be described as Playwright tests in both browsers.

- Playwright officially loads extensions only in Chromium, using a persistent browser context. Google Chrome and Microsoft Edge removed the command-line flags Playwright used for side-loading, so Playwright explicitly requires its bundled Chromium rather than the branded store browsers. [Playwright extension documentation](https://playwright.dev/docs/chrome-extensions)
- Firefox has a supported automation path through Selenium and geckodriver. Selenium can install a built or temporary unsigned add-on, and geckodriver can switch from web content to privileged Firefox UI control. [Selenium Firefox documentation](https://www.selenium.dev/documentation/webdriver/browsers/firefox/), [geckodriver browser-UI flag](https://firefox-source-docs.mozilla.org/testing/geckodriver/Flags.html#allow-system-access)
- Neither normal Playwright page automation nor a portable WebDriver API directly models the branded browser's toolbar and native sidebar/side-panel chrome. The most robust automated acceptance seam is therefore the loaded extension, its background process, content script, local video page, backend, and actual extension UI document. Keep a very small manual smoke test for branded Chrome/Edge panel opening and store-installed browser behavior.

The recommended matrix is:

1. Run the complete two-peer create, link, join, chat, chat-scroll attach/detach, play, pause, and seek flow with the built Chromium extension in Playwright.
2. Run the same product flow with the built Firefox extension installed by Selenium/geckodriver. Use Firefox's supported sidebar command and browser-UI context only for the native sidebar boundary.
3. Keep pure protocol, magic-link, routing, scroll, and synchronization behavior in Vitest.
4. Before submission, manually smoke-test the packaged build in current branded Chrome, Edge, and Firefox and then upload drafts to all three store validators.

This is simple and vendor-supported. Forcing Firefox into Playwright would be the hackier, less supportable choice.

## What Playwright can prove

Playwright's extension guide says extensions work only in Chromium and must be launched in a persistent context. Its documented fixture loads the unpacked extension, observes the Manifest V3 service worker, derives the extension ID, tests content-script effects on a normal page, and navigates directly to an extension page such as `chrome-extension://<id>/popup.html`. [Playwright extension documentation](https://playwright.dev/docs/chrome-extensions)

Chrome's own extension E2E guide recommends Playwright or Puppeteer, says to test the built package, and explicitly recommends opening an extension UI's URL in a tab when the automation library cannot open that browser UI itself. [Chrome end-to-end testing guide](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing)

For Jelly Party, a Chromium acceptance test can therefore exercise real, packaged components:

- Manifest V3 service worker and runtime messaging.
- Content-script discovery and control of the local HTML video.
- The actual Svelte side-panel document, loaded under the extension origin.
- Two independent extension profiles connected to the local backend.
- Create/share/join, presence, chat, scroll attachment, sidebar state, permissions, play, pause, and seek.
- Service-worker-visible `chrome.sidePanel` configuration and lifecycle events where supported.

There are two limits worth stating precisely:

1. The official Playwright path uses bundled Chromium, not the installed Google Chrome or Edge binary. Playwright says Chrome and Edge removed the side-load flags it relied upon. [Playwright extension documentation](https://playwright.dev/docs/chrome-extensions)
2. `chrome.sidePanel.open()` may only be called in response to a user action, and the panel document must be a local packaged resource. The API can configure and observe tab-specific panels, but Playwright does not publish an API for clicking the browser's own toolbar or side-panel chrome. Testing the side-panel document directly is Chrome's recommended fallback for UI surfaces the automation library cannot open. [Chrome `sidePanel` API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [Chrome end-to-end testing guide](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing)

The second point is an inference from the two official APIs, not a Playwright statement that native side-panel UI can never be automated. It means a standard Playwright test should not depend on unstable browser-chrome selectors.

## What Firefox can prove

Playwright does not document a Firefox WebExtension loading path; its extension documentation expressly limits the feature to Chromium. Its service-worker APIs are also documented as Chromium-only. [Playwright extension documentation](https://playwright.dev/docs/chrome-extensions), [Playwright service-worker documentation](https://playwright.dev/docs/service-workers)

Firefox's supported alternatives are sufficient:

- Selenium's Firefox driver exposes `installAddon`, including temporary installation of an unsigned add-on directory or package. [Selenium Firefox documentation](https://www.selenium.dev/documentation/webdriver/browsers/firefox/)
- Mozilla's `web-ext run` also launches Firefox with a temporarily loaded extension, but it is primarily a development launcher/reloader, not a UI assertion framework. [Mozilla `web-ext` guide](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
- Marionette/geckodriver can control either web content or Firefox browser chrome. Starting with Firefox 138, geckodriver requires `--allow-system-access` before switching to its privileged browser-UI context. Mozilla explicitly describes that flag as browser UI testing support, while warning that the test process receives full browser-process privileges. [Marionette introduction](https://firefox-source-docs.mozilla.org/testing/marionette/Intro.html), [geckodriver flags](https://firefox-source-docs.mozilla.org/testing/geckodriver/Flags.html#allow-system-access)
- Firefox supports the reserved `_execute_sidebar_action` extension command, so an automated test can open or close the sidebar with a normal keyboard action instead of modifying profiles or invoking an internal extension method. [Firefox `commands` manifest documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands)

The Firefox flow should install the exact built extension, open the sidebar using its declared shortcut, and execute the same two-peer product assertions against local pages and the local backend. Browser-chrome inspection is Firefox-specific and may need occasional selector maintenance, but it is an officially supported testing mode rather than an undocumented launch hack.

Firefox sidebars are window-level UI: the same sidebar is displayed across a window's tabs, and its document is loaded or unloaded with the sidebar/window lifecycle. The test must therefore validate Jelly Party's intended Firefox behavior—active party view on the associated tab, inactive/return-to-party view elsewhere, closing without leaving, reopening, and explicit leave—rather than assert Chromium's different per-tab panel lifecycle. [Firefox sidebar documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Sidebars)

## Recommended acceptance boundary

One product flow should be expressed in shared scenario language and driven by two small browser adapters:

| Boundary              | Chromium                                                     | Firefox                                                            |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Install extension     | Playwright persistent context with bundled Chromium          | Selenium/geckodriver temporary add-on install                      |
| Open extension UI     | Direct packaged side-panel URL; assert `sidePanel` API state | `_execute_sidebar_action` shortcut; browser-UI context for sidebar |
| Video and join pages  | Normal automated pages                                       | Normal automated pages                                             |
| Background            | MV3 service worker                                           | Firefox background page/context                                    |
| Two peers             | Two isolated persistent contexts                             | Two isolated WebDriver sessions/profiles                           |
| Native browser chrome | Minimal manual Chrome/Edge smoke                             | Automatable with the supported privileged UI context               |

The high-value assertions are:

1. Both packages install and start without extension/background errors.
2. The toolbar/sidebar entry leads to the expected extension UI and correct tab association.
3. Creating a party captures the correct video URL and creates one background-owned session.
4. A magic link reaches the join page, grants only the destination origin after user action, navigates, and joins automatically where supported.
5. Both peers see presence and chat; messages are ephemeral.
6. Chat follows new messages only while attached to the bottom, preserves reading position when detached, exposes a new-message affordance, and reattaches explicitly or by scrolling to the bottom.
7. Play, pause, and seek propagate in both directions without echo loops and with acceptable time-from-end error.
8. Tab changes never control an unrelated tab. Chromium hides the contextual panel; Firefox displays the inactive party state.
9. Closing the panel/sidebar does not leave; reopening restores the session; explicit Leave and closing the video tab end it.
10. Missing-video, permission-denied, disconnect, and retry states are recoverable.

This should remain one or two broad flows, not a matrix of brittle component tests.

## Store-wide rules

### Remote code versus remote data

All three stores prohibit remotely hosted executable code for the relevant modern packages. That means no remotely loaded JavaScript, WebAssembly, dynamic executable logic, CDN libraries, or fetched strings/configuration interpreted as code.

It does **not** mean an extension cannot communicate with a backend:

- Chrome defines remotely hosted code as browser-executed JavaScript or WebAssembly loaded from outside the package. It expressly distinguishes non-executable resources and permits external data/services when the extension's executable logic remains self-contained and reviewable. [Chrome remote-hosted-code guidance](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code), [Chrome Manifest V3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- Mozilla requires add-ons to be self-contained and not load remote code for execution; it separately requires encrypted transport and accurate disclosure/control of transmitted data. [Firefox add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- Edge Manifest V3 likewise forbids loading and executing remote code while its submission form separately asks for backend/data disclosures. [Edge Manifest V3 migration guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/migrate-your-extension-from-manifest-v2-to-v3), [Edge publishing guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)

For Jelly Party, `wss://` party messages and state are application data and are allowed. They must be necessary to the watch-party purpose, securely transported, accurately disclosed, and subject to the store's user-data rules. The extension should bundle every static UI asset—including scripts, styles, fonts, icons, and images—even where a store might technically permit a remote non-code resource. That is the simplest common cross-store rule and makes review easier.

The destination video's network traffic belongs to the host page. Jelly Party's content script controls an existing HTML video; it should not proxy or re-host the video through the extension.

### Content Security Policy

- Chrome Manifest V3 requires extension logic to be packaged. Its extension-page CSP only permits local script sources, with narrowly defined WebAssembly and development exceptions; inline script, `eval`, and remote scripts are forbidden. [Chrome extension CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy), [Chrome security guidance](https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure)
- Firefox's default CSP likewise restricts extension scripts to local resources and disallows string evaluation. AMO rejects remote script injection even where an older manifest syntax could express it. [Firefox CSP documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_Security_Policy), [Firefox add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- Edge applies the Chromium Manifest V3 model and disallows remotely hosted code. [Edge Manifest V3 migration guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/migrate-your-extension-from-manifest-v2-to-v3)

An explicit production CSP such as `default-src 'self'; connect-src <production-wss-origin>` is a useful defense-in-depth choice if it does not block required browser APIs. Development-only localhost allowances must not enter store packages.

## Chrome Web Store runbook

Chrome Web Store submission should satisfy all of the following:

- Use Manifest V3. The Chrome Web Store no longer accepts Manifest V2 extensions. [Chrome Manifest V2 notice](https://developer.chrome.com/docs/extensions/mv2/tutorials/migration-to-manifest-v2)
- Upload a ZIP with `manifest.json` at its root and a version greater than the currently published version. Test the production build locally before upload. [Chrome preparation guide](https://developer.chrome.com/docs/webstore/prepare)
- Keep one narrow, readily understood purpose; request the minimum required and optional permissions; do not request capabilities for future use. [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies), [Chrome privacy FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- Bundle all executable code. Do not use remote JavaScript/Wasm, `eval`, `new Function`, executable fetched configuration, or a CDN runtime. [Chrome remote-code guidance](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- Use HTTPS/WSS, protect the publisher account with two-factor authentication, constrain externally connectable origins and web-accessible resources, validate messages from content scripts, and keep the CSP narrow. [Chrome security guidance](https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure)
- Keep the description, screenshots, icon, category, privacy fields, and claimed supported services current and accurate. Missing screenshots or misleading/outdated metadata can cause rejection or removal. [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- If the extension handles user data, publish an accurate, current privacy policy describing collection, use, sharing, and recipients; disclose the same behavior consistently in the dashboard and product. Transmit data using modern cryptography. [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- In the dashboard, justify every permission, declare no remote code only after auditing the archive, disclose user-data categories and uses, and provide reviewer test instructions. Complete Store Listing and Privacy before publishing. [Chrome publishing guide](https://developer.chrome.com/docs/webstore/publish/), [Chrome Web Store API prerequisites](https://developer.chrome.com/docs/webstore/using-api)

Broad optional host access is still subject to the minimum-permission policy. Jelly Party's user-triggered, per-origin optional grant is much easier to justify than required `<all_urls>`, but the listing and reviewer notes should explain why generic HTML video support requires it.

## Firefox AMO runbook

Firefox submission should satisfy all of the following:

- Upload the add-on package on the existing AMO listing so it is treated as an update and retains the identity. AMO accepts ZIP/XPI/CRX packages up to 200 MB and signs the submitted build. [AMO submission guide](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- Request only necessary permissions, remain self-contained, load no remote executable code, do not weaken page CSP, encrypt remote transport, avoid redundant files, and use unmodified release versions of third-party libraries. [Firefox add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- Provide reviewer instructions sufficient to run the create/join flow. Mozilla performs basic functional testing as well as code review. [Firefox add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- Because the distributed JavaScript is bundled/transpiled/minified, attach matching human-readable source and exact reproduction instructions to every version. Include the lockfile, build script, OS/tool versions, and everything required to reproduce the package. Dependencies may be bundled or downloaded only from their official package managers; obfuscation is forbidden. [AMO source submission guide](https://extensionworkshop.com/documentation/publish/source-code-submission/)
- Provide links for included third-party libraries in Notes for Reviewers when requested by the library guidance. [AMO third-party library guidance](https://extensionworkshop.com/documentation/publish/third-party-library-usage/)
- Any data transmitted outside the extension/browser must be limited to the product's stated function. Browsing activity may be transmitted only as part of the primary function. Use Firefox's built-in data-consent manifest where applicable, or supply a compliant in-extension consent/control experience for older supported Firefox versions. [Firefox add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- A privacy policy is required during submission when any data is transmitted from the user's device; it must say what is sent and how it is used. [AMO submission guide](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)

Firefox 140 introduced `browser_specific_settings.gecko.data_collection_permissions`. It is mandatory for extensions first submitted after 2025-11-03; existing extensions are not yet described by the current guide as mandatory on every update, but Mozilla says they will have to adopt it later. Adopting it now is prudent. [Firefox built-in consent guide](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/), [MDN `browser_specific_settings`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)

For Jelly Party, the likely taxonomy includes `personalCommunications` for chat, `personallyIdentifyingInfo` if a display name can identify a person, and a website/browsing category for the shared destination URL. This classification is an inference from Mozilla's taxonomy, not a reviewer ruling; it should be checked against the exact production payload and stated conservatively. [Mozilla data taxonomy](https://blog.mozilla.org/addons/2025/05/09/new-extension-data-consent-experience-now-available-in-firefox-nightly/)

The implicit-consent exception is probably too narrow for the entire active party session: Mozilla limits it to a direct, immediate, single user command and says passive, continuous, or background transmission requires explicit consent. A persistent WebSocket party involves continuing playback and chat transmission. Use the built-in manifest disclosure/consent path rather than relying solely on the extension name or Create button. [Firefox add-on policies, section 6.2](https://extensionworkshop.com/documentation/publish/add-on-policies/)

## Microsoft Edge Add-ons runbook

Edge submission should satisfy all of the following:

- Upload the production ZIP through the existing Partner Center listing and resolve its package validator. Edge's current public/hidden extension flow is Manifest V3. [Edge publishing guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension), [Edge Manifest V3 guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/manifest-v3)
- The extension must be production-ready, fully functional, stable, accurately represented, and free of broken URLs. If it requires a server, that server must be working during certification. [Edge Add-ons policies](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)
- Request only essential permissions and justify each one. Do not future-proof with unused permissions. [Edge Add-ons policies](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies), [Edge publishing guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- Do not load or execute remotely hosted code in Manifest V3. Keep code reviewable and unobfuscated. [Edge Manifest V3 migration guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/migrate-your-extension-from-manifest-v2-to-v3), [Edge Add-ons policies](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)
- Fill in the Privacy page's single purpose, permission justifications, remote-code declaration, data usage certifications, and accessible current privacy-policy URL. All fields must match actual behavior and metadata. [Edge publishing guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
- Disclose necessary personal-data handling at installation, use secure transport, keep the privacy policy current, and provide complete certification test steps. [Edge Add-ons policies](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)
- Keep descriptions and screenshots accurate and disclose the dependency on the Jelly Party service. [Edge Add-ons policies](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies)

## Evidence-informed release considerations

The product spec remains authoritative. Based on the sources above, a release checklist should
consider the following evidence-backed items:

1. **Two automation stacks, one product scenario.** Retain Playwright for the full Chromium loaded-extension flow and add a small Firefox Selenium/geckodriver flow. Do not add unsupported Playwright Firefox-extension launch flags.
2. **Manual branded-browser boundary.** Smoke-test toolbar action, actual side panel/sidebar, optional-permission prompts, close/reopen, and store archive installation in current Chrome, Edge, and Firefox.
3. **No remote executable content.** Audit the final archives, not just source. Every script, worker, Wasm module, style, font, icon, and UI image should be packaged. Permit only the configured HTTPS/WSS application endpoints.
4. **No production localhost.** Production manifests, CSP, content-script matches, and built bundles must contain no local test origin.
5. **Accurate data disclosure.** The product transmits at least a destination URL, display identity, party/chat content, and playback state to the party service. The privacy policy and all three store disclosures must describe actual payloads, purpose, retention, recipients, and deletion/ephemerality consistently.
6. **Firefox consent decision.** Prefer a Firefox minimum version that supports built-in data consent and declare the conservative required taxonomy; otherwise implement the older-version consent/control UI Mozilla requires.
7. **Reviewer-ready backend.** Deploy and health-check the production HTTPS/WSS backend and join page before submission. Edge explicitly requires dependent services to work during certification; the other stores also functionally review submissions.
8. **Reviewer reproduction.** Verify that the Firefox source archive can reproduce its submitted XPI/ZIP under the documented Nix/Vite+ workflow, while explaining any difference from Mozilla's default Ubuntu ARM64 reviewer environment.
9. **Draft validation.** Upload drafts to Chrome, Edge, and AMO before declaring the release publishable; local manifest checks do not replace store validation.

Addressing these items supports a strong release claim. Store review and branded-browser UI behavior
remain irreducible external validation boundaries.
