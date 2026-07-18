import {
  authorizeMagicJoin,
  getRandomEmoji,
  parsePartyId,
  type PlaybackAction,
} from "jelly-party-lib";

interface Identity {
  id: string;
  name: string;
  emoji: string;
}

interface VideoCandidate {
  frameId: number;
  area: number;
  hasVideo: boolean;
}

interface PendingJoin {
  partyId: string;
  destination: string;
}

const candidates = new Map<number, Map<number, VideoCandidate>>();
const adjectives = ["Bright", "Calm", "Happy", "Kind", "Lucky", "Swift"];
const animals = ["Fox", "Jellyfish", "Otter", "Owl", "Panda", "Whale"];

void chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);

chrome.runtime.onInstalled.addListener(() => {
  void ensureIdentity();
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) void scanTab(tab.id);
  const firefox = globalThis as typeof globalThis & {
    browser?: { sidebarAction?: { open(): Promise<void> } };
  };
  void firefox.browser?.sidebarAction?.open().catch(() => undefined);
});

chrome.tabs.onRemoved.addListener((tabId) => candidates.delete(tabId));
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === "loading") candidates.delete(tabId);
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  void handleMessage(message, sender).then(sendResponse);
  return true;
});

async function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (!isRecord(message) || typeof message.type !== "string") return undefined;

  if (message.type === "identity:get") return ensureIdentity();

  if (message.type === "identity:set") {
    const current = await ensureIdentity();
    const identity: Identity = {
      id: current.id,
      name: bounded(message.name, 40) ?? current.name,
      emoji: bounded(message.emoji, 16) ?? current.emoji,
    };
    await chrome.storage.local.set({ identity });
    return identity;
  }

  if (message.type === "tab:active") {
    const tab =
      typeof message.tabId === "number"
        ? await chrome.tabs.get(message.tabId)
        : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!tab?.id) return { error: "Open a video tab first" };
    await scanTab(tab.id);
    return { tabId: tab.id, url: tab.url, title: tab.title };
  }

  if (message.type === "video:scan" && typeof message.tabId === "number") {
    await scanTab(message.tabId);
    return bestCandidate(message.tabId) ?? { hasVideo: false };
  }

  if (message.type === "video:frame-status" && sender.tab?.id && sender.frameId !== undefined) {
    const frames = candidates.get(sender.tab.id) ?? new Map<number, VideoCandidate>();
    frames.set(sender.frameId, {
      frameId: sender.frameId,
      area: typeof message.area === "number" ? message.area : 0,
      hasVideo: message.hasVideo === true,
    });
    candidates.set(sender.tab.id, frames);
    await notifySidebar({
      type: "video:status",
      tabId: sender.tab.id,
      hasVideo: Boolean(bestCandidate(sender.tab.id)?.hasVideo),
    });
    return undefined;
  }

  if (message.type === "video:local" && sender.tab?.id && sender.frameId !== undefined) {
    const best = bestCandidate(sender.tab.id);
    if (best?.frameId === sender.frameId) {
      await notifySidebar({ ...message, tabId: sender.tab.id });
    }
    return undefined;
  }

  if (
    message.type === "video:apply" &&
    typeof message.tabId === "number" &&
    isPlaybackAction(message.action) &&
    typeof message.timeFromEnd === "number"
  ) {
    const best = bestCandidate(message.tabId);
    if (!best) return { ok: false, error: "No video found" };
    return chrome.tabs.sendMessage(
      message.tabId,
      { type: "video:apply", action: message.action, timeFromEnd: message.timeFromEnd },
      { frameId: best.frameId },
    );
  }

  if (message.type === "pending:consume" && typeof message.tabId === "number") {
    const stored = await chrome.storage.local.get("pendingJoin");
    const pending = stored.pendingJoin as PendingJoin | undefined;
    if (!pending) return null;
    const tab = await chrome.tabs.get(message.tabId);
    if (!sameDestination(tab.url, pending.destination)) return null;
    await chrome.storage.local.remove("pendingJoin");
    return pending;
  }

  if (
    message.type === "join:request" &&
    sender.tab?.id &&
    parsePartyId(message.partyId) &&
    typeof message.destination === "string" &&
    typeof message.originPattern === "string"
  ) {
    const partyId = parsePartyId(message.partyId)!;
    const authorization = await authorizeMagicJoin(
      { partyId, destination: message.destination, originPattern: message.originPattern },
      {
        contains: (origin) => chrome.permissions.contains({ origins: [origin] }),
        request: (origin) => chrome.permissions.request({ origins: [origin] }),
      },
    );
    if (!authorization.ok) return authorization;
    const pendingJoin: PendingJoin = {
      partyId,
      destination: message.destination,
    };
    await chrome.storage.local.set({ pendingJoin });
    await chrome.tabs.update(sender.tab.id, { url: message.destination });
    await chrome.sidePanel?.open({ tabId: sender.tab.id }).catch(() => undefined);
    return { ok: true };
  }

  return undefined;
}

async function scanTab(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["src/content/video.js"],
    });
  } catch {
    await notifySidebar({ type: "video:status", tabId, hasVideo: false });
  }
}

function bestCandidate(tabId: number): VideoCandidate | undefined {
  return [...(candidates.get(tabId)?.values() ?? [])]
    .filter((candidate) => candidate.hasVideo)
    .sort((left, right) => right.area - left.area)[0];
}

async function ensureIdentity(): Promise<Identity> {
  const stored = await chrome.storage.local.get("identity");
  if (stored.identity) return stored.identity as Identity;
  const identity: Identity = {
    id: crypto.randomUUID(),
    name: `${pick(adjectives)} ${pick(animals)}`,
    emoji: getRandomEmoji(),
  };
  await chrome.storage.local.set({ identity });
  return identity;
}

async function notifySidebar(message: object): Promise<void> {
  await chrome.runtime.sendMessage(message).catch(() => undefined);
}

function sameDestination(current: string | undefined, expected: string): boolean {
  if (!current) return false;
  try {
    const currentUrl = new URL(current);
    const expectedUrl = new URL(expected);
    return currentUrl.origin === expectedUrl.origin && currentUrl.pathname === expectedUrl.pathname;
  } catch {
    return false;
  }
}

function bounded(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.trim() && value.length <= maximum ? value.trim() : null;
}

function pick<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)] as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlaybackAction(value: unknown): value is PlaybackAction {
  return value === "play" || value === "pause" || value === "seek";
}
