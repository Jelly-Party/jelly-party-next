# Research extension privacy and security obligations

Type: research
Status: resolved

## Question

What privacy, security, data-use, permission-minimization, logging, and store-disclosure obligations apply to the confirmed sidebar, optional-host-permission, chat, and Grafana-observability design?

## Answer

The sidebar plus a UI-free per-origin video driver is compatible with Chrome, Firefox, and Edge policy if access is runtime-granted for the current origin, the listing/privacy policy plainly disclose the ephemeral chat/playback relay, and all executable code/assets are packaged locally. Chat is **personal communications**; nicknames may be identifying information; playback actions/video state are **website activity/content**; URLs/domains are **browsing activity/content**, even when locally processed under Chrome's policy. Firefox should target 140+ and declare required `personalCommunications`, `personallyIdentifyingInfo`, `websiteActivity`, and `websiteContent`; omit `browsingActivity` only after proving URLs never leave the browser.

Launch with no client telemetry. Relay party/chat only in memory, use HTTPS/WSS, strict CSP/runtime messaging, and a ≥128-bit party capability. Logs sent through Alloy must be allowlisted and must never contain chat, names, party/peer IDs, URLs, video metadata, IPs, headers, or frames. The current code logs several of those fields and forwards whole Docker logs, and extension CSS remotely imports Google Fonts; both must be fixed before production. Use sanitized fixed event names and aggregate metrics only, disclose Grafana Cloud as a provider, verify its actual region/retention, and adopt the shortest available retention.

Full cited report: [Jelly Party 2.0 extension privacy and security obligations](../research/privacy-security-obligations.md)
