<script lang="ts">
import { onMount } from "svelte";

onMount(async () => {
	// Always request overlay to show - content script handles duplicates
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (tab?.id) {
		try {
			await chrome.tabs.sendMessage(tab.id, {
				type: "jellyparty:showOverlay",
			});
		} catch (e) {
			console.error("Jelly Party: Failed to show overlay:", e);
		}
	}
});
</script>

<div class="mini-popup">
	<div class="logo-container">
		<img src="/logo-blue.png" alt="Jelly Party" class="logo" />
	</div>
	<h1 class="title">Jelly-Party <span class="emoji">🎉</span></h1>
	
	<p class="status-text">
		Overlay injected!
	</p>
	<p class="instruction-text">
		Check the bottom-right corner of the page.
	</p>
	
	<div class="divider"></div>
	
	<p class="footer-text">
		<a href="https://www.jelly-party.com" target="_blank" rel="noopener">Visit Website</a>
	</p>
</div>

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(html, body) {
		width: 250px;
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	}

	.mini-popup {
		background: linear-gradient(135deg, #ff9494 0%, #ee64f6 100%);
		padding: 24px 16px;
		text-align: center;
		color: #fff;
	}

	.logo-container {
		background: rgba(255, 255, 255, 0.2);
		width: 48px;
		height: 48px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 12px;
	}

	.logo {
		width: 32px;
		height: 32px;
	}

	.title {
		font-size: 20px;
		font-weight: 700;
		margin: 0 0 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	
	.emoji {
		font-size: 20px;
	}

	.status-text {
		font-size: 14px;
		font-weight: 600;
		margin: 8px 0 4px;
		color: #fff;
	}

	.instruction-text {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.8);
		margin: 0;
	}

	.divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.2);
		margin: 16px 40px;
	}

	.footer-text {
		font-size: 11px;
		margin: 0;
	}

	a {
		color: rgba(255, 255, 255, 0.9);
		text-decoration: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.4);
		padding-bottom: 1px;
		transition: all 0.2s;
	}

	a:hover {
		color: #fff;
		border-bottom-color: #fff;
	}
</style>
