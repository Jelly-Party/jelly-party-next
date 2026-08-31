import {
  buildMagicLink,
  getRandomEmoji,
  isPlaybackAction,
  liveTimeFromEnd,
  type MagicLink,
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
import { injectVideoController } from "./video-injection";

interface VideoCandidate {
  frameId: number;
  area: number;
  hasVideo: boolean;
}

interface PendingJoin {
  partyId: string;
  destination: string;
}

interface RemotePlaybackTarget {
  action: "play" | "pause" | "seek";
  timeFromEnd: number;
  updatedAt: number;
}

interface PlaybackResult {
  ok: boolean;
  error: string;
  reason?: "interaction-required" | "video-unavailable";
}

const candidates = new Map<number, Map<number, VideoCandidate>>();
const activatedTabs = new Set<number>();
const openSidePanelTabs = new Set<number>();
const openSidePanelWindows = new Set<number>();
const adjectives = ["Bright", "Calm", "Happy", "Kind", "Lucky", "Swift"];
const animals = ["Fox", "Jellyfish", "Otter", "Owl", "Panda", "Whale"];

let partyState: PartyState = initialPartyState;
let partySocket: PartySocket | null = null;
let playbackTarget: RemotePlaybackTarget | null = null;

if (chrome.sidePanel) {
  // Own the toolbar click so Chrome grants activeTab before we scan the page.
  // Native side-panel toggling consumes that click without dispatching action.onClicked.
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => undefined);
  chrome.sidePanel.onOpened.addListener(({ tabId, windowId }) => {
    if (tabId === undefined) openSidePanelWindows.add(windowId);
    else openSidePanelTabs.add(tabId);
  });
  chromeSidePanel().onClosed?.addListener(({ tabId, windowId }) => {
    if (tabId === undefined) openSidePanelWindows.delete(windowId);
    else openSidePanelTabs.delete(tabId);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureIdentity();
});

chrome.action.onClicked.addListener((tab) => {
  // Both APIs are gesture-gated, so invoke them directly in the click handler.
  if (chrome.sidePanel) handleChromeActionClick(tab);
  else {
    void toggleFirefoxSidebar();
    void handleActionClick(tab);
  }
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void notifyViews({ type: "tab:activated", tabId, windowId });
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id && partyState.kind === "active") void disablePartyPanel(tab.id);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  candidates.delete(tabId);
  activatedTabs.delete(tabId);
  openSidePanelTabs.delete(tabId);
  if (partyState.kind === "active" && partyState.party.tabId === tabId) {
    stopParty({ type: "tab-removed", tabId });
  }
});

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  void handleTabUpdate(tabId, change, tab);
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
    return partySocket?.chat(text)
      ? { ok: true }
      : { ok: false, error: "Reconnect before sending your message." };
  }

  if (message.type === "party:history" && typeof message.beforeId === "number") {
    if (partyState.kind === "idle") return { ok: false };
    partySocket?.history(message.beforeId);
    return { ok: true };
  }

  if (message.type === "party:focus") {
    return focusParty();
  }

  if (message.type === "party:return-video") {
    return returnToPartyVideo();
  }

  if (message.type === "tab:snapshot") {
    const tab =
      typeof message.tabId === "number"
        ? await chrome.tabs.get(message.tabId)
        : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!tab?.id) return { error: "Open a video tab first" };
    const accessGranted = await scanTab(tab.id);
    return {
      tabId: tab.id,
      windowId: tab.windowId,
      title: tab.title,
      video: videoScan(tab.id, accessGranted),
    };
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
      const becameAvailable =
        partyState.party.atDestination && hasVideo && !partyState.party.hasVideo;
      const partyId = partyState.party.partyId;
      transition({ type: "video", hasVideo: partyState.party.atDestination && hasVideo });
      if (becameAvailable && playbackTarget) void applyLatestRemotePlayback(partyId);
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
      partyState.party.atDestination &&
      isPlaybackAction(message.action) &&
      typeof message.timeFromEnd === "number"
    ) {
      if (message.action === "play" && partyState.party.playbackBlocked && playbackTarget) {
        transition({ type: "playback-blocked", blocked: false });
        void applyLatestRemotePlayback(partyState.party.partyId);
      } else {
        rememberPlaybackTarget(message.action, message.timeFromEnd);
        partySocket?.playback(message.action, message.timeFromEnd);
      }
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
    return completeGrantedJoin(
      parsePartyId(message.partyId)!,
      message.destination,
      message.tabId,
      message.sidebarOpened === true,
    );
  }

  if (
    message.type === "join:prepare" &&
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
    const invite = inviteFromParts(__JELLY_JOIN_URL__, partyId, message.destination);
    if (!invite || invite.originPattern !== message.originPattern) {
      return { ok: false, error: "Invalid invite link" };
    }
    await preparePartySidebar(sender.tab.id);
    await openGrantPage({ partyId, destination: invite.destination }, sender.tab.id);
    return { ok: true };
  }

  return undefined;
}

/**
 * Keep the permission hand-off in the invite's tab. The extension page has the
 * permission API, and its button supplies the user gesture both browsers require.
 */
async function openGrantPage(pending: PendingJoin, tabId: number): Promise<void> {
  const grantPage = chrome.runtime.getURL("src/grant/grant.html");
  const link = new URL(buildMagicLink(grantPage, pending.partyId, pending.destination));
  link.searchParams.set("tab", String(tabId));
  await chrome.tabs.update(tabId, { url: link.toString() });
}

/** Re-validates a destination a content script sent by round-tripping it through an invite. */
function inviteFromParts(joinUrl: string, partyId: string, destination: string): MagicLink | null {
  try {
    return parseMagicLink(buildMagicLink(joinUrl, partyId, destination));
  } catch {
    return null;
  }
}

async function completeGrantedJoin(
  partyId: string,
  destination: string,
  tabId: number,
  sidebarOpened: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const invite = inviteFromParts(__JELLY_JOIN_URL__, partyId, destination);
  if (!invite) return { ok: false, error: "Invalid invite link" };
  // Trust the browser, not the message: the page could only have been opened by us,
  // but the permission still has to be real before we send anyone to the video.
  if (!(await chrome.permissions.contains({ origins: [invite.originPattern] }))) {
    return { ok: false, error: "Site access was not granted" };
  }
  const pendingJoin: PendingJoin = { partyId, destination: invite.destination };
  await chrome.storage.local.set({ pendingJoin });
  if (!sidebarOpened) await markToolbarJoin(tabId);
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
  await scanTab(tab.id);
}

function handleChromeActionClick(tab: chrome.tabs.Tab): void {
  if (!tab.id) return;

  if (partyState.kind === "active" && tab.id !== partyState.party.tabId) {
    // open() must run before focusParty awaits anything or Chrome drops the gesture.
    void chrome.sidePanel.open({ tabId: partyState.party.tabId }).catch(() => undefined);
    void focusParty(false);
    return;
  }

  const panelOpen = openSidePanelTabs.has(tab.id) || openSidePanelWindows.has(tab.windowId);
  if (panelOpen && activatedTabs.has(tab.id)) {
    void closeChromeSidePanel(tab);
    return;
  }

  if (!panelOpen) void chrome.sidePanel.open({ tabId: tab.id }).catch(() => undefined);
  // The action click has now granted activeTab. Inject immediately, exactly as
  // the original extension did, and let the open sidebar receive video status.
  void handleActionClick(tab);
}

async function closeChromeSidePanel(tab: chrome.tabs.Tab): Promise<void> {
  const sidePanel = chromeSidePanel();
  if (!sidePanel.close || !tab.id) return;

  const options: chrome.sidePanel.CloseOptions = openSidePanelTabs.has(tab.id)
    ? { tabId: tab.id }
    : { windowId: tab.windowId };
  openSidePanelTabs.delete(tab.id);
  openSidePanelWindows.delete(tab.windowId);
  await sidePanel.close(options).catch(() => undefined);
}

function startParty(partyId: string, tab: chrome.tabs.Tab, identity: PeerIdentity): void {
  if (!tab.id || !tab.url) return;
  partySocket?.close();
  playbackTarget = null;
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
      playbackTarget = {
        action,
        timeFromEnd: message.playback.timeFromEnd,
        updatedAt: message.playback.updatedAt,
      };
      void applyLatestRemotePlayback(partyId);
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
    const previousAction = playbackTarget?.action;
    playbackTarget = {
      action:
        message.action === "seek" && previousAction && previousAction !== "seek"
          ? previousAction
          : message.action,
      timeFromEnd: message.timeFromEnd,
      updatedAt: Date.now(),
    };
    void applyLatestRemotePlayback(partyId);
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
      rememberPlaybackTarget(result.action, result.timeFromEnd);
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
): Promise<PlaybackResult> {
  if (
    partyState.kind === "active" &&
    partyState.party.tabId === tabId &&
    !partyState.party.atDestination
  ) {
    return {
      ok: false,
      error: "Return to the party video to resume synchronization.",
      reason: "video-unavailable",
    };
  }
  const best = bestCandidate(tabId);
  if (!best)
    return {
      ok: false,
      error: "The video is no longer available.",
      reason: "video-unavailable",
    };
  try {
    const result = await chrome.tabs.sendMessage(
      tabId,
      { type: "video:apply", action, timeFromEnd },
      { frameId: best.frameId },
    );
    return result?.ok === false
      ? {
          ok: false,
          error: result.error ?? "Could not control the video.",
          reason: result.reason,
        }
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
  playbackTarget = null;
  transition(event);
  void chrome.action.setBadgeText({ text: "" });
  void chrome.action.setTitle({ title: "Open Jelly Party" });
  void restorePartyPanels();
}

async function returnToPartyVideo(): Promise<{ ok: boolean; error?: string }> {
  if (partyState.kind === "idle") return { ok: false, error: "There is no active party." };
  const { tabId, tabUrl } = partyState.party;
  try {
    const tab = await chrome.tabs.update(tabId, { url: tabUrl, active: true });
    if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
    return { ok: true };
  } catch {
    leaveParty();
    return { ok: false, error: "The party tab is no longer open." };
  }
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

async function scanTab(tabId: number): Promise<boolean> {
  const accessGranted = await injectVideoController(async (allFrames) => {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames },
      files: ["src/content/video.js"],
    });
  });
  if (accessGranted) activatedTabs.add(tabId);
  if (!accessGranted) {
    activatedTabs.delete(tabId);
    candidates.delete(tabId);
    if (partyState.kind === "active" && partyState.party.tabId === tabId) {
      transition({ type: "video", hasVideo: false });
    }
    await notifyViews({ type: "video:status", tabId, hasVideo: false, accessRequired: true });
  }
  return accessGranted;
}

async function handleTabUpdate(
  tabId: number,
  change: chrome.tabs.OnUpdatedInfo,
  tab: chrome.tabs.Tab,
): Promise<void> {
  if (change.url && partyState.kind === "active" && partyState.party.tabId === tabId) {
    transition({
      type: "tab-destination",
      tabId,
      atDestination: samePartyDestination(change.url, partyState.party.tabUrl),
    });
  }
  if (change.status === "loading") {
    candidates.delete(tabId);
    activatedTabs.delete(tabId);
    if (partyState.kind === "active" && partyState.party.tabId === tabId) {
      transition({ type: "video", hasVideo: false });
    }
  }
  if (change.status !== "complete") return;

  if (partyState.kind === "active" && partyState.party.tabId === tabId) {
    const destination = partyState.party.tabUrl;
    transition({
      type: "tab-destination",
      tabId,
      atDestination: Boolean(tab.url && samePartyDestination(tab.url, destination)),
    });
  }
  const accessGranted = await scanTab(tabId);
  await consumePendingJoin(tabId);
  if (
    partyState.kind === "active" &&
    partyState.party.tabId === tabId &&
    partyState.party.atDestination &&
    bestCandidate(tabId) &&
    playbackTarget
  ) {
    await applyLatestRemotePlayback(partyState.party.partyId);
  }
  await notifyViews({
    type: "tab:navigated",
    tabId,
    title: tab.title,
    video: videoScan(tabId, accessGranted),
  });
}

async function applyLatestRemotePlayback(partyId: string): Promise<void> {
  if (
    !playbackTarget ||
    partyState.kind === "idle" ||
    partyState.party.partyId !== partyId ||
    !partyState.party.atDestination
  ) {
    return;
  }
  const target = playbackTarget;
  const position =
    target.action === "play"
      ? liveTimeFromEnd({
          playing: true,
          timeFromEnd: target.timeFromEnd,
          updatedAt: target.updatedAt,
        })
      : target.timeFromEnd;
  const result = await applyPlayback(partyState.party.tabId, target.action, position);
  if (result.ok) {
    transitionIfCurrent(partyId, { type: "playback-blocked", blocked: false });
    return;
  }
  if (result.reason === "interaction-required") {
    transitionIfCurrent(partyId, { type: "playback-blocked", blocked: true });
    return;
  }
  if (result.reason !== "video-unavailable") {
    transitionIfCurrent(partyId, { type: "notice", notice: result.error });
  }
}

function rememberPlaybackTarget(action: "play" | "pause" | "seek", timeFromEnd: number): void {
  const previousAction = playbackTarget?.action;
  playbackTarget = {
    action:
      action === "seek" && previousAction && previousAction !== "seek" ? previousAction : action,
    timeFromEnd,
    updatedAt: Date.now(),
  };
}

function bestCandidate(tabId: number): VideoCandidate | undefined {
  return [...(candidates.get(tabId)?.values() ?? [])]
    .filter((candidate) => candidate.hasVideo)
    .sort((left, right) => right.area - left.area)[0];
}

function videoScan(
  tabId: number,
  accessGranted: boolean,
): { hasVideo: boolean; accessRequired: boolean } {
  return {
    hasVideo: Boolean(bestCandidate(tabId)),
    accessRequired: !accessGranted,
  };
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

async function preparePartySidebar(tabId: number): Promise<void> {
  await chrome.sidePanel
    ?.setOptions({ tabId, path: `src/sidebar/sidebar.html?tab=${tabId}`, enabled: true })
    .catch(() => undefined);
}

async function openPartySidebar(tabId: number): Promise<boolean> {
  if (chrome.sidePanel) {
    // Deliberately not awaited: open() has to stay in the caller's task so that a
    // user gesture still counts.
    void preparePartySidebar(tabId);
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

function chromeSidePanel(): typeof chrome.sidePanel & {
  close?: (options: chrome.sidePanel.CloseOptions) => Promise<void>;
  onClosed?: chrome.events.Event<(info: chrome.sidePanel.PanelClosedInfo) => void>;
} {
  return chrome.sidePanel as typeof chrome.sidePanel & {
    close?: (options: chrome.sidePanel.CloseOptions) => Promise<void>;
    onClosed?: chrome.events.Event<(info: chrome.sidePanel.PanelClosedInfo) => void>;
  };
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

function samePartyDestination(current: string, expected: string): boolean {
  try {
    const currentUrl = new URL(current);
    const expectedUrl = new URL(expected);
    currentUrl.hash = "";
    expectedUrl.hash = "";
    currentUrl.searchParams.sort();
    expectedUrl.searchParams.sort();
    return currentUrl.href === expectedUrl.href;
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
