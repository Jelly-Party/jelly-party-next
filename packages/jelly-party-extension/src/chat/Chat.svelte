<script lang="ts">
  import { partyClient } from "../lib/PartyClient";
  import { optionsStore } from "../stores/options";
  import { type ChatMessage, isInParty, partyStore } from "../stores/party";

  let isMinimized = $state(false);
  let messageInput = $state("");
  const messagesContainer: HTMLElement | null = $state(null);

  // Load options on mount
  $effect(() => {
    optionsStore.load();
  });

  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    if ($partyStore.messages.length > 0 && messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  // Listen for auto-join events from content script
  $effect(() => {
    const handler = (e: CustomEvent) => {
      const { partyId } = e.detail;
      if (partyId && $optionsStore.guid) {
        joinParty(partyId);
      }
    };
    window.addEventListener("jellyparty:autoJoin", handler as EventListener);
    return () =>
      window.removeEventListener(
        "jellyparty:autoJoin",
        handler as EventListener,
      );
  });

  function toggleMinimize() {
    isMinimized = !isMinimized;
    window.parent.postMessage(
      { type: isMinimized ? "jellyparty:minimize" : "jellyparty:maximize" },
      "*",
    );
  }

  async function createParty() {
    const partyId = crypto.randomUUID().slice(0, 8);
    await joinParty(partyId);
    const link = `${window.location.origin}${window.location.pathname}?jellyPartyId=${partyId}`;
    navigator.clipboard.writeText(link);
  }

  async function joinParty(partyId: string) {
    await partyClient.connect(partyId, {
      clientName: $optionsStore.clientName,
      emoji: $optionsStore.emoji,
    });
  }

  function leaveParty() {
    partyClient.disconnect();
  }

  function sendMessage() {
    if (!messageInput.trim()) return;
    partyClient.sendChatMessage(messageInput.trim());

    const localMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      peerUuid: $partyStore.localUser?.uuid ?? "",
      peerName: $optionsStore.clientName,
      peerEmoji: $optionsStore.emoji,
      text: messageInput.trim(),
      timestamp: Date.now(),
    };
    partyStore.addMessage(localMsg);
    messageInput = "";
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

{#if isMinimized}
  <button class="fab" onclick={toggleMinimize}>
    <span class="logo">🎉</span>
  </button>
{:else}
  <div class="chat-container">
    <header class="chat-header">
      <h1>
        🎉 Jelly Party
        {#if $isInParty}
          <span class="peer-count">({$partyStore.peers.length} peers)</span>
        {/if}
      </h1>
      <div class="header-actions">
        {#if $isInParty}
          <button class="icon-btn" onclick={leaveParty} title="Leave party"
            >🚪</button
          >
        {/if}
        <button class="icon-btn" onclick={toggleMinimize} title="Minimize"
          >➖</button
        >
      </div>
    </header>

    {#if $isInParty}
      <div class="peer-list">
        {#each $partyStore.peers as peer (peer.uuid)}
          <div
            class="peer"
            class:self={peer.uuid === $partyStore.localUser?.uuid}
          >
            <span class="emoji">{peer.clientState.emoji}</span>
            <span>{peer.clientState.clientName}</span>
          </div>
        {/each}
      </div>

      <div class="messages" bind:this={messagesContainer}>
        {#each $partyStore.messages as msg (msg.id)}
          <div class="message">
            <span class="emoji">{msg.peerEmoji}</span>
            <div class="message-content">
              <div class="message-header">
                <span class="message-name">{msg.peerName}</span>
                <span class="message-time">{formatTime(msg.timestamp)}</span>
              </div>
              <p class="message-text">{msg.text}</p>
            </div>
          </div>
        {/each}
      </div>

      <div class="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          bind:value={messageInput}
          onkeydown={handleKeyDown}
        />
        <button class="send-btn" onclick={sendMessage}>Send</button>
      </div>
    {:else}
      <div class="not-connected">
        <span class="emoji">🎬</span>
        <h2>Watch Together</h2>
        <p>Create a party to watch videos in sync with friends!</p>
        <button class="create-btn" onclick={createParty}>Create Party</button>
      </div>
    {/if}
  </div>
{/if}
