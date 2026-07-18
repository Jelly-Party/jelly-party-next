import { describe, expect, it } from "vite-plus/test";
import { authorizeMagicJoin } from "./join-authorization.js";

const invite = {
  partyId: "Abcdefghijklmnopqrstuv",
  destination: "https://video.test/watch",
  originPattern: "https://video.test/*",
};

describe("magic-link site authorization", () => {
  it("continues without prompting when permission already exists", async () => {
    let requested = false;
    const result = await authorizeMagicJoin(invite, {
      contains: async () => true,
      request: async () => {
        requested = true;
        return true;
      },
    });

    expect(result).toEqual({ ok: true });
    expect(requested).toBe(false);
  });

  it("reports permission denial", async () => {
    const result = await authorizeMagicJoin(invite, {
      contains: async () => false,
      request: async () => false,
    });

    expect(result).toEqual({ ok: false, error: "Site access was not granted" });
  });

  it("turns extension API failures into a recoverable connection error", async () => {
    const result = await authorizeMagicJoin(invite, {
      contains: async () => {
        throw new Error("Extension context invalidated");
      },
      request: async () => true,
    });

    expect(result).toEqual({
      ok: false,
      error: "Could not contact the browser permission service",
    });
  });
});
