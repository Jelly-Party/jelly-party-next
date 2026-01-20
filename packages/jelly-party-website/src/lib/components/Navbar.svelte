<script lang="ts">
import { browser } from "$app/environment";

function getDownloadLink(): string {
	if (browser && navigator.userAgent.includes("Firefox")) {
		return "https://addons.mozilla.org/en-US/firefox/addon/jelly-party/";
	}
	return "https://chrome.google.com/webstore/detail/jelly-party/aiecbkandfgpphpdilbaaagnampmdgpd";
}

let scrolled = $state(false);

$effect(() => {
	if (browser) {
		const handleScroll = () => {
			scrolled = window.scrollY > 10;
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}
});
</script>

<nav
	class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent"
	class:scrolled
>
	<div class="container mx-auto px-4 h-20 flex items-center justify-between">
		<a href="/" class="flex items-center gap-3 group">
			<!-- Logo placeholder or icon could go here -->
			<span class="text-xl font-bold text-white group-hover:text-jelly-pink transition-colors tracking-tight">
				Jelly Party
			</span>
		</a>
		
		<a href={getDownloadLink()} class="cta-button text-sm px-5 py-2.5">
			Get the extension
		</a>
	</div>
</nav>

<style>
	nav.scrolled {
		background-color: rgba(10, 10, 10, 0.8);
		backdrop-filter: blur(12px);
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}
</style>
