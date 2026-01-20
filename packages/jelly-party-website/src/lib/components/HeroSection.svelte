<script lang="ts">
import { browser } from "$app/environment";
import Jellyfish from "./Jellyfish.svelte";
import WaveDivider from "./WaveDivider.svelte";

let isHovered = $state(false);

function getDownloadLink(): string {
	if (browser && navigator.userAgent.includes("Firefox")) {
		return "https://addons.mozilla.org/en-US/firefox/addon/jelly-party/";
	}
	return "https://chrome.google.com/webstore/detail/jelly-party/aiecbkandfgpphpdilbaaagnampmdgpd";
}
</script>

<section class="relative min-h-screen flex items-center pt-24 pb-32 overflow-hidden gradient-hero">
	<div class="container mx-auto px-4 relative z-10">
		<div class="grid lg:grid-cols-2 gap-12 items-center">
			<!-- Text content -->
			<div class="text-center lg:text-left order-2 lg:order-1">
				<h1 class="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
					Watch anything. <br/>
					<span class="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80">Together.</span>
				</h1>
				<p class="text-xl md:text-2xl text-white/90 mb-10 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
					Sync videos across browsers. No sign-ups. <br class="hidden md:block"/>
					Just share a link and enjoy your favorite content with friends.
				</p>
				<div class="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start items-center">
					<a 
						href={getDownloadLink()} 
						class="cta-button text-lg px-8 py-4 shadow-xl shadow-purple-900/20"
						onmouseenter={() => isHovered = true}
						onmouseleave={() => isHovered = false}
					>
						Get the extension now!
					</a>
					<p class="text-white/60 text-sm font-medium">
						Free & open source forever.
					</p>
				</div>
			</div>

			<!-- Jellyfish -->
			<div class="flex justify-center order-1 lg:order-2">
				<div 
					class="w-72 h-72 md:w-96 md:h-96 drop-shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-all duration-300"
					class:animate-float={!isHovered}
					class:animate-excited={isHovered}
				>
					<Jellyfish />
				</div>
			</div>
		</div>
	</div>

	<!-- Wave divider at bottom - blending into dark bg -->
	<WaveDivider position="bottom" fillColor="#0a0a0a" />
</section>
