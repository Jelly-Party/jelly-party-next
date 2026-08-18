import { describe, expect, it } from "vite-plus/test";
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

  it("updates the destination while keeping the party attached to the same tab", () => {
    const active = reducePartyState(initialPartyState, { type: "started", ...party });
    const navigated = reducePartyState(active, {
      type: "tab-updated",
      tabId: 7,
      tabUrl: "https://example.com/episode-2",
      tabTitle: "Episode two",
    });

    expect(partyViewForTab(navigated, 7)).toMatchObject({
      mode: "party",
      party: { tabUrl: "https://example.com/episode-2", tabTitle: "Episode two" },
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
