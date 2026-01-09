<script lang="ts">
import { optionsStore } from "../stores/options";

let showEmojiPicker = $state(false);
let clientName = $state($optionsStore.clientName);
let selectedEmoji = $state($optionsStore.emoji);
let showSaved = $state(false);

// Common emojis for party avatars
const emojis = [
	"🎉",
	"🎈",
	"🎊",
	"🥳",
	"🦊",
	"🐱",
	"🐶",
	"🐼",
	"🦁",
	"🐯",
	"🐸",
	"🐵",
	"🦄",
	"🐲",
	"🦋",
	"🐢",
	"🌟",
	"⭐",
	"🌈",
	"🔥",
	"💜",
	"💙",
	"💚",
	"❤️",
	"🍕",
	"🍿",
	"🎬",
	"🎮",
	"🎧",
	"🎸",
	"👻",
	"🤖",
	"👽",
	"🧙",
	"🧛",
	"🦸",
];

function selectEmoji(emoji: string) {
	selectedEmoji = emoji;
	showEmojiPicker = false;
}

async function saveChanges() {
	if (clientName.length < 2) {
		alert("Please choose a name that's longer than 2 characters");
		return;
	}

	await optionsStore.save({
		...$optionsStore,
		clientName,
		emoji: selectedEmoji,
	});

	showSaved = true;
	setTimeout(() => {
		showSaved = false;
	}, 2000);
}
</script>

<div class="customize-tab">
	<!-- Avatar Section -->
	<section class="section">
		<h3 class="section-title">Your Avatar</h3>

		<div class="avatar-section">
			<button
				class="emoji-display"
				onclick={() => (showEmojiPicker = !showEmojiPicker)}
				title="Click to change emoji"
			>
				{selectedEmoji}
			</button>

			{#if showEmojiPicker}
				<div class="emoji-picker">
					{#each emojis as emoji}
						<button
							class="emoji-option"
							class:selected={selectedEmoji === emoji}
							onclick={() => selectEmoji(emoji)}
						>
							{emoji}
						</button>
					{/each}
				</div>
			{/if}

			<div class="name-input-wrapper">
				<input
					type="text"
					class="input-field"
					placeholder="Your name"
					bind:value={clientName}
				/>
				<span class="input-label">Your display name</span>
			</div>
		</div>
	</section>

	<!-- Save Button -->
	<section class="section">
		{#if showSaved}
			<div class="saved-message">Your changes have been saved.</div>
		{/if}
		<button class="btn-primary" onclick={saveChanges}>Save changes</button>
	</section>
</div>

<style>
	.customize-tab {
		padding: 0 16px;
	}

	.section {
		margin-bottom: 20px;
	}

	.section-title {
		font-size: 16px;
		font-weight: 600;
		text-align: center;
		margin-bottom: 16px;
		color: #fff;
	}

	.avatar-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.emoji-display {
		width: 80px;
		height: 80px;
		font-size: 48px;
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.emoji-display:hover {
		border-color: var(--jelly-purple);
		transform: scale(1.05);
	}

	.emoji-picker {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 8px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		max-width: 280px;
	}

	.emoji-option {
		width: 36px;
		height: 36px;
		font-size: 20px;
		background: none;
		border: 2px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.emoji-option:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.emoji-option.selected {
		border-color: var(--jelly-purple);
		background: rgba(145, 100, 255, 0.2);
	}

	.name-input-wrapper {
		width: 100%;
	}

	.input-field {
		width: 100%;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		padding: 12px 16px;
		color: #fff;
		font-size: 14px;
		font-family: inherit;
		outline: none;
		text-align: center;
	}

	.input-field:focus {
		border-color: var(--jelly-purple);
	}

	.input-field::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}

	.input-label {
		display: block;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-top: 6px;
		text-align: center;
	}

	.saved-message {
		background: rgba(76, 175, 80, 0.2);
		border: 1px solid rgba(76, 175, 80, 0.4);
		border-radius: 8px;
		padding: 10px 16px;
		margin-bottom: 12px;
		font-size: 14px;
		color: #81c784;
		text-align: center;
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

	.btn-primary:hover {
		background-color: #7a4de6;
	}
</style>
