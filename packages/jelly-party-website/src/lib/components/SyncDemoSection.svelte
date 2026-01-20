<script lang="ts">
import { browser } from "$app/environment";
import WaveDivider from "./WaveDivider.svelte";

let video1: HTMLVideoElement;
let video2: HTMLVideoElement;

$effect(() => {
	if (browser && video1 && video2) {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						// Ensure video metadata is loaded
						const tryPlay = async (v: HTMLVideoElement) => {
							try {
								await v.play();
							} catch (e) {
								console.error("Autoplay failed", e);
							}
						};

						tryPlay(video1);
						// Slight delay on second video to show sync effect
						setTimeout(() => tryPlay(video2), 200);
						observer.disconnect();
					}
				});
			},
			{ threshold: 0.3 },
		);

		observer.observe(video1);

		return () => observer.disconnect();
	}
});
</script>

<section class="relative bg-[#0a0a0a] pb-32 overflow-hidden">
	<!-- Gradient accent background -->
	<div class="absolute inset-0 bg-gradient-to-br from-jelly-purple/20 via-transparent to-jelly-pink/10 opacity-30 pointer-events-none"></div>

	<div class="container mx-auto px-4 relative z-10 pt-10">
		<div class="grid lg:grid-cols-2 gap-16 items-center">
			<!-- Text -->
			<div class="text-center lg:text-left">
				<h2 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 tracking-tight leading-tight">
					Sync your <br/>
					<span class="text-transparent bg-clip-text bg-gradient-to-r from-jelly-purple to-jelly-pink">watch parties!</span>
				</h2>
				<p class="text-xl text-white/80 mb-6 leading-relaxed">
					Host next level watch parties with your friends. <br/>
					Video playback is synchronized automatically.
				</p>
				<p class="text-white/60 font-mono text-sm bg-white/5 inline-block px-4 py-2 rounded-lg border border-white/10">
					> No registration required
				</p>
			</div>

			<!-- Videos showing sync -->
			<div class="relative h-[400px] md:h-[500px] flex items-center justify-center">
				<!-- Glow effect -->
				<div class="absolute inset-0 bg-jelly-purple/30 blur-[100px] rounded-full opacity-50"></div>
				
				<div class="relative w-full max-w-lg">
					<video
						bind:this={video1}
						class="relative z-10 rounded-xl shadow-2xl w-[85%] border border-white/10 bg-black"
						muted
						loop
						playsinline
					>
						<source src="/sync-demo.mp4" type="video/mp4" />
					</video>
					
					<video
						bind:this={video2}
						class="absolute top-12 left-[15%] z-20 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-[85%] border-4 border-[#0a0a0a] bg-black"
						muted
						loop
						playsinline
					>
						<source src="/sync-demo.mp4" type="video/mp4" />
					</video>
					
					<!-- UI Badge -->
					<div class="absolute -right-4 top-1/2 z-30 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-lg shadow-xl animate-bounce duration-[3000ms]">
						<span class="text-sm font-bold text-white flex items-center gap-2">
							<span class="w-2 h-2 rounded-full bg-green-400"></span>
							Synced
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
