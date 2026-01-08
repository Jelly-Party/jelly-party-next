<script lang="ts">
  import { optionsStore } from "../stores/options";
  import { getRandomEmoji } from "jelly-party-lib";
  import browser from "webextension-polyfill";

  let joinPartyId = $state("");

  $effect(() => {
    optionsStore.load();
  });

  function refreshEmoji() {
    optionsStore.updateField("emoji", getRandomEmoji());
  }

  function saveName(e: Event) {
    const input = e.target as HTMLInputElement;
    optionsStore.updateField("clientName", input.value);
  }

  async function openCurrentTab() {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["src/content/main.ts"],
        });
        window.close();
      } catch (e) {
        console.error("Failed to inject content script:", e);
      }
    }
  }

  function extractPartyId(input: string): string {
    try {
      const url = new URL(input);
      return url.searchParams.get("jellyPartyId") ?? input;
    } catch {
      return input;
    }
  }

  async function joinParty() {
    const partyId = extractPartyId(joinPartyId);
    if (!partyId) return;

    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id && tab.url) {
      const url = new URL(tab.url);
      url.searchParams.set("jellyPartyId", partyId);
      await browser.tabs.update(tab.id, { url: url.toString() });
      window.close();
    }
  }
</script>

<div class="header">
  <div class="logo">🎉</div>
  <h1>Jelly Party</h1>
  <p>Watch videos together!</p>
</div>

<div class="user-card">
  <div class="user-info">
    <button
      class="user-emoji"
      onclick={refreshEmoji}
      title="Click for new emoji"
    >
      {$optionsStore.emoji}
    </button>
    <div class="user-name">
      <input
        type="text"
        value={$optionsStore.clientName}
        onchange={saveName}
        placeholder="Your name"
      />
      <label>Your display name</label>
    </div>
  </div>
</div>

<div class="join-section">
  <label for="party-link">Join existing party</label>
  <input
    id="party-link"
    type="text"
    placeholder="Paste party link or ID..."
    bind:value={joinPartyId}
  />
</div>

<div class="actions">
  {#if joinPartyId}
    <button class="btn btn-primary" onclick={joinParty}>Join Party</button>
  {:else}
    <button class="btn btn-primary" onclick={openCurrentTab}
      >Start on This Page</button
    >
  {/if}
</div>

<div class="footer">
  <a href="https://jelly-party.com" target="_blank">jelly-party.com</a>
</div>
