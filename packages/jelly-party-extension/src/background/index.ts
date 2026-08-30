import {
  authorizeMagicJoin,
  getRandomEmoji,
  isPlaybackAction,
  liveTimeFromEnd,
  MAX_CHAT_LENGTH,
  MAX_EMOJI_LENGTH,
  MAX_NAME_LENGTH,
  parseMagicLink,
  parsePartyId,
  type PeerIdentity,
  type ServerMessage,
} from "jelly-party-lib";
import { PartySocket } from "./party-socket";
import {
  initialPartyState,
  reducePartyState,
  type PartyState,
  type PartyStateEvent,
} from "./party-state";

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

let partyState: PartyState = initialPartyState;
let partySocket: PartySocket | null = null;

if (chrome.sidePanel) {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureIdentity();
});

chrome.action.onClicked.addListener((tab) => {
  // Chrome handles action clicks natively through setPanelBehavior. Firefox's
  // sidebar toggle is gesture-gated, so it must run before this listener awaits.
  if (!chrome.sidePanel) void toggleFirefoxSidebar();
  void handleActionClick(tab);
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void notifyViews({ type: "tab:activated", tabId, windowId });
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id && partyState.kind === "active") void disablePartyPanel(tab.id);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  candidates.delete(tabId);
  if (partyState.kind === "active" && partyState.party.tabId === tabId) {
    stopParty({ type: "tab-removed", tabId });
  }
});

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === "loading") candidates.delete(tabId);
  if (change.status !== "complete") return;
  if (partyState.kind === "active" && partyState.party.tabId === tabId && tab.url) {
    transition({
      type: "tab-updated",
      tabId,
      tabUrl: tab.url,
      tabTitle: tab.title ?? "Current video",
    });
  }
  void scanTab(tabId);
  void consumePendingJoin(tabId);
  void notifyViews({ type: "tab:navigated", tabId, url: tab.url });
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
    const identity: PeerIdentity = {
      id: current.id,
      name: bounded(message.name, MAX_NAME_LENGTH) ?? current.name,
      emoji: bounded(message.emoji, MAX_EMOJI_LENGTH) ?? current.emoji,
    };
    await chrome.storage.local.set({ identity });
    return identity;
  }

  if (message.type === "party:state") return partyState;

  if (message.type === "party:create" && typeof message.tabId === "number") {
    const tab = await chrome.tabs.get(message.tabId);
    await scanTab(message.tabId);
    if (!tab.url?.startsWith("http") || !bestCandidate(message.tabId)) {
      return { ok: false, error: "Open a page with a video before starting a party." };
    }
    const identity = await ensureIdentity();
    startParty(createPartyId(), tab, identity);
    return { ok: true, state: partyState };
  }

  if (message.type === "party:leave") {
    leaveParty();
    return { ok: true };
  }

  if (message.type === "party:retry") {
    if (partyState.kind === "idle") return { ok: false, error: "There is no party to retry." };
    const identity = await ensureIdentity();
    connectParty(partyState.party.partyId, identity);
    return { ok: true };
  }

  if (message.type === "party:chat") {
    const text = bounded(message.text, MAX_CHAT_LENGTH);
    if (!text || partyState.kind === "idle") return { ok: false };
    partySocket?.chat(text);
    return { ok: true };
  }

  if (message.type === "party:history" && typeof message.beforeId === "number") {
    if (partyState.kind === "idle") return { ok: false };
    partySocket?.history(message.beforeId);
    return { ok: true };
  }

  if (message.type === "party:focus") {
    return focusParty();
  }

  if (message.type === "tab:active") {
    const tab =
      typeof message.tabId === "number"
        ? await chrome.tabs.get(message.tabId)
        : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!tab?.id) return { error: "Open a video tab first" };
    await scanTab(tab.id);
    return { tabId: tab.id, windowId: tab.windowId, url: tab.url, title: tab.title };
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
    const hasVideo = Boolean(bestCandidate(sender.tab.id)?.hasVideo);
    if (partyState.kind === "active" && partyState.party.tabId === sender.tab.id) {
      transition({ type: "video", hasVideo });
    }
    await notifyViews({ type: "video:status", tabId: sender.tab.id, hasVideo });
    return undefined;
  }

  if (message.type === "video:local" && sender.tab?.id && sender.frameId !== undefined) {
    const best = bestCandidate(sender.tab.id);
    if (
      best?.frameId === sender.frameId &&
      partyState.kind === "active" &&
      partyState.party.tabId === sender.tab.id &&
      isPlaybackAction(message.action) &&
      typeof message.timeFromEnd === "number"
    ) {
      partySocket?.playback(message.action, message.timeFromEnd);
    }
    return undefined;
  }

  if (
    message.type === "video:apply" &&
    typeof message.tabId === "number" &&
    isPlaybackAction(message.action) &&
    typeof message.timeFromEnd === "number"
  ) {
    return applyPlayback(message.tabId, message.action, message.timeFromEnd);
  }

  if (message.type === "pending:consume" && typeof message.tabId === "number") {
    return consumePendingJoin(message.tabId);
  }

  if (
    message.type === "join:granted" &&
    parsePartyId(message.partyId) &&
    typeof message.destination === "string" &&
    typeof message.tabId === "number"
  ) {
    return completeGrantedJoin(parsePartyId(message.partyId)!, message.destination, message.tabId);
  }

  if (
    message.type === "join:request" &&
    sender.tab?.id &&
    parsePartyId(message.partyId) &&
    typeof message.destination === "string" &&
    typeof message.originPattern === "string"
  ) {
    if (partyState.kind === "active") {
      await focusParty();
      return {
        ok: false,
        error: "You’re already in a party. Leave it before joining another one.",
      };
    }
    const partyId = parsePartyId(message.partyId)!;
    const authorization = await authorizeMagicJoin(
      { partyId, destination: message.destination, originPattern: message.originPattern },
      { contains: (origin) => chrome.permissions.contains({ origins: [origin] }) },
    );
    if (authorization.status === "invalid") return { ok: false, error: "Invalid invite link" };
    if (authorization.status === "unavailable") {
      return { ok: false, error: "Could not contact the browser permission service" };
    }
    if (authorization.status === "needs-permission") {
      await openGrantPage({ partyId, destination: message.destination }, sender.tab.id);
      return {
        ok: false,
        error: `Opening Jelly Party’s permission request for ${new URL(message.destination).hostname}…`,
      };
    }
    const pendingJoin: PendingJoin = { partyId, destination: message.destination };
    await chrome.storage.local.set({ pendingJoin });
    const sidebarOpened = await openPartySidebar(sender.tab.id);
    if (!sidebarOpened) await markToolbarJoin(sender.tab.id);
    return { ok: true, destination: message.destination, sidebarOpened };
  }

  return undefined;
}

/**
 * Keep the permission hand-off in the invite's tab. The extension page has the
 * permission API, and its button supplies the user gesture both browsers require.
 */
async function openGrantPage(pending: PendingJoin, tabId: number): Promise<void> {
  const parameters = new URLSearchParams({
    party: pending.partyId,
    video: pending.destination,
    tab: String(tabId),
  });
  await chrome.tabs.update(tabId, {
    url: chrome.runtime.getURL(`src/grant/grant.html?${parameters.toString()}`),
  });
}

async function completeGrantedJoin(
  partyId: string,
  destination: string,
  tabId: number,
): Promise<{ ok: boolean; error?: string }> {
  const invite = parseMagicLink(
    `${__JELLY_JOIN_URL__}/?party=${partyId}&video=${encodeURIComponent(destination)}`,
  );
  if (!invite) return { ok: false, error: "Invalid invite link" };
  // Trust the browser, not the message: the page could only have been opened by us,
  // but the permission still has to be real before we send anyone to the video.
  if (!(await chrome.permissions.contains({ origins: [invite.originPattern] }))) {
    return { ok: false, error: "Site access was not granted" };
  }
  const pendingJoin: PendingJoin = { partyId, destination: invite.destination };
  await chrome.storage.local.set({ pendingJoin });
  try {
    const tab = await chrome.tabs.update(tabId, { url: invite.destination, active: true });
    if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
  } catch {
    await chrome.tabs.create({ url: invite.destination });
  }
  return { ok: true };
}

async function handleActionClick(tab: chrome.tabs.Tab): Promise<void> {
  if (partyState.kind === "active") {
    if (tab.id !== partyState.party.tabId) await focusParty(false);
    return;
  }
  if (!tab.id) return;
  // The browser toggled the sidebar from the click itself; this only refreshes
  // what the sidebar reports about the tab.
  await scanTab(tab.id);
}

function startParty(partyId: string, tab: chrome.tabs.Tab, identity: PeerIdentity): void {
  if (!tab.id || !tab.url) return;
  partySocket?.close();
  transition({
    type: "started",
    partyId,
    tabId: tab.id,
    tabUrl: tab.url,
    tabTitle: tab.title ?? "Current video",
    hasVideo: Boolean(bestCandidate(tab.id)),
  });
  void openPartySidebar(tab.id);
  void constrainPartyPanelTo(tab.id);
  void markPartyActive();
  connectParty(partyId, identity);
}

function connectParty(partyId: string, identity: PeerIdentity): void {
  if (partyState.kind === "idle" || partyState.party.partyId !== partyId) return;
  partySocket?.close();
  transition({ type: "connection", status: "connecting" });
  partySocket = new PartySocket(__JELLY_WS_URL__, {
    onOpen: () => transitionIfCurrent(partyId, { type: "connection", status: "connected" }),
    onClose: () => transitionIfCurrent(partyId, { type: "connection", status: "disconnected" }),
    onError: (notice) => transitionIfCurrent(partyId, { type: "notice", notice }),
    onMessage: (message) => handlePartyMessage(partyId, message),
  });
  partySocket.connect(partyId, identity);
}

function handlePartyMessage(partyId: string, message: ServerMessage): void {
  if (partyState.kind === "idle" || partyState.party.partyId !== partyId) return;
  if (message.type === "welcome") {
    transition({
      type: "history",
      entries: message.history.entries,
      hasMore: message.history.hasMore,
    });
    if (message.playback) {
      const action = message.playback.playing ? "play" : "pause";
      void applyPlayback(partyState.party.tabId, action, liveTimeFromEnd(message.playback)).then(
        (result) => {
          if (!result.ok) transitionIfCurrent(partyId, { type: "notice", notice: result.error });
        },
      );
    } else if (message.initializePlayback !== false) {
      void publishPlaybackSnapshot(partyId);
    }
    return;
  }
  if (message.type === "presence") transition({ type: "presence", peers: message.peers });
  if (message.type === "chat") {
    transition({
      type: "chat",
      entry: message.entry,
    });
  }
  if (message.type === "history") {
    transition({
      type: "history",
      entries: message.history.entries,
      hasMore: message.history.hasMore,
    });
  }
  if (message.type === "playback") {
    void applyPlayback(partyState.party.tabId, message.action, message.timeFromEnd).then(
      (result) => {
        if (!result.ok) transitionIfCurrent(partyId, { type: "notice", notice: result.error });
      },
    );
  }
  if (message.type === "error") transition({ type: "notice", notice: message.message });
}

async function publishPlaybackSnapshot(partyId: string): Promise<void> {
  if (partyState.kind === "idle" || partyState.party.partyId !== partyId) return;
  const { tabId } = partyState.party;
  const best = bestCandidate(tabId);
  if (!best) return;
  try {
    const result = await chrome.tabs.sendMessage(
      tabId,
      { type: "video:snapshot" },
      { frameId: best.frameId },
    );
    if (
      partyState.kind === "active" &&
      partyState.party.partyId === partyId &&
      result?.ok === true &&
      isPlaybackAction(result.action) &&
      typeof result.timeFromEnd === "number" &&
      Number.isFinite(result.timeFromEnd)
    ) {
      partySocket?.playback(result.action, result.timeFromEnd);
    }
  } catch {
    // A later local playback event can still establish state if the page changes
    // while the initial snapshot is being collected.
  }
}

async function applyPlayback(
  tabId: number,
  action: "play" | "pause" | "seek",
  timeFromEnd: number,
): Promise<{ ok: boolean; error: string }> {
  const best = bestCandidate(tabId);
  if (!best) return { ok: false, error: "The video is no longer available." };
  try {
    const result = await chrome.tabs.sendMessage(
      tabId,
      { type: "video:apply", action, timeFromEnd },
      { frameId: best.frameId },
    );
    return result?.ok === false
      ? { ok: false, error: result.error ?? "Could not control the video." }
      : { ok: true, error: "" };
  } catch {
    return { ok: false, error: "Could not control the video." };
  }
}

function leaveParty(): void {
  stopParty({ type: "left" });
}

function stopParty(event: Extract<PartyStateEvent, { type: "left" | "tab-removed" }>): void {
  partySocket?.close();
  partySocket = null;
  transition(event);
  void chrome.action.setBadgeText({ text: "" });
  void chrome.action.setTitle({ title: "Open Jelly Party" });
  void restorePartyPanels();
}

async function focusParty(openSidebar = true): Promise<{ ok: boolean; error?: string }> {
  if (partyState.kind === "idle") return { ok: false, error: "There is no active party." };
  try {
    const tab = await chrome.tabs.get(partyState.party.tabId);
    if (!tab.id) return { ok: false, error: "The party tab is no longer open." };
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
    if (openSidebar) await openPartySidebar(tab.id);
    return { ok: true };
  } catch {
    leaveParty();
    return { ok: false, error: "The party tab is no longer open." };
  }
}

async function consumePendingJoin(tabId: number): Promise<PendingJoin | null> {
  const stored = await chrome.storage.local.get("pendingJoin");
  const pending = stored.pendingJoin as PendingJoin | undefined;
  if (!pending) return null;
  const tab = await chrome.tabs.get(tabId);
  if (!sameDestination(tab.url, pending.destination)) return null;
  await chrome.storage.local.remove("pendingJoin");
  await chrome.action.setBadgeText({ tabId, text: "" });
  await scanTab(tabId);
  startParty(pending.partyId, tab, await ensureIdentity());
  return pending;
}

function transition(event: PartyStateEvent): void {
  partyState = reducePartyState(partyState, event);
  void notifyViews({ type: "party:state", state: partyState });
}

function transitionIfCurrent(partyId: string, event: PartyStateEvent): void {
  if (partyState.kind === "active" && partyState.party.partyId === partyId) transition(event);
}

async function scanTab(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["src/content/video.js"],
    });
  } catch {
    if (partyState.kind === "active" && partyState.party.tabId === tabId) {
      transition({ type: "video", hasVideo: false });
    }
    await notifyViews({ type: "video:status", tabId, hasVideo: false });
  }
}

function bestCandidate(tabId: number): VideoCandidate | undefined {
  return [...(candidates.get(tabId)?.values() ?? [])]
    .filter((candidate) => candidate.hasVideo)
    .sort((left, right) => right.area - left.area)[0];
}

async function ensureIdentity(): Promise<PeerIdentity> {
  const stored = await chrome.storage.local.get("identity");
  if (stored.identity) return stored.identity as PeerIdentity;
  const identity: PeerIdentity = {
    id: crypto.randomUUID(),
    name: `${pick(adjectives)} ${pick(animals)}`,
    emoji: getRandomEmoji(),
  };
  await chrome.storage.local.set({ identity });
  return identity;
}

async function notifyViews(message: object): Promise<void> {
  await chrome.runtime.sendMessage(message).catch(() => undefined);
}

async function markToolbarJoin(tabId: number): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#7c3aed" });
  await chrome.action.setBadgeText({ tabId, text: "1" });
  await chrome.action.setTitle({ tabId, title: "Click to join your Jelly Party" });
}

async function markPartyActive(): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color: "#7c3aed" });
  await chrome.action.setBadgeText({ text: "ON" });
  await chrome.action.setTitle({ title: "Return to your Jelly Party" });
}

async function openPartySidebar(tabId: number): Promise<boolean> {
  if (chrome.sidePanel) {
    // Deliberately not awaited: open() has to stay in the caller's task so that a
    // user gesture still counts.
    void chrome.sidePanel
      .setOptions({ tabId, path: `src/sidebar/sidebar.html?tab=${tabId}`, enabled: true })
      .catch(() => undefined);
    return chrome.sidePanel.open({ tabId }).then(
      () => true,
      () => false,
    );
  }
  const firefox = globalThis as typeof globalThis & {
    browser?: { sidebarAction?: { open(): Promise<void> } };
  };
  return (
    firefox.browser?.sidebarAction
      ?.open()
      .then(() => true)
      .catch(() => false) ?? false
  );
}

async function toggleFirefoxSidebar(): Promise<boolean> {
  const firefox = globalThis as typeof globalThis & {
    browser?: { sidebarAction?: { toggle(): Promise<void> } };
  };
  return (
    firefox.browser?.sidebarAction
      ?.toggle()
      .then(() => true)
      .catch(() => false) ?? false
  );
}

async function constrainPartyPanelTo(partyTabId: number): Promise<void> {
  if (!chrome.sidePanel) return;
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.filter((tab) => tab.id && tab.id !== partyTabId).map((tab) => disablePartyPanel(tab.id!)),
  );
}

async function disablePartyPanel(tabId: number): Promise<void> {
  await chrome.sidePanel?.setOptions({ tabId, enabled: false }).catch(() => undefined);
}

async function restorePartyPanels(): Promise<void> {
  if (!chrome.sidePanel) return;
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs
      .filter((tab) => tab.id)
      .map((tab) =>
        chrome.sidePanel.setOptions({
          tabId: tab.id!,
          path: "src/sidebar/sidebar.html",
          enabled: true,
        }),
      ),
  ).catch(() => undefined);
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

function createPartyId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
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
