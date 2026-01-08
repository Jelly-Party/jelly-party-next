<script lang="ts">
  import { getRandomEmoji } from "jelly-party-lib";

  let emoji = $state(getRandomEmoji());

  function refreshEmoji() {
    emoji = getRandomEmoji();
  }
</script>

<main class="w-80 p-4 bg-gradient-to-br from-purple-600 to-pink-500 text-white">
  <header class="flex items-center gap-3 mb-4">
    <button
      onclick={refreshEmoji}
      class="text-4xl hover:scale-110 transition-transform cursor-pointer"
      title="Click to change emoji"
    >
      {emoji}
    </button>
    <div>
      <h1 class="text-xl font-bold">Jelly Party</h1>
      <p class="text-sm opacity-80">Watch together!</p>
    </div>
  </header>

  <div class="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
    <p class="text-center text-sm">
      Extension is ready! Click the extension icon on any video page to start a party.
    </p>
  </div>
</main>
