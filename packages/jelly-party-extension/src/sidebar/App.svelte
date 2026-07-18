<script lang="ts">
  import { onMount } from "svelte";
  import {
    buildMagicLink,
    MAX_CHAT_LENGTH,
    type PeerIdentity,
    type PlaybackAction,
    type ServerMessage,
  } from "jelly-party-lib";
  import { PartySocket } from "./party-socket";

  interface ChatEntry {
    peer: PeerIdentity;
    text: string;
    sentAt: number;
  }

  let identity: PeerIdentity = { id: "", name: "", emoji: "🍿" };
  let tabId: number | null = null;
  let tabUrl = "";
  let tabTitle = "";
  let partyId = "";
  let peers: PeerIdentity[] = [];
  let messages: ChatEntry[] = [];
  let message = "";
  let status: "loading" | "ready" | "connecting" | "connected" | "disconnected" = "loading";
  let notice = "";
  let hasVideo = false;
  let copied = false;
  let socket: PartySocket | null = null;
  $: inviteLink = partyId && tabUrl ? buildMagicLink(__JELLY_JOIN_URL__, partyId, tabUrl) : "";

  onMount(() => {
    const listener = (incoming: unknown) => {
      if (!isRecord(incoming)) return;
      if (incoming.type === "video:status" && incoming.tabId === tabId) {
        hasVideo = incoming.hasVideo === true;
      }
      if (
        incoming.type === "video:local" &&
        incoming.tabId === tabId &&
        isPlaybackAction(incoming.action) &&
        typeof incoming.timeFromEnd === "number"
      ) {
        socket?.playback(incoming.action, incoming.timeFromEnd);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    window.addEventListener("pagehide", leave);
    void initialize();
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  });

  async function initialize(): Promise<void> {
    identity = await chrome.runtime.sendMessage({ type: "identity:get" });
    const requestedTab = Number.parseInt(new URLSearchParams(location.search).get("tab") ?? "", 10);
    const tab = await chrome.runtime.sendMessage({
      type: "tab:active",
      ...(Number.isInteger(requestedTab) ? { tabId: requestedTab } : {}),
    });
    if (tab.error || !tab.tabId || !tab.url?.startsWith("http")) {
      notice = tab.error ?? "Open a web page containing a video, then try again.";
      status = "ready";
      return;
    }
    tabId = tab.tabId;
    tabUrl = tab.url;
    tabTitle = tab.title ?? "Current video";
    const candidate = await chrome.runtime.sendMessage({ type: "video:scan", tabId });
    hasVideo = candidate?.hasVideo === true;
    const pending = await chrome.runtime.sendMessage({ type: "pending:consume", tabId });
    status = "ready";
    if (pending?.partyId) connect(pending.partyId);
  }

  async function saveIdentity(): Promise<void> {
    identity = await chrome.runtime.sendMessage({
      type: "identity:set",
      name: identity.name,
      emoji: identity.emoji,
    });
  }

  function createParty(): void {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const id = btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    connect(id);
  }

  function connect(id: string): void {
    void saveIdentity();
    partyId = id;
    peers = [];
    messages = [];
    notice = "";
    status = "connecting";
    socket = new PartySocket(__JELLY_WS_URL__, {
      onOpen: () => (status = "connected"),
      onClose: () => {
        if (partyId) status = "disconnected";
      },
      onError: (error) => (notice = error),
      onMessage: handlePartyMessage,
    });
    socket.connect(id, identity);
  }

  function handlePartyMessage(incoming: ServerMessage): void {
    if (incoming.type === "presence") peers = incoming.peers;
    if (incoming.type === "chat") {
      messages = [...messages, { peer: incoming.peer, text: incoming.text, sentAt: incoming.sentAt }];
    }
    if (incoming.type === "playback" && incoming.peerId !== identity.id && tabId !== null) {
      void chrome.runtime
        .sendMessage({
          type: "video:apply",
          tabId,
          action: incoming.action,
          timeFromEnd: incoming.timeFromEnd,
        })
        .then((result) => {
          if (result?.ok === false) notice = result.error;
        });
    }
    if (incoming.type === "error") notice = incoming.message;
  }

  function sendChat(): void {
    const text = message.trim();
    if (!text || text.length > MAX_CHAT_LENGTH) return;
    socket?.chat(text);
    message = "";
  }

  async function copyInvite(): Promise<void> {
    await navigator.clipboard.writeText(inviteLink);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  function leave(): void {
    socket?.close();
    socket = null;
    partyId = "";
    peers = [];
    messages = [];
    status = "ready";
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  function isPlaybackAction(value: unknown): value is PlaybackAction {
    return value === "play" || value === "pause" || value === "seek";
  }
</script>

<svelte:head><title>Jelly Party</title></svelte:head>

<main class="min-h-screen flex flex-col gap-4 p-4 text-slate-100" data-testid="sidebar">
  <header class="flex items-center gap-3">
    <div class="logo" aria-hidden="true">🪼</div>
    <div>
      <h1 class="m-0 text-xl font-700">Jelly Party</h1>
      <p class="m-0 text-sm text-slate-400">Watch together, right beside the video.</p>
    </div>
  </header>

  {#if status === "loading"}
    <section class="card" aria-live="polite">Finding the active video…</section>
  {:else if !partyId}
    <section class="card flex flex-col gap-3">
      <h2 class="section-title">Your party identity</h2>
      <label>Display name <input bind:value={identity.name} maxlength="40" data-testid="name-input" /></label>
      <label>Emoji <input bind:value={identity.emoji} maxlength="16" data-testid="emoji-input" /></label>
      <div class:ok={hasVideo} class="video-state" data-testid="video-state">
        {hasVideo ? "Video ready" : "No video found yet"}
      </div>
      <p class="truncate text-sm text-slate-400" title={tabTitle}>{tabTitle || "No supported active tab"}</p>
      <button class="primary" on:click={createParty} disabled={!tabId || !hasVideo || !identity.name.trim()} data-testid="create-party">
        Create party
      </button>
      {#if notice}<p class="notice" role="alert">{notice}</p>{/if}
    </section>
  {:else}
    <section class="card flex items-center justify-between gap-2">
      <div>
        <span class="status-dot" class:online={status === "connected"}></span>
        <strong data-testid="connection-status">{status}</strong>
        <div class="text-xs text-slate-400" data-testid="party-id">Party {partyId.slice(0, 8)}</div>
      </div>
      <div class="flex gap-2">
        {#if status === "disconnected"}<button on:click={() => connect(partyId)} data-testid="retry">Retry</button>{/if}
        <button on:click={leave} data-testid="leave-party">Leave</button>
      </div>
    </section>

    <section class="card flex flex-col gap-3">
      <label>Invite link <input value={inviteLink} readonly data-testid="invite-link" /></label>
      <button class="primary" on:click={copyInvite} data-testid="copy-invite">{copied ? "Copied!" : "Copy invite link"}</button>
      <h2 class="section-title">Here now · {peers.length}</h2>
      <ul class="peer-list" data-testid="peer-list">
        {#each peers as peer (peer.id)}<li data-testid="peer">{peer.emoji} {peer.name}{peer.id === identity.id ? " (you)" : ""}</li>{/each}
      </ul>
    </section>

    <section class="card min-h-0 flex flex-1 flex-col gap-3">
      <h2 class="section-title">Chat</h2>
      <div class="messages" aria-live="polite" data-testid="messages">
        {#if messages.length === 0}<p class="empty">No messages yet. Say hello!</p>{/if}
        {#each messages as entry}
          <article class="message" data-testid="chat-message"><strong>{entry.peer.emoji} {entry.peer.name}</strong><p>{entry.text}</p></article>
        {/each}
      </div>
      <form class="flex gap-2" on:submit|preventDefault={sendChat}>
        <label class="sr-only" for="message">Message</label>
        <input id="message" class="min-w-0 flex-1" bind:value={message} maxlength={MAX_CHAT_LENGTH} placeholder="Message the party" data-testid="chat-input" />
        <button class="primary" type="submit" disabled={!message.trim()} data-testid="send-chat">Send</button>
      </form>
      {#if !hasVideo}<p class="notice" role="alert">Video lost. Return to the page or reload it, then retry.</p>{/if}
      {#if notice}<p class="notice" role="alert">{notice}</p>{/if}
    </section>
  {/if}
</main>
