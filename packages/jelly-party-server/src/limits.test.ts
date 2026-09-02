import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_MAX_PARTIES_PER_MONTH, maxPartiesPerMonth, monthKey } from "./limits";

describe("server abuse limits", () => {
  it("uses calendar-month quota buckets", () => {
    expect(monthKey(Date.UTC(2026, 8, 30, 23, 59))).toBe("2026-09");
    expect(monthKey(Date.UTC(2026, 9, 1))).toBe("2026-10");
  });

  it("accepts a configured positive quota and rejects unsafe values", () => {
    expect(maxPartiesPerMonth("250000")).toBe(250_000);
    expect(maxPartiesPerMonth("0")).toBe(DEFAULT_MAX_PARTIES_PER_MONTH);
    expect(maxPartiesPerMonth("not-a-number")).toBe(DEFAULT_MAX_PARTIES_PER_MONTH);
  });
});
