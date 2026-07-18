# Choose the store and protocol rollout

Type: grilling
Status: resolved

## Question

How should existing store users and the old backend transition to Jelly Party 2.0?

## Answer

Publish Jelly Party 2.0 as in-place MV3 updates to the existing Chrome, Firefox, and Edge listings. Do not implement dual-protocol compatibility. New clients use `wss://v2.jelly-party.com` on the new VPS while old clients remain on `ws.jelly-party.com` during store review and a short propagation grace period. Retire the old backend after the grace period; keep the new hostname stable to avoid another extension release.
