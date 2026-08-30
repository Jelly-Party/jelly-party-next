import { describe, expect, it } from "vite-plus/test";
import { authorizeMagicJoin } from "./join-authorization.js";

const invite = {
  partyId: "Abcdefghijklmnopqrstuv",
  destination: "https://video.test/watch",
  originPattern: "https://video.test/*",
};

describe("magic-link site authorization", () => {
  it("continues without prompting when permission already exists", async () => {
    const result = await authorizeMagicJoin(invite, { contains: async () => true });

    expect(result).toEqual({ status: "authorized" });
  });

  it("asks the caller to obtain the missing origin permission", async () => {
    const result = await authorizeMagicJoin(invite, { contains: async () => false });

    expect(result).toEqual({
      status: "needs-permission",
      originPattern: "https://video.test/*",
    });
  });

  it("rejects an invite whose origin pattern does not match its destination", async () => {
    const result = await authorizeMagicJoin(
      { ...invite, originPattern: "https://elsewhere.test/*" },
      { contains: async () => true },
    );

    expect(result).toEqual({ status: "invalid" });
  });

  it("turns extension API failures into a recoverable state", async () => {
    const result = await authorizeMagicJoin(invite, {
      contains: async () => {
        throw new Error("Extension context invalidated");
      },
    });

    expect(result).toEqual({ status: "unavailable" });
  });
});
