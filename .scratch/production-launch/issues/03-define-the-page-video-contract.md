# Define the page-video contract

Type: grilling
Status: resolved

## Question

What interface must generic HTML5 behavior and any future service-specific media implementation fulfill?

## Answer

Each frame exposes one deep `PageVideo` module created with an event sink and offering only `apply(playbackIntent)` and `dispose()`. Playback intent atomically carries the selected media generation, paused state, and position relative to the end. The module hides discovery, replacement, readiness, command serialization, playback sequencing, echo suppression, and DOM behavior; it returns typed outcomes and never applies stale intent to replacement media. Finite video-on-demand is the launch contract.

Do not publish a service-driver registry. Ship generic HTML5 behavior first; extract a private adapter seam only when a genuinely different second implementation exists, and make it pass the same external behavior contract.

Context: [ADR 0002](../../../docs/adr/0002-use-an-atomic-page-video-interface.md).
