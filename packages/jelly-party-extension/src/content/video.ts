import {
  isPlaybackAction,
  RemoteEchoGuard,
  targetTime,
  timeFromEnd,
  type PlaybackAction,
} from "jelly-party-lib";

declare global {
  interface Window {
    __jellyPartyVideoScript?: boolean;
  }
}

if (!window.__jellyPartyVideoScript) {
  window.__jellyPartyVideoScript = true;
  start();
}

function start(): void {
  let video: HTMLVideoElement | null = null;
  const echo = new RemoteEchoGuard();

  const report = () => {
    const next = findBestVideo();
    if (next !== video) {
      detach(video);
      video = next;
      attach(video);
    }
    void chrome.runtime.sendMessage({
      type: "video:frame-status",
      hasVideo: Boolean(video),
      area: video ? video.getBoundingClientRect().width * video.getBoundingClientRect().height : 0,
    });
  };

  const local = (action: PlaybackAction) => {
    if (!video || echo.consume(action)) return;
    const position = timeFromEnd(video.duration, video.currentTime);
    if (position === null) return;
    void chrome.runtime.sendMessage({ type: "video:local", action, timeFromEnd: position });
  };

  const onPlay = () => local("play");
  const onPause = () => local("pause");
  const onSeek = () => local("seek");

  function attach(element: HTMLVideoElement | null): void {
    element?.addEventListener("play", onPlay);
    element?.addEventListener("pause", onPause);
    element?.addEventListener("seeked", onSeek);
    element?.addEventListener("loadedmetadata", report);
  }

  function detach(element: HTMLVideoElement | null): void {
    element?.removeEventListener("play", onPlay);
    element?.removeEventListener("pause", onPause);
    element?.removeEventListener("seeked", onSeek);
    element?.removeEventListener("loadedmetadata", report);
  }

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isSnapshotMessage(message)) {
      report();
      if (!video) {
        sendResponse({ ok: false, error: "No video found" });
        return undefined;
      }
      const position = timeFromEnd(video.duration, video.currentTime);
      sendResponse(
        position === null
          ? { ok: false, error: "Video duration is unavailable" }
          : {
              ok: true,
              action: video.paused ? "pause" : "play",
              timeFromEnd: position,
            },
      );
      return undefined;
    }
    if (!isApplyMessage(message)) return undefined;
    void apply(message.action, message.timeFromEnd).then(sendResponse);
    return true;
  });

  async function apply(action: PlaybackAction, positionFromEnd: number): Promise<object> {
    report();
    if (!video) return { ok: false, error: "No video found" };
    const desired = targetTime(video.duration, positionFromEnd);
    if (desired === null) return { ok: false, error: "Video duration is unavailable" };

    if (Math.abs(video.currentTime - desired) > 0.5) {
      echo.mark("seek");
      video.currentTime = desired;
    }
    try {
      if (action === "play" && video.paused) {
        echo.mark("play");
        await video.play();
      } else if (action === "pause" && !video.paused) {
        echo.mark("pause");
        video.pause();
      }
      return { ok: true };
    } catch (error) {
      // A rejected play() emits no play event, so remove the echo marker before
      // the user's eventual manual click produces one.
      if (action === "play") echo.consume("play");
      return isAutoplayBlock(error)
        ? {
            ok: false,
            reason: "interaction-required",
            error: "Press Play on the video once to resume synchronization.",
          }
        : { ok: false, error: "The page could not start playback." };
    }
  }

  new MutationObserver(report).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("resize", report);
  report();
}

function isAutoplayBlock(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "NotAllowedError"
  );
}

function isSnapshotMessage(value: unknown): value is { type: "video:snapshot" } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "video:snapshot"
  );
}

function findBestVideo(): HTMLVideoElement | null {
  return (
    [...document.querySelectorAll("video")]
      .map((video) => ({ video, rect: video.getBoundingClientRect() }))
      .sort(
        (left, right) => right.rect.width * right.rect.height - left.rect.width * left.rect.height,
      )[0]?.video ?? null
  );
}

function isApplyMessage(value: unknown): value is {
  type: "video:apply";
  action: PlaybackAction;
  timeFromEnd: number;
} {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    message.type === "video:apply" &&
    isPlaybackAction(message.action) &&
    typeof message.timeFromEnd === "number" &&
    Number.isFinite(message.timeFromEnd)
  );
}
