# Use an atomic page-video interface

Each injected frame will expose one deep `PageVideo` module whose external interface consists of creation with an event sink, `apply(playbackIntent)`, and `dispose()`. A playback intent atomically identifies the selected media generation, desired paused state, and position relative to the end; the module hides discovery, replacement, readiness, command serialization, pause/seek/resume sequencing, echo suppression, and DOM event behavior behind typed results.

The runtime router selects between frames using advertised fitness and routes intents back to the exact media generation that advertised itself. Finite video-on-demand is the launch contract; stale targets, unavailable media, autoplay blocking, unsupported media, and timeouts are explicit outcomes rather than booleans or swallowed failures.

We deliberately reject both a DOM-shaped public interface of separate `play`, `pause`, and `seek` methods and a speculative public service-driver registry. The generic HTML5 implementation ships first; an internal adapter seam will be extracted only when a genuinely different service implementation exists, and every implementation must satisfy the same external `PageVideo` behavior contract.
