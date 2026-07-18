<script lang="ts">
  import { onMount, tick } from "svelte";
  import { buildMagicLink, MAX_CHAT_LENGTH, type PeerIdentity } from "jelly-party-lib";
  import {
    initialPartyState,
    partyViewForTab,
    type PartyConnectionStatus,
    type PartyState,
  } from "../background/party-state";
  import { isChatAttached } from "./chat-scroll";
  import { shouldFollowTabActivation } from "./view-context";

  let identity: PeerIdentity = { id: "", name: "", emoji: "🍿" };
  let viewTabId: number | null = null;
  let viewWindowId: number | null = null;
  let tabTitle = "";
  let hasVideo = false;
  let loading = true;
  let notice = "";
  let message = "";
  let copied = false;
  let messagesElement: HTMLDivElement | null = null;
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
        shouldFollowTabActivation(isContextualPanel, viewWindowId, incoming.windowId)
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
      }
      if (incoming.type === "tab:navigated" && incoming.tabId === viewTabId) {
        void refreshTab(viewTabId);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    void initialize();
    return () => chrome.runtime.onMessage.removeListener(listener);
  });

  async function initialize(): Promise<void> {
    identity = await chrome.runtime.sendMessage({ type: "identity:get" });
    const tab = await chrome.runtime.sendMessage({
      type: "tab:active",
      ...(isContextualPanel ? { tabId: requestedTabId } : {}),
    });
    if (tab?.tabId) {
      viewTabId = tab.tabId;
      viewWindowId = tab.windowId;
      tabTitle = tab.title ?? "Current video";
      const candidate = await chrome.runtime.sendMessage({ type: "video:scan", tabId: tab.tabId });
      hasVideo = candidate?.hasVideo === true;
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
    if (
      !nextLast ||
      (previousLast &&
        previousLast.sentAt === nextLast.sentAt &&
        previousLast.peer.id === nextLast.peer.id &&
        previousLast.text === nextLast.text)
    ) {
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
    const tab = await chrome.runtime.sendMessage({ type: "tab:active", tabId });
    if (tab?.tabId) {
      tabTitle = tab.title ?? "Current video";
      const candidate = await chrome.runtime.sendMessage({ type: "video:scan", tabId });
      hasVideo = candidate?.hasVideo === true;
      notice = "";
    }
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
    await chrome.runtime.sendMessage({ type: "party:retry" });
  }

  async function returnToParty(): Promise<void> {
    const result = await chrome.runtime.sendMessage({ type: "party:focus" });
    if (!result?.ok) notice = result?.error ?? "Could not return to the party tab.";
  }

  async function sendChat(): Promise<void> {
    const text = message.trim();
    if (!text || text.length > MAX_CHAT_LENGTH) return;
    const result = await chrome.runtime.sendMessage({ type: "party:chat", text });
    if (result?.ok) message = "";
  }

  async function copyInvite(): Promise<void> {
    try {
      await navigator.clipboard.writeText(inviteLink);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      notice = "Could not copy the invite. Please try again.";
    }
  }

  function connectionLabel(status: PartyConnectionStatus): string {
    if (status === "connected") return "Connected";
    if (status === "connecting") return "Connecting…";
    return "Connection lost";
  }

  function isPartyState(value: unknown): value is PartyState {
    return isRecord(value) && (value.kind === "idle" || value.kind === "active");
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
</script>

<svelte:head><title>Jelly Party</title></svelte:head>

<main class="h-screen min-h-0 flex flex-col gap-4 overflow-y-auto p-4 text-slate-100" data-testid="sidebar">
  <header class="flex items-center gap-3">
    <div class="logo" aria-hidden="true">🪼</div>
    <div class="min-w-0">
      <h1 class="m-0 text-xl font-700">Jelly Party</h1>
      <p class="m-0 truncate text-sm text-slate-400">
        {view.mode === "party" ? view.party.tabTitle : "Watch together, right beside the video."}
      </p>
    </div>
  </header>

  {#if loading}
    <section class="card" aria-live="polite">Finding your video…</section>
  {:else if view.mode === "setup"}
    <section class="card flex flex-col gap-3" data-testid="setup-view">
      <div>
        <h2 class="section-title">Start watching together</h2>
        <p class="m-0 mt-1 text-sm leading-5 text-slate-400">Choose how friends will see you in the party.</p>
      </div>
      <label>Display name <input bind:value={identity.name} maxlength="40" data-testid="name-input" /></label>
      <label>Emoji <input bind:value={identity.emoji} maxlength="16" data-testid="emoji-input" /></label>
      <div class:ok={hasVideo} class="video-state" data-testid="video-state">
        {hasVideo ? "Video ready" : "No video found in this tab"}
      </div>
      <p class="m-0 truncate text-sm text-slate-400" title={tabTitle}>{tabTitle || "No supported tab"}</p>
      <button
        class="primary"
        on:click={createParty}
        disabled={!viewTabId || !hasVideo || !identity.name.trim()}
        data-testid="create-party"
      >
        Start party
      </button>
      {#if notice}<p class="notice" role="alert">{notice}</p>{/if}
    </section>
  {:else if view.mode === "away"}
    <section class="card mt-2 flex flex-col gap-4 text-center" data-testid="away-view">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-violet-500/20 text-violet-300" aria-hidden="true">▶</div>
      <div>
        <h2 class="m-0 text-lg">Your party is still active</h2>
        <p class="m-0 mt-1 truncate text-sm leading-5 text-slate-400" title={view.party.tabTitle}>{view.party.tabTitle}</p>
        <p class="m-0 text-sm text-slate-400">Return to the video and party chat.</p>
      </div>
      <button class="primary" on:click={returnToParty} data-testid="return-to-party">Return to party</button>
      <button class="text-rose-300 hover:bg-rose-500/10" on:click={leaveParty} data-testid="leave-party">Leave party</button>
      {#if notice}<p class="notice" role="alert">{notice}</p>{/if}
    </section>
  {:else}
    <section class="card flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="mb-1 text-xs font-700 tracking-widest text-indigo-300 uppercase">Watching together</div>
        <h2 class="m-0 truncate text-base leading-5" title={view.party.tabTitle}>{view.party.tabTitle}</h2>
        <div class="mt-2 text-xs text-slate-400" data-testid="connection-status">
          <span class="status-dot" class:online={view.party.status === "connected"}></span>
          {connectionLabel(view.party.status)} · {view.party.peers.length} {view.party.peers.length === 1 ? "person" : "people"}
        </div>
      </div>
      <button class="text-rose-300 hover:bg-rose-500/10" on:click={leaveParty} data-testid="leave-party">Leave</button>
    </section>

    <section class="card flex flex-col gap-3">
      <div>
        <h2 class="section-title">Invite friends</h2>
        <p class="m-0 mt-1 text-sm leading-5 text-slate-400">One link opens this video and joins the party.</p>
      </div>
      <span class="sr-only" data-testid="invite-link">{inviteLink}</span>
      <button class="primary" on:click={copyInvite} data-testid="copy-invite">
        {copied ? "Invite copied!" : "Copy invite link"}
      </button>
      <ul class="peer-list" aria-label="People in this party" data-testid="peer-list">
        {#each view.party.peers as peer (peer.id)}
          <li data-testid="peer">{peer.emoji} {peer.name}{peer.id === identity.id ? " (you)" : ""}</li>
        {/each}
      </ul>
    </section>

    <section class="card min-h-0 flex flex-1 flex-col gap-3 overflow-hidden">
      <h2 class="section-title">Chat</h2>
      <div class="relative min-h-0 flex-1">
        <div
          class="messages h-full overscroll-contain [scrollbar-gutter:stable]"
          bind:this={messagesElement}
          on:scroll={handleChatScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          data-testid="messages"
        >
          {#if view.party.messages.length === 0}<p class="empty">No messages yet. Say hello!</p>{/if}
          {#each view.party.messages as entry}
            <article class="message" data-testid="chat-message">
              <strong>{entry.peer.emoji} {entry.peer.name}</strong><p>{entry.text}</p>
            </article>
          {/each}
        </div>
        {#if unseenMessages > 0}
          <button
            class="absolute bottom-2 left-1/2 z-1 -translate-x-1/2 whitespace-nowrap border-violet-400/30 bg-violet-950/95 px-3 py-2 text-xs font-700 text-violet-100 shadow-lg hover:bg-violet-900"
            on:click={() => scrollChatToBottom("smooth")}
            data-testid="new-messages"
          >
            ↓ {unseenMessages} new {unseenMessages === 1 ? "message" : "messages"}
          </button>
        {/if}
      </div>
      <form class="flex gap-2" on:submit|preventDefault={sendChat}>
        <label class="sr-only" for="message">Message</label>
        <input
          id="message"
          class="min-w-0 flex-1"
          bind:value={message}
          maxlength={MAX_CHAT_LENGTH}
          placeholder="Message the party"
          data-testid="chat-input"
        />
        <button class="primary" type="submit" disabled={!message.trim()} data-testid="send-chat">Send</button>
      </form>
      {#if view.party.status === "disconnected"}
        <div class="notice flex items-center justify-between gap-3" role="alert">
          <span>Connection lost. Your party is still here.</span>
          <button on:click={retry} data-testid="retry">Retry</button>
        </div>
      {/if}
      {#if !view.party.hasVideo}<p class="notice" role="alert">The video is unavailable. Return to the page or reload it.</p>{/if}
      {#if view.party.notice}<p class="notice" role="alert">{view.party.notice}</p>{/if}
    </section>
  {/if}
</main>
