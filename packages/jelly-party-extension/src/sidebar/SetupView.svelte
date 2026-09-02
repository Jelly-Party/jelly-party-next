<script lang="ts">
  import type { PeerIdentity } from "jelly-party-lib";

  export let identity: PeerIdentity;
  export let tabTitle = "";
  export let hasVideo = false;
  export let cannotAccessTab = false;
  export let canCreate = true;
  export let notice = "";
  export let onCreate: () => void = () => {};

  const emojiOptions = [
    { id: "jellyfish", value: "🪼" },
    { id: "popcorn", value: "🍿" },
    { id: "party", value: "🥳" },
    { id: "cinema", value: "🎬" },
    { id: "sparkles", value: "✨" },
    { id: "unicorn", value: "🦄" },
    { id: "whale", value: "🐳" },
    { id: "fox", value: "🦊" },
    { id: "panda", value: "🐼" },
    { id: "celebrate", value: "🎉" },
  ];
</script>

<section class="jp-panel flex flex-col gap-3 p-4" data-testid="setup-view">
  <div>
    <h2 class="section-title">Start watching together</h2>
    <p class="m-0 mt-1 text-sm leading-5 text-slate-400">Choose how friends will see you in the party.</p>
  </div>
  <label>Display name <input class="jp-field mt-1" bind:value={identity.name} maxlength="40" data-testid="name-input" /></label>
  <fieldset class="emoji-picker">
    <legend>Choose your emoji</legend>
    <div class="emoji-grid">
      {#each emojiOptions as option}
        <button
          type="button"
          class:selected={identity.emoji === option.value}
          aria-label={`Use ${option.value}`}
          aria-pressed={identity.emoji === option.value}
          on:click={() => (identity.emoji = option.value)}
          data-testid={`emoji-option-${option.id}`}
        >{option.value}</button>
      {/each}
    </div>
  </fieldset>
  <div class:ok={hasVideo} class="video-state" data-testid="video-state">
    {hasVideo
      ? "Video ready"
      : cannotAccessTab
        ? "Click the Jelly Party toolbar button to activate this tab"
        : "No video found in this tab"}
  </div>
  <p class="m-0 truncate text-sm text-slate-400" title={tabTitle}>{tabTitle || "No supported tab"}</p>
  <button
    class="jp-button-primary"
    on:click={onCreate}
    disabled={!canCreate || !hasVideo || !identity.name.trim()}
    data-testid="create-party"
  >
    Start party
  </button>
  {#if notice}<p class="jp-notice m-0" role="alert">{notice}</p>{/if}
</section>
