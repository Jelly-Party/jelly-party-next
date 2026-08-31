import { describe, expect, it } from "vite-plus/test";
import { MAX_CHAT_MESSAGES } from "jelly-party-lib";
import { initialPartyState, partyViewForTab, reducePartyState } from "./party-state";

const party = {
  partyId: "abcdefghijklmnopqrstuv",
  tabId: 7,
  tabUrl: "https://example.com/watch",
  tabTitle: "Friday night movie",
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

  it("keeps at most the latest chat message limit in memory", () => {
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
      expect(state.party.messages.at(-1)?.text).toBe("Newest");
    }
  });

  it("keeps the destination fixed and pauses sync when its tab navigates away", () => {
    const active = reducePartyState(initialPartyState, { type: "started", ...party });
    const navigated = reducePartyState(active, {
      type: "tab-destination",
      tabId: 7,
      atDestination: false,
    });

    expect(partyViewForTab(navigated, 7)).toMatchObject({
      mode: "party",
      party: {
        tabUrl: party.tabUrl,
        tabTitle: party.tabTitle,
        atDestination: false,
        hasVideo: false,
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
});
