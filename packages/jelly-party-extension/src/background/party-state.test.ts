import { describe, expect, it } from "vite-plus/test";
import { MAX_CHAT_MESSAGES } from "jelly-party-lib";
import { initialPartyState, partyViewForTab, reducePartyState } from "./party-state";

const party = {
  partyId: "a".repeat(64),
  tabId: 7,
  tabUrl: "https://example.com/watch",
  tabTitle: "Friday night movie",
  selfId: "a",
};

describe("active party state", () => {
  it("shows the party only on its video tab and a return state elsewhere", () => {
    const state = reducePartyState(initialPartyState, { type: "started", ...party });

    expect(partyViewForTab(state, 7)).toMatchObject({ mode: "party", party });
    expect(partyViewForTab(state, 12)).toMatchObject({ mode: "away", party });
  });

  it("continues through unrelated tab changes but ends when its video tab closes", () => {
    const active = reducePartyState(initialPartyState, { type: "started", ...party });

    expect(reducePartyState(active, { type: "tab-removed", tabId: 12 })).toBe(active);
    expect(reducePartyState(active, { type: "tab-removed", tabId: 7 })).toEqual({ kind: "idle" });
  });

  it("keeps the connected party information needed when the sidebar is reopened", () => {
    let state = reducePartyState(initialPartyState, { type: "started", ...party });
    state = reducePartyState(state, { type: "connection", status: "connected" });
    state = reducePartyState(state, {
      type: "presence",
      peers: [{ id: "a", name: "Mira", emoji: "🩼" }],
      leaderId: "a",
    });
    state = reducePartyState(state, {
      type: "chat",
      entry: {
        id: 1,
        peer: { id: "a", name: "Mira", emoji: "🩼" },
        text: "Ready?",
        sentAt: 123,
      },
    });

    expect(partyViewForTab(state, 7)).toMatchObject({
      mode: "party",
      party: {
        status: "connected",
        peers: [{ name: "Mira" }],
        messages: [{ text: "Ready?" }],
      },
    });
  });

  it("clears stale connection errors after reconnecting", () => {
    let state = reducePartyState(initialPartyState, { type: "started", ...party });
    state = reducePartyState(state, { type: "notice", notice: "Could not connect" });
    state = reducePartyState(state, { type: "connection", status: "connected" });

    expect(state).toMatchObject({
      kind: "active",
      party: { status: "connected", notice: "" },
    });
  });

  it("keeps at most the latest party history limit in memory", () => {
    let state = reducePartyState(initialPartyState, { type: "started", ...party });
    state = reducePartyState(state, {
      type: "history",
      entries: Array.from({ length: MAX_CHAT_MESSAGES }, (_, index) => ({
        id: index + 1,
        peer: { id: "a", name: "Mira", emoji: "🪼" },
        text: `Message ${index + 1}`,
        sentAt: index + 1,
      })),
      hasMore: false,
    });
    state = reducePartyState(state, {
      type: "chat",
      entry: {
        id: MAX_CHAT_MESSAGES + 1,
        peer: { id: "b", name: "Noah", emoji: "🐳" },
        text: "Newest",
        sentAt: MAX_CHAT_MESSAGES + 1,
      },
    });

    expect(state.kind).toBe("active");
    if (state.kind === "active") {
      expect(state.party.messages).toHaveLength(MAX_CHAT_MESSAGES);
      expect(state.party.messages[0]?.id).toBe(2);
      expect(state.party.messages.at(-1)).toMatchObject({ text: "Newest" });
    }
  });

  it("stores structured video milestones in the same ordered history", () => {
    let state = reducePartyState(initialPartyState, { type: "started", ...party });
    state = reducePartyState(state, {
      type: "history",
      entries: [
        {
          id: 1,
          kind: "system",
          action: "party-started",
          peer: { id: "a", name: "Mira", emoji: "🪼" },
          destination: {
            url: "https://example.com/watch",
            title: "Friday night movie",
            revision: 1,
          },
          sentAt: 1,
        },
      ],
      hasMore: false,
    });
    state = reducePartyState(state, {
      type: "chat",
      entry: {
        id: 2,
        kind: "system",
        action: "video-changed",
        peer: { id: "a", name: "Mira", emoji: "🪼" },
        destination: {
          url: "https://example.com/watch/next",
          title: "The next movie",
          revision: 2,
        },
        sentAt: 2,
      },
    });

    expect(partyViewForTab(state, 7)).toMatchObject({
      mode: "party",
      party: {
        messages: [
          { kind: "system", action: "party-started" },
          { kind: "system", action: "video-changed" },
        ],
      },
    });
  });

  it("updates the shared destination while keeping the same party tab", () => {
    const active = reducePartyState(initialPartyState, { type: "started", ...party });
    const navigated = reducePartyState(active, {
      type: "destination",
      destination: {
        url: "https://example.com/watch/next",
        title: "The next movie",
        revision: 2,
      },
      atDestination: false,
    });

    expect(partyViewForTab(navigated, 7)).toMatchObject({
      mode: "party",
      party: {
        tabUrl: "https://example.com/watch/next",
        tabTitle: "The next movie",
        destinationRevision: 2,
        atDestination: false,
        hasVideo: false,
      },
    });
  });

  it("becomes sync-ready again after navigation and a later site grant", () => {
    let state = reducePartyState(initialPartyState, { type: "started", ...party });
    state = reducePartyState(state, {
      type: "destination",
      destination: {
        url: "https://videos.example/watch/next",
        title: "The next movie",
        revision: 2,
      },
      atDestination: false,
    });
    state = reducePartyState(state, {
      type: "tab-destination",
      tabId: party.tabId,
      atDestination: true,
    });
    state = reducePartyState(state, { type: "video", hasVideo: false, accessRequired: true });
    state = reducePartyState(state, { type: "video", hasVideo: true, accessRequired: false });

    expect(state).toMatchObject({
      kind: "active",
      party: {
        destinationRevision: 2,
        atDestination: true,
        hasVideo: true,
        accessRequired: false,
      },
    });
  });

  it("tracks the authoritative leader and compact activity", () => {
    let state = reducePartyState(initialPartyState, { type: "started", ...party });
    state = reducePartyState(state, {
      type: "presence",
      peers: [
        { id: "a", name: "Mira", emoji: "🪼" },
        { id: "b", name: "Noah", emoji: "🐳" },
      ],
      leaderId: "b",
    });
    state = reducePartyState(state, {
      type: "activity",
      activity: { id: 1, text: "🐳 Noah paused the video" },
    });

    expect(state).toMatchObject({
      kind: "active",
      party: {
        selfId: "a",
        leaderId: "b",
        activity: { text: "🐳 Noah paused the video" },
      },
    });
  });

  it("tracks an actionable local playback block", () => {
    const active = reducePartyState(initialPartyState, { type: "started", ...party });
    const blocked = reducePartyState(active, { type: "playback-blocked", blocked: true });

    expect(blocked).toMatchObject({
      kind: "active",
      party: { playbackBlocked: true },
    });
    expect(reducePartyState(blocked, { type: "playback-blocked", blocked: false })).toMatchObject({
      kind: "active",
      party: { playbackBlocked: false },
    });
  });

  it("prepends an older page of durable party chat", () => {
    let state = reducePartyState(initialPartyState, { type: "started", ...party });
    state = reducePartyState(state, {
      type: "history",
      entries: [
        {
          id: 2,
          peer: { id: "a", name: "Mira", emoji: "🪼" },
          text: "Newer",
          sentAt: 2,
        },
      ],
      hasMore: true,
    });
    state = reducePartyState(state, {
      type: "history",
      entries: [
        {
          id: 1,
          peer: { id: "b", name: "Noah", emoji: "🐳" },
          text: "Older",
          sentAt: 1,
        },
      ],
      hasMore: false,
    });

    expect(partyViewForTab(state, 7)).toMatchObject({
      mode: "party",
      party: { hasMoreHistory: false, messages: [{ id: 1 }, { id: 2 }] },
    });
  });

  it("does not duplicate persisted entries when a connection is welcomed again", () => {
    const entry = {
      id: 1,
      peer: { id: "a", name: "Mira", emoji: "🪼" },
      text: "Still here",
      sentAt: 1,
    };
    let state = reducePartyState(initialPartyState, { type: "started", ...party });
    state = reducePartyState(state, { type: "history", entries: [entry], hasMore: false });
    state = reducePartyState(state, { type: "history", entries: [entry], hasMore: false });

    expect(partyViewForTab(state, 7)).toMatchObject({
      mode: "party",
      party: { messages: [{ id: 1 }] },
    });
  });
});
