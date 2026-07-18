import { describe, expect, it } from "vite-plus/test";
import { RemoteEchoGuard, targetTime, timeFromEnd } from "./playback.js";

describe("finite playback positions", () => {
  it("translates positions through distance from the end", () => {
    expect(timeFromEnd(120, 30)).toBe(90);
    expect(targetTime(200, 90)).toBe(110);
  });

  it("clamps impossible and non-finite values", () => {
    expect(timeFromEnd(120, 140)).toBe(0);
    expect(targetTime(120, 500)).toBe(0);
    expect(targetTime(Number.POSITIVE_INFINITY, 10)).toBeNull();
  });
});

describe("remote playback echo suppression", () => {
  it("consumes only events marked as consequences of a remote command", () => {
    const guard = new RemoteEchoGuard();
    guard.mark("pause", "seek");

    expect(guard.consume("pause")).toBe(true);
    expect(guard.consume("play")).toBe(false);
    expect(guard.consume("seek")).toBe(true);
    expect(guard.consume("seek")).toBe(false);
  });
});
