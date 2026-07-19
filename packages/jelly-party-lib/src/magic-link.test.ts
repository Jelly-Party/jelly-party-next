import { describe, expect, it } from "vite-plus/test";
import { buildMagicLink, parseMagicLink } from "./magic-link.js";

const partyId = "Abcdefghijklmnopqrstuv";

describe("magic links", () => {
  it("round-trips a party and destination video URL", () => {
    const link = buildMagicLink("https://invites.example", partyId, "https://video.test/watch?v=7");

    expect(parseMagicLink(link)).toEqual({
      partyId,
      destination: "https://video.test/watch?v=7",
      originPattern: "https://video.test/*",
    });
  });

  it.each([
    `https://invites.example/?party=${partyId}&video=javascript%3Aalert(1)`,
    `https://invites.example/?party=bad&video=https%3A%2F%2Fvideo.test%2Fwatch`,
    `https://invites.example/?party=${partyId}&video=https%3A%2F%2Fuser%3Apass%40video.test%2Fwatch`,
    `https://invites.example/?party=${partyId}`,
  ])("rejects unsafe or incomplete links", (link) => {
    expect(parseMagicLink(link)).toBeNull();
  });
});
