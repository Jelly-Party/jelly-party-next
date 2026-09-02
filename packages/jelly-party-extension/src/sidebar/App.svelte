<script lang="ts">
  import { onMount, tick } from "svelte";
  import { buildMagicLink, MAX_CHAT_LENGTH, type PeerIdentity } from "jelly-party-lib";
  import {
    initialPartyState,
    partyViewForTab,
    type PartyState,
  } from "../background/party-state";
  import { isChatAttached } from "./chat-scroll";
  import BrandHeader from "./BrandHeader.svelte";
  import PartyView from "./PartyView.svelte";
  import SetupView from "./SetupView.svelte";
  let identity: PeerIdentity = { id: "", name: "", emoji: "🍿" };
  let viewTabId: number | null = null;
  let viewWindowId: number | null = null;
  let currentTabUrl = "";
  let tabTitle = "";
  let hasVideo = false;
  let cannotAccessTab = false;
  let loading = true;
  let notice = "";
  let message = "";
  let copied = false;
  let messagesElement: HTMLDivElement | null = null;
  let composerElement: HTMLTextAreaElement | null = null;
  let chatAttached = true;
  let unseenMessages = 0;
  let partyState: PartyState = initialPartyState;
  const requestedTabId = Number.parseInt(
    new URLSearchParams(location.search).get("tab") ?? "",
    10,
  );
  const isContextualPanel = Number.isInteger(requestedTabId);

  $: view = partyViewForTab(partyState, viewTabId);
  $: inviteLink =
    view.mode === "party"
      ? buildMagicLink(__JELLY_JOIN_URL__, view.party.partyId, view.party.tabUrl)
      : "";

  onMount(() => {
    const listener = (incoming: unknown) => {
      if (!isRecord(incoming)) return;
      if (incoming.type === "party:state" && isPartyState(incoming.state)) {
        void applyPartyState(incoming.state);
      }
      if (
        incoming.type === "tab:activated" &&
        typeof incoming.tabId === "number" &&
        typeof incoming.windowId === "number" &&
        !isContextualPanel &&
        viewWindowId === incoming.windowId
      ) {
        viewTabId = incoming.tabId;
        if (partyState.kind === "active" && partyState.party.tabId === incoming.tabId) {
          chatAttached = true;
          unseenMessages = 0;
          void tick().then(() => scrollChatToBottom());
        }
        void refreshTab(incoming.tabId);
      }
      if (
        incoming.type === "video:status" &&
        incoming.tabId === viewTabId &&
        partyState.kind === "idle"
      ) {
        hasVideo = incoming.hasVideo === true;
        if (incoming.accessRequired === true) {
          cannotAccessTab = true;
        }
        if (incoming.hasVideo === true || incoming.accessRequired === false) {
          cannotAccessTab = false;
        }
      }
      if (incoming.type === "tab:navigated" && incoming.tabId === viewTabId) {
        currentTabUrl = typeof incoming.url === "string" ? incoming.url : "";
        tabTitle = typeof incoming.title === "string" ? incoming.title : "Current video";
        applyVideoScan(incoming.video);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    void initialize();
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  });

  async function initialize(): Promise<void> {
    identity = await chrome.runtime.sendMessage({ type: "identity:get" });
    const tab = await chrome.runtime.sendMessage({
      type: "tab:snapshot",
      ...(isContextualPanel ? { tabId: requestedTabId } : {}),
    });
    if (tab?.tabId) {
      viewTabId = tab.tabId;
      viewWindowId = tab.windowId;
      currentTabUrl = tab.url ?? "";
      tabTitle = tab.title ?? "Current video";
      applyVideoScan(tab.video);
      await chrome.runtime.sendMessage({ type: "pending:consume", tabId: tab.tabId });
    } else {
      notice = tab?.error ?? "Open a web page containing a video, then try again.";
    }
    const state = await chrome.runtime.sendMessage({ type: "party:state" });
    loading = false;
    if (isPartyState(state)) await applyPartyState(state);
  }

  async function applyPartyState(nextState: PartyState): Promise<void> {
    const addedMessages = numberOfAddedMessages(partyState, nextState);
    const shouldFollow = chatAttached;
    partyState = nextState;

    if (nextState.kind === "idle") {
      chatAttached = true;
      unseenMessages = 0;
      return;
    }
    if (addedMessages === 0) return;

    await tick();
    if (shouldFollow) scrollChatToBottom();
    else unseenMessages += addedMessages;
  }

  function numberOfAddedMessages(previous: PartyState, next: PartyState): number {
    if (next.kind === "idle") return 0;
    if (previous.kind === "idle" || previous.party.partyId !== next.party.partyId) {
      return next.party.messages.length;
    }

    const previousLast = previous.party.messages.at(-1);
    const nextLast = next.party.messages.at(-1);
    if (!nextLast || previousLast?.id === nextLast.id) {
      return 0;
    }
    return Math.max(1, next.party.messages.length - previous.party.messages.length);
  }

  function handleChatScroll(): void {
    if (!messagesElement) return;
    chatAttached = isChatAttached(messagesElement);
    if (chatAttached) unseenMessages = 0;
  }

  function scrollChatToBottom(behavior: ScrollBehavior = "auto"): void {
    if (!messagesElement) return;
    chatAttached = true;
    unseenMessages = 0;
    messagesElement.scrollTo({ top: messagesElement.scrollHeight, behavior });
  }

  async function refreshTab(tabId: number | null): Promise<void> {
    if (tabId === null) return;
    const tab = await chrome.runtime.sendMessage({ type: "tab:snapshot", tabId });
    if (tab?.tabId) {
      currentTabUrl = tab.url ?? "";
      tabTitle = tab.title ?? "Current video";
      applyVideoScan(tab.video);
      notice = "";
    }
  }

  function applyVideoScan(candidate: unknown): void {
    const scan = isRecord(candidate) ? candidate : {};
    hasVideo = scan.hasVideo === true;
    cannotAccessTab = scan.accessRequired === true;
  }

  async function saveIdentity(): Promise<void> {
    identity = await chrome.runtime.sendMessage({
      type: "identity:set",
      name: identity.name,
      emoji: identity.emoji,
    });
  }

  async function createParty(): Promise<void> {
    if (viewTabId === null) return;
    try {
      const granted = await requestSiteAccess(currentTabUrl);
      if (!granted) {
        notice = "Allow Jelly Party to access this video site before starting the party.";
        return;
      }
    } catch {
      notice = "The browser did not grant access to this video site.";
      return;
    }
    await saveIdentity();
    notice = "";
    const result = await chrome.runtime.sendMessage({ type: "party:create", tabId: viewTabId });
    if (!result?.ok) notice = result?.error ?? "Could not start the party.";
  }

  async function leaveParty(): Promise<void> {
    await chrome.runtime.sendMessage({ type: "party:leave" });
    message = "";
    notice = "";
  }

  async function retry(): Promise<void> {
    notice = "";
    await chrome.runtime.sendMessage({ type: "party:retry" });
  }

  async function returnToParty(): Promise<void> {
    const result = await chrome.runtime.sendMessage({ type: "party:focus" });
    if (!result?.ok) notice = result?.error ?? "Could not return to the party tab.";
  }

  async function returnToPartyVideo(): Promise<void> {
    const result = await chrome.runtime.sendMessage({ type: "party:return-video" });
    if (!result?.ok) notice = result?.error ?? "Could not return to the party video.";
  }

  async function allowPartySite(): Promise<void> {
    if (view.mode !== "party") return;
    const permissionRequest = requestSiteAccess(currentTabUrl);
    try {
      if (!permissionRequest) {
        notice = "The current site URL is unavailable. Reload the page and try again.";
        return;
      }
      const granted = await permissionRequest;
      if (!granted) {
        notice = "Jelly Party needs access to this site to synchronize its video.";
        return;
      }
      notice = "";
      await chrome.runtime.sendMessage({ type: "tab:snapshot", tabId: view.party.tabId });
    } catch {
      notice = "The browser did not grant access to this video site.";
    }
  }

  function requestSiteAccess(url: string): Promise<boolean> | null {
    let origin: string;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
      origin = parsed.origin;
    } catch {
      return null;
    }
    // E2E builds pre-grant test hosts and intentionally have no optional hosts.
    // Production reaches request() synchronously from the button gesture.
    if (!chrome.runtime.getManifest().optional_host_permissions?.length) {
      return Promise.resolve(true);
    }
    return chrome.permissions.request({ origins: [`${origin}/*`] });
  }

  async function sendChat(): Promise<void> {
    const text = message.trim();
    if (!text || text.length > MAX_CHAT_LENGTH) return;
    const result = await chrome.runtime.sendMessage({ type: "party:chat", text });
    if (result?.ok) {
      notice = "";
      message = "";
      await tick();
      resizeComposer();
    } else {
      notice = result?.error ?? "Message not sent. Reconnect and try again.";
    }
  }

  async function makeLeader(peerId: string): Promise<void> {
    const result = await chrome.runtime.sendMessage({ type: "party:leader", peerId });
    if (!result?.ok) notice = result?.error ?? "Could not change the party leader.";
    else notice = "";
  }

  function handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    void sendChat();
  }

  function resizeComposer(): void {
    if (!composerElement) return;
    composerElement.style.height = "auto";
    composerElement.style.height = `${Math.min(composerElement.scrollHeight, 120)}px`;
  }

  async function loadOlderChat(): Promise<void> {
    if (view.mode !== "party") return;
    const beforeId = view.party.messages[0]?.id;
    if (!beforeId) return;
    await chrome.runtime.sendMessage({ type: "party:history", beforeId });
  }

  async function copyInvite(): Promise<void> {
    try {
      await navigator.clipboard.writeText(inviteLink);
      notice = "";
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      notice = "Could not copy the invite. Please try again.";
    }
  }

  function isPartyState(value: unknown): value is PartyState {
    return isRecord(value) && (value.kind === "idle" || value.kind === "active");
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
</script>

<svelte:head><title>Jelly Party</title></svelte:head>

<main class:party-active={!loading && view.mode === "party"} class="sidebar-root" data-testid="sidebar">
  {#if loading || view.mode !== "party"}
    <BrandHeader />
  {/if}

  {#if loading}
    <section class="jp-panel p-4" aria-live="polite">Finding your video…</section>
  {:else if view.mode === "setup"}
    <SetupView
      bind:identity
      {tabTitle}
      {hasVideo}
      {cannotAccessTab}
      {notice}
      canCreate={viewTabId !== null}
      onCreate={createParty}
    />
  {:else if view.mode === "away"}
    <section class="jp-panel mt-2 flex flex-col gap-4 p-4 text-center" data-testid="away-view">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-violet-500/20 text-violet-300" aria-hidden="true">▶</div>
      <div>
        <h2 class="m-0 text-lg">Your party is still active</h2>
        <p class="m-0 mt-1 truncate text-sm leading-5 text-slate-400" title={view.party.tabTitle}>{view.party.tabTitle}</p>
        <p class="m-0 text-sm text-slate-400">Return to the video and party chat.</p>
      </div>
      <button class="jp-button-primary" on:click={returnToParty} data-testid="return-to-party">Return to party</button>
      <button class="jp-button-danger" on:click={leaveParty} data-testid="leave-party">Leave party</button>
      {#if notice}<p class="jp-notice m-0" role="alert">{notice}</p>{/if}
    </section>
  {:else}
    <PartyView
      party={view.party}
      {identity}
      {inviteLink}
      {notice}
      {copied}
      {unseenMessages}
      bind:message
      bind:messagesElement
      bind:composerElement
      onCopyInvite={copyInvite}
      onLeave={leaveParty}
      onRetry={retry}
      onReturnToVideo={returnToPartyVideo}
      onAllowSite={allowPartySite}
      onMakeLeader={makeLeader}
      onSend={sendChat}
      onLoadOlder={loadOlderChat}
      onChatScroll={handleChatScroll}
      onScrollToBottom={scrollChatToBottom}
      onComposerInput={resizeComposer}
      onComposerKeydown={handleComposerKeydown}
    />
  {/if}
</main>
