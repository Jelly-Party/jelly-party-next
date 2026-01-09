<script lang="ts">
import { optionsStore } from "../stores/options";

let joinPartyId = $state("");

$effect(() => {
	optionsStore.load();
});

function extractPartyId(input: string): string {
	try {
		const url = new URL(input);
		const partyId = url.searchParams.get("jellyPartyId");
		if (partyId) return partyId;
	} catch {
		// Not a URL, treat as raw party ID
	}
	return input.trim();
}

function joinParty() {
	const partyId = extractPartyId(joinPartyId);
	if (!partyId) return;

	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tab = tabs[0];
		if (tab?.id) {
			chrome.tabs.sendMessage(tab.id, {
				type: "jellyparty:join",
				partyId,
			});
			window.close();
		}
	});
}

function createParty() {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tab = tabs[0];
		if (tab?.id) {
			chrome.tabs.sendMessage(tab.id, {
				type: "jellyparty:create",
			});
			window.close();
		}
	});
}

function openOptions() {
	chrome.runtime.openOptionsPage();
}

function handleKeyDown(e: KeyboardEvent) {
	if (e.key === "Enter") {
		e.preventDefault();
		joinParty();
	}
}
</script>

<div class="popup-container">
  <header class="popup-header">
    <img src="/128x128.png" alt="Jelly Party" class="logo" />
    <h1>Jelly Party</h1>
  </header>

  <div class="popup-content">
    <p class="tagline">Watch videos together with friends!</p>

    <div class="user-info">
      <span class="emoji">{$optionsStore.emoji}</span>
      <span class="name">{$optionsStore.clientName}</span>
      <button class="settings-btn" onclick={openOptions} title="Settings"
        >⚙️</button
      >
    </div>

    <div class="actions">
      <button class="primary-btn" onclick={createParty}>
        🎉 Start a Party
      </button>

      <div class="divider">
        <span>or join existing</span>
      </div>

      <div class="join-form">
        <input
          type="text"
          placeholder="Paste party link or ID..."
          bind:value={joinPartyId}
          onkeydown={handleKeyDown}
        />
        <button
          class="join-btn"
          onclick={joinParty}
          disabled={!joinPartyId.trim()}
        >
          Join
        </button>
      </div>
    </div>
  </div>

  <footer class="popup-footer">
    <a href="https://jelly-party.com" target="_blank" rel="noopener"
      >Learn more</a
    >
  </footer>
</div>
