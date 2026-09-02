import { describe, expect, it } from "vite-plus/test";
import { buildMagicLink, parseMagicLink } from "./magic-link.js";

const partyId = "a".repeat(64);

describe("magic links", () => {
  it("round-trips a party and destination video URL", () => {
    const link = buildMagicLink("https://invites.example", partyId, "https://video.test/watch?v=7");

    expect(link).toBe(`https://invites.example/#${partyId}@video.test/watch?v=7`);
    expect(parseMagicLink(link)).toEqual({
      partyId,
      destination: "https://video.test/watch?v=7",
      originPattern: "https://video.test/*",
    });
  });

  it("preserves uncommon HTTP ports, paths, queries, and fragments", () => {
    const destination = "http://localhost:4173/watch/a%20film?episode=2#chapter-3";
    const link = buildMagicLink("https://invites.example/join", partyId, destination);

    expect(link).toBe(
      `https://invites.example/join#${partyId}@http://localhost:4173/watch/a%20film?episode=2#chapter-3`,
    );
    expect(parseMagicLink(link)?.destination).toBe(destination);
  });

  it.each([
    `https://invites.example/?party=${partyId}&video=https%3A%2F%2Fvideo.test%2Fwatch`,
    `https://invites.example/#${partyId}`,
    `https://invites.example/#bad@video.test/watch`,
    `https://invites.example/#${partyId}@https://user:pass@video.test/watch`,
  ])("rejects unsafe or incomplete links", (link) => {
    expect(parseMagicLink(link)).toBeNull();
  });
});
