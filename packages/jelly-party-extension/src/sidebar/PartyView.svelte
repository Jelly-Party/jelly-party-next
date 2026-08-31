<script lang="ts">
  import { MAX_CHAT_LENGTH, type PeerIdentity } from "jelly-party-lib";
  import type { ActiveParty, PartyConnectionStatus } from "../background/party-state";

  export let party: ActiveParty;
  export let identity: PeerIdentity;
  export let inviteLink = "";
  export let notice = "";
  export let message = "";
  export let copied = false;
  export let unseenMessages = 0;
  export let messagesElement: HTMLDivElement | null = null;
  export let composerElement: HTMLTextAreaElement | null = null;
  export let onCopyInvite: () => void = () => {};
  export let onLeave: () => void = () => {};
  export let onRetry: () => void = () => {};
  export let onReturnToVideo: () => void = () => {};
  export let onSend: () => void = () => {};
  export let onLoadOlder: () => void = () => {};
  export let onChatScroll: () => void = () => {};
  export let onScrollToBottom: (behavior?: ScrollBehavior) => void = () => {};
  export let onComposerInput: () => void = () => {};
  export let onComposerKeydown: (event: KeyboardEvent) => void = () => {};

  function connectionLabel(status: PartyConnectionStatus): string {
    if (status === "connected") return "Connected";
    if (status === "connecting") return "Connecting…";
    return "Connection lost";
  }

  function formatMessageTime(sentAt: number): string {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
      sentAt,
    );
  }
</script>

<div class="party-workspace">
  <header class="party-header">
    <div class="party-context min-w-0">
      <span
        class="status-dot"
        class:online={party.status === "connected"}
        class:offline={party.status === "disconnected"}
        aria-hidden="true"
      ></span>
      <div class="min-w-0">
        <p class="party-eyebrow">Watching together</p>
        <h1 class="party-title" title={party.tabTitle}>{party.tabTitle}</h1>
      </div>
    </div>
    <div class="party-actions">
      <button
        class="header-button"
        on:click={onCopyInvite}
        aria-label="Copy invite link"
        title="Copy invite link"
        data-testid="copy-invite"
      >
        <svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </svg>
        <span>Copy invite</span>
      </button>
      <button
        class="header-button leave-button"
        on:click={onLeave}
        aria-label="Leave party"
        title="Leave party"
        data-testid="leave-party"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5v-2H7V6h3V4Zm7.59 3.59L16.17 9l2 2H9v2h9.17l-2 2 1.42 1.41L22 12l-4.41-4.41Z" /></svg>
        <span>Leave</span>
      </button>
    </div>
  </header>

  <div class="party-meta">
    <span class="connection-label" data-testid="connection-status">
      {connectionLabel(party.status)} · {party.peers.length} {party.peers.length === 1 ? "person" : "people"}
    </span>
    <ul class="peer-list" aria-label="People in this party" data-testid="peer-list">
      {#each party.peers as peer (peer.id)}
        <li data-testid="peer" title={`${peer.name}${peer.id === identity.id ? " (you)" : ""}`}>
          <span aria-hidden="true">{peer.emoji}</span>
          <span>{peer.name}{peer.id === identity.id ? " (you)" : ""}</span>
        </li>
      {/each}
    </ul>
  </div>

  <span class="sr-only" data-testid="invite-link">{inviteLink}</span>

  <section class="chat-workspace">
    <h2 class="sr-only">Party chat</h2>
    <div
      class="messages overscroll-contain [scrollbar-gutter:stable]"
      bind:this={messagesElement}
      on:scroll={onChatScroll}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      data-testid="messages"
    >
      {#if party.hasMoreHistory}
        <button class="load-history" on:click={onLoadOlder} data-testid="load-history">
          Load older messages
        </button>
      {/if}
      {#if party.messages.length === 0}
        <div class="empty">
          <span aria-hidden="true">💬</span>
          <strong>No messages yet</strong>
          <p>Say hello and start the watch party.</p>
        </div>
      {/if}
      {#each party.messages as entry}
        <article class:own={entry.peer.id === identity.id} class="message" data-testid="chat-message">
          <header>
            <strong>{entry.peer.emoji} {entry.peer.name}</strong>
            <time datetime={new Date(entry.sentAt).toISOString()}>{formatMessageTime(entry.sentAt)}</time>
          </header>
          <p>{entry.text}</p>
        </article>
      {/each}
    </div>
    {#if unseenMessages > 0}
      <button
        class="new-messages-button"
        on:click={() => onScrollToBottom("smooth")}
        data-testid="new-messages"
      >
        ↓ {unseenMessages} new {unseenMessages === 1 ? "message" : "messages"}
      </button>
    {/if}

    {#if party.status === "disconnected"}
      <div class="party-alert" role="alert">
        <span><strong>Connection lost.</strong> Your party and draft are still here.</span>
        <button class="jp-button-secondary min-h-9 px-3 py-1.5" on:click={onRetry} data-testid="retry">Retry</button>
      </div>
    {:else if !party.atDestination}
      <div class="party-alert" role="alert" data-testid="return-to-video-notice">
        <span><strong>Playback sync paused.</strong> Return to the party video to resume.</span>
        <button
          class="jp-button-secondary min-h-9 px-3 py-1.5"
          on:click={onReturnToVideo}
          data-testid="return-to-video"
        >Return</button>
      </div>
    {:else if party.playbackBlocked}
      <div class="party-alert" role="alert" data-testid="playback-blocked-notice">
        <span><strong>Playback needs one click.</strong> Press Play on the video to resume synchronization.</span>
      </div>
    {:else if !party.hasVideo}
      <div class="party-alert" role="alert">The video is unavailable. Return to the page or reload it.</div>
    {:else if notice || party.notice}
      <div class="party-alert" role="alert">{notice || party.notice}</div>
    {/if}

    <form class="composer" on:submit|preventDefault={onSend}>
      <label class="sr-only" for="message">Message the party</label>
      <textarea
        id="message"
        bind:this={composerElement}
        bind:value={message}
        maxlength={MAX_CHAT_LENGTH}
        rows="1"
        placeholder="Message the party…"
        on:input={onComposerInput}
        on:keydown={onComposerKeydown}
        disabled={party.status !== "connected"}
        data-testid="chat-input"
      ></textarea>
      <button
        class="send-button"
        type="submit"
        disabled={!message.trim() || party.status !== "connected"}
        aria-label="Send message"
        title="Send message"
        data-testid="send-chat"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.4 20.4 17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a.75.75 0 0 0-1.03.82l1.1 5.96L14 12 3.47 13.62l-1.1 5.96a.75.75 0 0 0 1.03.82Z" /></svg>
      </button>
    </form>
  </section>

  {#if copied}<div class="toast" role="status">Invite link copied</div>{/if}
</div>
