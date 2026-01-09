<script lang="ts">
let partyId = $state("");

function extractPartyId(input: string): string {
	try {
		const url = new URL(input);
		const id = url.searchParams.get("jellyPartyId");
		if (id) return id;
	} catch {
		// Not a URL, treat as raw party ID
	}
	return input.trim();
}

function startParty() {
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

function joinParty() {
	const id = extractPartyId(partyId);
	if (!id) return;

	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tab = tabs[0];
		if (tab?.id) {
			chrome.tabs.sendMessage(tab.id, {
				type: "jellyparty:join",
				partyId: id,
			});
			window.close();
		}
	});
}

function handleKeyDown(e: KeyboardEvent) {
	if (e.key === "Enter") {
		e.preventDefault();
		joinParty();
	}
}
</script>

<div class="party-tab">
	<!-- Getting Started -->
	<section class="section">
		<h3 class="section-title">Getting started</h3>
		<p class="section-text">
			To begin with, please make sure that all your friends have
			<a href="https://www.jelly-party.com/" target="_blank" rel="noopener"
				>Jelly-Party</a
			>
			installed. Then follow these simple steps:
		</p>
		<ol class="steps-list">
			<li>Customize your avatar and name yourself.</li>
			<li>Press <strong>"Start a new party"</strong> below.</li>
			<li>Share your magic link.</li>
		</ol>
		<p class="section-text">
			For more help and to learn about joining manually, please visit the help
			tab above.
		</p>
	</section>

	<hr class="divider" />

	<!-- Start a new party -->
	<section class="section">
		<h3 class="section-title">
			Start a new party
			<span
				class="tooltip-icon"
				title="Perfect if you just want to get started with a new party ASAP."
				>❓</span
			>
		</h3>
		<button class="btn-primary" onclick={startParty}>Start a new party</button>
	</section>

	<hr class="divider" />

	<!-- Join Party by Id -->
	<section class="section">
		<h3 class="section-title">
			Join Party by Id
			<span
				class="tooltip-icon"
				title="Necessary for some websites or if you want to sync up different video providers. Requires that you navigate to the video yourself."
				>❓</span
			>
		</h3>
		<input
			type="text"
			class="input-field"
			placeholder="Enter Party Id or make something up.."
			bind:value={partyId}
			onkeydown={handleKeyDown}
		/>
		<button class="btn-primary" onclick={joinParty} disabled={!partyId.trim()}>
			Join Party by Id
		</button>
	</section>
</div>

<style>
	.party-tab {
		padding: 0 16px;
	}

	.section {
		margin-bottom: 8px;
	}

	.section-title {
		font-size: 16px;
		font-weight: 600;
		text-align: center;
		margin-bottom: 12px;
		color: #fff;
	}

	.section-text {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.9);
		line-height: 1.5;
		text-align: left;
		margin-bottom: 12px;
	}

	.section-text a {
		color: var(--jelly-purple);
		text-decoration: none;
	}

	.section-text a:hover {
		text-decoration: underline;
	}

	.steps-list {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 12px 0;
		padding-left: 24px;
	}

	.steps-list li {
		margin-bottom: 4px;
	}

	.tooltip-icon {
		font-size: 12px;
		cursor: help;
		opacity: 0.7;
	}

	.divider {
		border: none;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
		margin: 16px 0;
	}

	.input-field {
		width: 100%;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50rem;
		padding: 10px 16px;
		color: #fff;
		font-size: 14px;
		font-family: inherit;
		outline: none;
		margin-bottom: 12px;
	}

	.input-field:focus {
		border-color: var(--jelly-purple);
	}

	.input-field::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.btn-primary {
		width: 100%;
		height: 40px;
		background-color: var(--jelly-purple);
		color: #fff;
		border: none;
		border-radius: 50rem;
		font-size: 14px;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: #7a4de6;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
