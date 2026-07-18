import { describe, expect, it } from "vite-plus/test";
import { shouldFollowTabActivation } from "./view-context";

describe("sidebar tab activation", () => {
  it("follows only activations from the Firefox sidebar's own window", () => {
    expect(shouldFollowTabActivation(false, 3, 3)).toBe(true);
    expect(shouldFollowTabActivation(false, 3, 8)).toBe(false);
  });

  it("keeps a Chromium contextual panel bound to its configured tab", () => {
    expect(shouldFollowTabActivation(true, 3, 3)).toBe(false);
  });
});
