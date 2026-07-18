import { RemoteEchoGuard, targetTime, timeFromEnd, type PlaybackAction } from "jelly-party-lib";

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
    } catch {
      return { ok: false, error: "The page blocked playback" };
    }
  }

  new MutationObserver(report).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("resize", report);
  report();
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
    (message.action === "play" || message.action === "pause" || message.action === "seek") &&
    typeof message.timeFromEnd === "number" &&
    Number.isFinite(message.timeFromEnd)
  );
}
