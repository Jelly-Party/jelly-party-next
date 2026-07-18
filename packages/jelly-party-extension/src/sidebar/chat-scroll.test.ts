import { describe, expect, it } from "vite-plus/test";
import { isChatAttached } from "./chat-scroll";

describe("chat scroll attachment", () => {
  it("stays attached while the reader is at or very near the bottom", () => {
    expect(isChatAttached({ scrollTop: 300, clientHeight: 200, scrollHeight: 500 })).toBe(true);
    expect(isChatAttached({ scrollTop: 276, clientHeight: 200, scrollHeight: 500 })).toBe(true);
  });

  it("detaches once the reader moves beyond the bottom threshold", () => {
    expect(isChatAttached({ scrollTop: 275, clientHeight: 200, scrollHeight: 500 })).toBe(false);
    expect(isChatAttached({ scrollTop: 0, clientHeight: 200, scrollHeight: 900 })).toBe(false);
  });

  it("treats a chat shorter than its viewport as attached", () => {
    expect(isChatAttached({ scrollTop: 0, clientHeight: 300, scrollHeight: 180 })).toBe(true);
  });
});
