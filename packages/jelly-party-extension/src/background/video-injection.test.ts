import { describe, expect, it, vi } from "vite-plus/test";
import { injectVideoController } from "./video-injection";

describe("video controller injection", () => {
  it("keeps a usable main-frame player when an optional frame is inaccessible", async () => {
    const inject = vi.fn(async (allFrames: boolean) => {
      if (allFrames) throw new Error("Cannot access a cross-origin frame");
    });

    await expect(injectVideoController(inject)).resolves.toBe(true);
    expect(inject).toHaveBeenNthCalledWith(1, false);
    expect(inject).toHaveBeenNthCalledWith(2, true);
  });

  it("reports missing tab access when the main frame cannot be injected", async () => {
    const inject = vi.fn(async () => {
      throw new Error("Missing host permission");
    });

    await expect(injectVideoController(inject)).resolves.toBe(false);
    expect(inject).toHaveBeenCalledTimes(1);
  });
});
