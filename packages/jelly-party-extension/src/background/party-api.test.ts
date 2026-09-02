import { describe, expect, it, vi } from "vite-plus/test";
import { requestPartyId } from "./party-api";

const partyId = "a".repeat(64);

describe("party creation API", () => {
  it("returns a namespace-issued party ID", async () => {
    const request = vi.fn(() => Promise.resolve(Response.json({ partyId }, { status: 201 })));

    await expect(requestPartyId("https://meet.example/party", request)).resolves.toBe(partyId);
    expect(request).toHaveBeenCalledWith("https://meet.example/party", { method: "POST" });
  });

  it("surfaces quota errors", async () => {
    const request = vi.fn(() =>
      Promise.resolve(Response.json({ error: "Monthly party limit reached." }, { status: 429 })),
    );

    await expect(requestPartyId("https://meet.example/party", request)).rejects.toThrow(
      "Monthly party limit reached.",
    );
  });

  it("rejects malformed successful responses", async () => {
    const request = vi.fn(() => Promise.resolve(Response.json({ partyId: "invented" })));

    await expect(requestPartyId("https://meet.example/party", request)).rejects.toThrow(
      "invalid party ID",
    );
  });
});
