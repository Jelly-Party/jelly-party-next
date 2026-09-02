import { describe, expect, it } from "vite-plus/test";
import {
  MAX_CHAT_LENGTH,
  parseClientMessage,
  parsePartyId,
  type ClientMessage,
} from "./protocol.js";

const partyId = "Abcdefghijklmnopqrstuv";

describe("party capability IDs", () => {
  it("accepts a 22-character base64url capability", () => {
    expect(parsePartyId(partyId)).toBe(partyId);
  });

  it.each(["", "short", `${partyId}=`, "spaces are not allowed!!", "a".repeat(23)])(
    "rejects %j",
    (value) => {
      expect(parsePartyId(value)).toBeNull();
    },
  );
});

describe("client protocol validation", () => {
  it("accepts a bounded join message", () => {
    const message: ClientMessage = {
      type: "join",
      peer: { id: "11111111-1111-4111-8111-111111111111", name: "Mira", emoji: "🪼" },
      destination: { url: "https://example.com/watch", title: "Friday night movie" },
    };

    expect(parseClientMessage(JSON.stringify(message))).toEqual({ ok: true, value: message });
  });

  it("accepts bounded chat and finite playback messages", () => {
    expect(parseClientMessage(JSON.stringify({ type: "chat", text: "Hello!" }))).toEqual({
      ok: true,
      value: { type: "chat", text: "Hello!" },
    });
    expect(
      parseClientMessage(
        JSON.stringify({
          type: "playback",
          action: "seek",
          timeFromEnd: 12.5,
          destinationRevision: 2,
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        type: "playback",
        action: "seek",
        timeFromEnd: 12.5,
        destinationRevision: 2,
      },
    });
    expect(
      parseClientMessage(
        JSON.stringify({ type: "leader", peerId: "22222222-2222-4222-8222-222222222222" }),
      ),
    ).toEqual({
      ok: true,
      value: { type: "leader", peerId: "22222222-2222-4222-8222-222222222222" },
    });
    expect(
      parseClientMessage(
        JSON.stringify({
          type: "destination",
          destination: { url: "https://example.com/next", title: "Next video" },
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        type: "destination",
        destination: { url: "https://example.com/next", title: "Next video" },
      },
    });
  });

  it("accepts a positive history cursor", () => {
    expect(parseClientMessage(JSON.stringify({ type: "history", beforeId: 42 }))).toEqual({
      ok: true,
      value: { type: "history", beforeId: 42 },
    });
  });

  it.each([
    "not json",
    JSON.stringify({ type: "join", peer: { id: "x", name: "", emoji: "" } }),
    JSON.stringify({ type: "history", beforeId: 0 }),
    JSON.stringify({ type: "leader", peerId: "not-a-peer" }),
    JSON.stringify({ type: "chat", text: "x".repeat(MAX_CHAT_LENGTH + 1) }),
    JSON.stringify({
      type: "playback",
      action: "seek",
      timeFromEnd: Number.NaN,
      destinationRevision: 1,
    }),
    JSON.stringify({
      type: "playback",
      action: "rewind",
      timeFromEnd: 1,
      destinationRevision: 1,
    }),
    JSON.stringify({
      type: "destination",
      destination: { url: "javascript:alert(1)", title: "Bad" },
    }),
    JSON.stringify({ type: "unknown" }),
  ])("rejects malformed or unbounded input", (input) => {
    expect(parseClientMessage(input).ok).toBe(false);
  });
});
