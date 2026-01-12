<script lang="ts">
import { config, createLogger } from "jelly-party-lib";
import ConfirmModal from "../components/ConfirmModal.svelte";
import CustomizeTab from "../components/CustomizeTab.svelte";
import HelpTab from "../components/HelpTab.svelte";
import PartyTab from "../components/PartyTab.svelte";
import { partyClient } from "../lib/PartyClient";
import { optionsStore } from "../stores/options";
import { type ChatMessage, isInParty, partyStore } from "../stores/party";

const log = createLogger("Chat");

// Parse hash params (passed by content script)
function getHashParams(): URLSearchParams {
	const hash = window.location.hash.slice(1); // remove #
	return new URLSearchParams(hash);
}
const hashParams = getHashParams();
const parentUrlParam = hashParams.get("parentUrl");
const parentPageUrl = parentUrlParam
	? decodeURIComponent(parentUrlParam)
	: window.location.href;
const autoJoinPartyId = hashParams.get("autoJoinPartyId");

log.debug("Chat initialized", { parentPageUrl, autoJoinPartyId });

type Tab = "party" | "help" | "customize";
let activeTab = $state<Tab>("party");
let isMinimized = $state(false);
let messageInput = $state("");
let messagesContainer = $state<HTMLElement | null>(null);
let copied = $state(false);
let joinPartyId = $state("");
let isJoining = $state(!!autoJoinPartyId); // Show loading if auto-joining
let isScrolledToBottom = $state(true); // Track if user is at bottom of messages
let hasUnreadMessages = $state(false); // For FAB badge when minimized
let previousMessageCount = $state(0); // Track message count for new message detection
let showLeaveConfirm = $state(false); // Leave party confirmation modal

$effect(() => {
	optionsStore.load();
});

// Auto-join party if partyId was passed via hash
$effect(() => {
	if (autoJoinPartyId && $optionsStore.guid && isJoining) {
		log.info("Auto-joining party", { partyId: autoJoinPartyId });
		joinParty(autoJoinPartyId).finally(() => {
			isJoining = false;
		});
	}
});

// Auto-scroll only when stuck to bottom
$effect(() => {
	const messageCount = $partyStore.messages.length;
	if (messageCount > previousMessageCount && messagesContainer) {
		// New message arrived
		if (isMinimized) {
			// Show badge on FAB
			hasUnreadMessages = true;
		} else if (isScrolledToBottom) {
			// Auto-scroll to bottom
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		} else {
			// User is scrolled up, show indicator
			hasUnreadMessages = true;
		}
	}
	previousMessageCount = messageCount;
});

function handleMessagesScroll() {
	if (!messagesContainer) return;
	const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
	// Consider "at bottom" if within 50px of the bottom
	isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 50;
	if (isScrolledToBottom) {
		hasUnreadMessages = false;
	}
}

function scrollToBottom() {
	if (messagesContainer) {
		messagesContainer.scrollTop = messagesContainer.scrollHeight;
		isScrolledToBottom = true;
		hasUnreadMessages = false;
	}
}

function toggleMinimize() {
	isMinimized = !isMinimized;
	log.debug("Toggle minimize", { isMinimized });
	window.parent.postMessage(
		{ type: isMinimized ? "jellyparty:minimize" : "jellyparty:maximize" },
		"*",
	);
}

async function createParty() {
	const partyId = crypto.randomUUID().slice(0, 8);
	await joinParty(partyId);
}

async function joinParty(partyId: string) {
	await partyClient.connect(partyId, {
		clientName: $optionsStore.clientName,
		emoji: $optionsStore.emoji,
	});
}

function handleJoinById() {
	const id = extractPartyId(joinPartyId);
	if (id) {
		joinParty(id);
	}
}

function extractPartyId(input: string): string {
	try {
		const url = new URL(input);
		const id = url.searchParams.get("jellyPartyId");
		if (id) return id;
	} catch {
		// Not a URL
	}
	return input.trim();
}

function requestLeaveParty() {
	showLeaveConfirm = true;
}

function confirmLeaveParty() {
	log.info("Leaving party");
	partyClient.disconnect();
	showLeaveConfirm = false;
}

function cancelLeaveParty() {
	showLeaveConfirm = false;
}

function closeOverlay() {
	log.debug("Closing overlay");
	window.parent.postMessage({ type: "jellyparty:close" }, "*");
}

function getMagicLink(): string {
	const partyId = $partyStore.partyId;
	const redirectURL = encodeURIComponent(parentPageUrl);
	return `${config.joinUrl}/?jellyPartyId=${partyId}&redirectURL=${redirectURL}`;
}

async function copyLink() {
	const magicLink = getMagicLink();

	// Try modern clipboard API first
	try {
		await navigator.clipboard.writeText(magicLink);
		copied = true;
		log.info("Magic link copied to clipboard (Clipboard API)");
		setTimeout(() => {
			copied = false;
		}, 2000);
		return;
	} catch (e) {
		log.debug("Clipboard API failed, trying fallback", { error: String(e) });
	}

	// Fallback: Create temporary textarea and use execCommand
	try {
		const textarea = document.createElement("textarea");
		textarea.value = magicLink;
		textarea.style.position = "fixed";
		textarea.style.left = "-9999px";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();
		textarea.setSelectionRange(0, 99999);
		const success = document.execCommand("copy");
		document.body.removeChild(textarea);

		if (success) {
			copied = true;
			log.info("Magic link copied to clipboard (execCommand fallback)");
			setTimeout(() => {
				copied = false;
			}, 2000);
		} else {
			throw new Error("execCommand returned false");
		}
	} catch (e) {
		log.error("Failed to copy magic link", { error: String(e) });
		// Last resort: select the input text for manual copy
		const input = document.querySelector(
			".party-info-link input",
		) as HTMLInputElement;
		if (input) {
			input.focus();
			input.select();
			input.setSelectionRange(0, 99999);
		}
	}
}

function sendMessage() {
	if (!messageInput.trim()) return;
	log.debug("Sending chat message", { length: messageInput.trim().length });
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

function handleJoinKeyDown(e: KeyboardEvent) {
	if (e.key === "Enter") {
		e.preventDefault();
		handleJoinById();
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
		<img src="/logo-blue.png" alt="Jelly Party" class="fab-logo" />
		{#if hasUnreadMessages}
			<span class="fab-badge"></span>
		{/if}
	</button>
{:else}
	<div class="overlay-container">
		<!-- Header -->
		<header class="overlay-header">
			<h1>
				Jelly-Party
				<img src="/128x128.png" alt="logo" class="logo" />
				{#if $isInParty}
					<span class="peer-count">• {$partyStore.peers.length} online</span>
				{/if}
			</h1>
			<div class="header-actions">
				{#if $isInParty}
					<button class="icon-btn" onclick={requestLeaveParty} title="Leave party">✕</button>
				{:else}
					<button class="icon-btn" onclick={closeOverlay} title="Close">✕</button>
				{/if}
				<button class="icon-btn" onclick={toggleMinimize} title="Minimize">−</button>
			</div>
		</header>

		{#if isJoining}
			<!-- Loading state while joining party -->
			<div class="not-connected">
				<div class="emoji">🎉</div>
				<h2>Joining party...</h2>
				<p>Connecting to your friends</p>
			</div>
		{:else if $isInParty}
			<!-- Party Mode: Show chat UI -->
			<div class="party-info">
				<div class="party-info-label">Magic Link</div>
				<div class="party-info-link">
					<input type="text" readonly value={getMagicLink()} />
					<button class="copy-btn" onclick={copyLink}>
						{copied ? "Copied!" : "Copy"}
					</button>
				</div>
			</div>

			<div class="peer-list">
				{#each $partyStore.peers as peer (peer.uuid)}
					<div class="peer" class:self={peer.uuid === $partyStore.localUser?.uuid}>
						<span class="emoji">
							{peer.uuid === $partyStore.localUser?.uuid
								? $optionsStore.emoji
								: (peer.clientState?.emoji ?? "👤")}
						</span>
						<span>
							{peer.uuid === $partyStore.localUser?.uuid
								? $optionsStore.clientName
								: (peer.clientState?.clientName ?? "Unknown")}
						</span>
					</div>
				{/each}
			</div>

			<div class="messages-wrapper">
				<div class="messages" bind:this={messagesContainer} onscroll={handleMessagesScroll}>
					{#each $partyStore.messages as msg (msg.id)}
						{#if msg.type === "event"}
							<div class="system-message">
								{msg.text}
							</div>
						{:else}
							<div class="message">
								<span class="emoji">{msg.peerEmoji}</span>
								<div class="message-bubble">
									<div class="message-header">
										<span class="message-name">{msg.peerName}</span>
										<span class="message-time">{formatTime(msg.timestamp)}</span>
									</div>
									<p class="message-text">{msg.text}</p>
								</div>
							</div>
						{/if}
					{/each}
				</div>
				{#if hasUnreadMessages && !isScrolledToBottom}
					<button class="new-messages-btn" onclick={scrollToBottom}>
						New messages ↓
					</button>
				{/if}
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
			<!-- Not in Party: Show tabbed interface -->
			<nav class="tab-nav">
				<button
					class="tab-btn"
					class:active={activeTab === "party"}
					onclick={() => (activeTab = "party")}
				>
					Party
				</button>
				<button
					class="tab-btn"
					class:active={activeTab === "customize"}
					onclick={() => (activeTab = "customize")}
				>
					Customize
				</button>
				<button
					class="tab-btn"
					class:active={activeTab === "help"}
					onclick={() => (activeTab = "help")}
				>
					Help
				</button>
			</nav>

			<div class="tab-content">
				{#if activeTab === "party"}
					<!-- Inline Party Tab for overlay (uses direct PartyClient) -->
					<div class="party-tab">
						<section class="section">
							<h3 class="section-title">Start a new party</h3>
							<button class="btn-primary" onclick={createParty}>Start a new party</button>
						</section>

						<hr class="divider" />

						<section class="section">
							<h3 class="section-title">Join Party by Id</h3>
							<input
								type="text"
								class="input-field"
								placeholder="Enter Party Id or paste link..."
								bind:value={joinPartyId}
								onkeydown={handleJoinKeyDown}
							/>
							<button
								class="btn-primary"
								onclick={handleJoinById}
								disabled={!joinPartyId.trim()}
							>
								Join Party by Id
							</button>
						</section>
					</div>
				{:else if activeTab === "customize"}
					<CustomizeTab />
				{:else if activeTab === "help"}
					<HelpTab />
				{/if}
			</div>
		{/if}
	</div>
{/if}

{#if showLeaveConfirm}
	<ConfirmModal
		title="Leave Party?"
		message="Are you sure you want to leave the party? You can rejoin anytime using the magic link."
		confirmText="Leave"
		cancelText="Stay"
		onConfirm={confirmLeaveParty}
		onCancel={cancelLeaveParty}
		confirmDanger
	/>
{/if}
