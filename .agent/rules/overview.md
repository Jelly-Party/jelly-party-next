---
trigger: always_on
---

# Project Overview

Jelly Party is a Webextension that synchronizes video playback across participants in a Jelly Party.

This project is a rewrite of the original project (which you can find in the "legacy" folder), that ports it to modern, simple Svelte.

It comprises of a pnpm monorepo with the following packages:
- jelly-party-extension: The webextension that synchronizes video playback.
- jelly-party-server: The server that enables party communication.
- jelly-party-join: A simple website that enables party joining.
- jelly-party-website: The website that explains the project.
- jelly-party-status: Simple status website that shows the status of Jelly Party components and some stats.

With the rewrite, we're changing a few things:
- Full port to modern Svelte 5
- Sidebar removal: Rather than a sidebar, which is error prone and needs custom CSS for each website, we're planning a hover that upon click minimizes/maximizes the Jelly Party Chat Window.
- Tailwind for CSS
- Move to Manifest V3
- Replacement of the customization and avatar creation with a (random but configurable) Emoji.
- Complete removal of integration with ELK stack, we're switchting to simple idiomatic cloud-hosted Grafana for logs & metrics.
- KISS and simplification where it makes sense.
- Simple orchestration & building via pnpm, with a single Dockerfile that defines all targets.
- Idiomatic and simple tests, and the ability to load the extension for manual testing

Crucially, we want to keep the same:
- Design & UX
- Synchronization & Chat Features
- Video playback logic, in particular playback synchronization
- API compatibility in between the old and new extensions, for a seamless upgrade path

# Grounding Rule: Search First for Uncertain/Evolving Tech

You must ALWAYS "Stop and Search" when encountering a library, framework, or API that is:
1.  **Alpha/Beta or Rapidly Evolving** (e.g., Zero Sync, young open-source projects).
2.  **Not Fully Known** or where you are less than 100% certain of the specific API signature.
3.  **Potentially Hallucinated** due to your training data cutoff conflicting with recent versions.