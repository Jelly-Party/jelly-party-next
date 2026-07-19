<script lang="ts">
import { getDownloadLink } from "$lib/download-link";
</script>

<section class="min-h-[calc(100svh-5rem)] flex items-center bg-gradient-to-br from-jelly-coral to-jelly-pink pb-12 pt-26 text-center">
	<div class="jp-container flex flex-col items-center">
		<img class="jp-logo h-28 w-28 sm:h-32 sm:w-32" src="/favicon.ico" alt="" width="128" height="128" />
		<h1 class="mb-0 mt-5 text-5xl leading-none font-850 tracking-normal text-white sm:text-7xl">Jelly Party</h1>
		<p class="mb-0 mt-5 max-w-2xl text-xl leading-8 font-650 text-white sm:text-2xl">
			Watch videos with friends, in sync.
		</p>
		<p class="mb-0 mt-3 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
			Open Jelly Party beside any accessible HTML video, start a temporary party, and share one link. No account or room setup.
		</p>
		<div class="mt-8 flex w-full max-w-md flex-col justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row">
			<a href={getDownloadLink()} class="jp-button-primary bg-jelly-ink px-7 hover:bg-[#171b32]">Get the extension</a>
			<a href="#how-it-works" class="jp-button-secondary border-white/45 px-7 hover:bg-white/15">See how it works</a>
		</div>
		<p class="mb-0 mt-5 text-sm font-650 text-white/75">Chrome, Firefox, and Edge · Free and open source</p>
	</div>
</section>
