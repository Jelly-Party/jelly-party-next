<script lang="ts">
import { onMount } from "svelte";

let firstVideo = $state<HTMLVideoElement>();
let secondVideo = $state<HTMLVideoElement>();
let playing = $state(false);
let status = $state("Ready to play together");
let prefersReducedMotion = false;
let didTryAutoplay = false;
type SyncAction = "play" | "pause" | "seek";
const suppressedActions = new WeakMap<HTMLVideoElement, Set<SyncAction>>();

function suppressNext(video: HTMLVideoElement, action: SyncAction) {
	const actions = suppressedActions.get(video) ?? new Set<SyncAction>();
	actions.add(action);
	suppressedActions.set(video, actions);
}

function consumeSuppressed(video: HTMLVideoElement, action: SyncAction) {
	const actions = suppressedActions.get(video);
	if (!actions?.has(action)) return false;
	actions.delete(action);
	return true;
}

function mirror(source: HTMLVideoElement, target: HTMLVideoElement, action: SyncAction) {
	if (consumeSuppressed(source, action)) return;

	if (action === "seek" && Number.isFinite(source.currentTime) && Math.abs(target.currentTime - source.currentTime) > 0.05) {
		suppressNext(target, "seek");
		target.currentTime = source.currentTime;
	}
	if (action === "play" && target.paused) {
		suppressNext(target, "play");
		void target.play();
	}
	if (action === "pause" && !target.paused) {
		suppressNext(target, "pause");
		target.pause();
	}

	playing = !source.paused;
	status = action === "seek" ? "Seeked together" : action === "play" ? "Playing together" : "Paused together";
}

function mirrorWhenReady(source: HTMLVideoElement | undefined, target: HTMLVideoElement | undefined, action: SyncAction) {
	if (source && target) mirror(source, target, action);
}

function togglePlayback() {
	const videos = [firstVideo, secondVideo].filter((video): video is HTMLVideoElement => Boolean(video));
	if (videos.length !== 2) return;

	if (playing) {
		for (const video of videos) video.pause();
		playing = false;
		status = "Paused together";
	} else {
		void Promise.all(videos.map((video) => video.play())).then(
			() => {
				playing = true;
				status = "Playing together";
			},
			() => {
				playing = false;
				status = "Play the demo";
			},
		);
	}
}

function startDemo() {
	if (didTryAutoplay || prefersReducedMotion || !firstVideo || !secondVideo || firstVideo.readyState < 2 || secondVideo.readyState < 2) return;
	didTryAutoplay = true;
	void Promise.all([firstVideo.play(), secondVideo.play()]).then(
		() => {
			playing = true;
			status = "Playing together";
		},
		() => {
			playing = false;
			status = "Play the demo";
		},
	);
}

onMount(() => {
	prefersReducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
	if (prefersReducedMotion) {
		firstVideo?.pause();
		secondVideo?.pause();
		playing = false;
		status = "Ready to play together";
	} else {
		startDemo();
	}
});
</script>

<section id="live-demo" class="border-y border-white/8 bg-[#0d1020] py-18 sm:py-24">
	<div class="jp-container">
		<div class="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
			<div class="max-w-3xl">
				<p class="jp-kicker m-0">See the sync</p>
				<h2 class="mb-0 mt-3 text-3xl leading-tight font-800 tracking-[-0.02em] text-white sm:text-5xl">Many screens. One moment.</h2>
				<p class="mb-0 mt-5 max-w-2xl text-lg leading-8 text-slate-300">Both videos below are real. Pause one, jump ahead in the other, or use the shared button, and watch them stay together.</p>
			</div>
			<button type="button" class="jp-button-secondary gap-3 px-5" onclick={togglePlayback} aria-label={playing ? "Pause both demo videos" : "Play both demo videos"}>
				<span class="grid h-7 w-7 place-items-center rounded-full bg-white text-sm text-jelly-ink" aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
				{status}
			</button>
		</div>

		<div class="relative mt-10 grid items-center gap-5 lg:grid-cols-[1fr_0.72fr] lg:gap-7">
			<article class="overflow-hidden rounded-2xl border border-white/12 bg-jelly-panel shadow-2xl shadow-black/30">
				<div class="flex items-center justify-between border-b border-white/8 px-4 py-3 text-sm">
					<div class="flex items-center gap-2 font-700 text-white"><span class="grid h-7 w-7 place-items-center rounded-full bg-jelly-purple/25">✦</span> Mira <span class="text-xs font-500 text-slate-500">you</span></div>
					<span class="flex items-center gap-2 text-xs font-700 text-jelly-mint"><span class="h-2 w-2 rounded-full bg-jelly-mint"></span> In the party</span>
				</div>
				<video
					bind:this={firstVideo}
					class="block aspect-video w-full bg-black object-cover"
					src="/sync-demo.webm"
					muted
					loop
					autoplay
					playsinline
					controls
					preload="auto"
					oncanplay={startDemo}
					onplay={() => mirrorWhenReady(firstVideo, secondVideo, "play")}
					onpause={() => mirrorWhenReady(firstVideo, secondVideo, "pause")}
					onseeked={() => mirrorWhenReady(firstVideo, secondVideo, "seek")}
					aria-label="Mira's synchronized demo video"
				></video>
			</article>

			<div class="absolute left-[56.8%] z-10 hidden h-13 w-13 place-items-center rounded-full border-4 border-[#0d1020] bg-jelly-purple text-xl shadow-xl lg:grid" aria-hidden="true">↔</div>

			<article class="overflow-hidden rounded-2xl border border-white/12 bg-jelly-panel shadow-2xl shadow-black/30 lg:-rotate-1">
				<div class="flex items-center justify-between border-b border-white/8 px-4 py-3 text-sm">
					<div class="flex items-center gap-2 font-700 text-white"><span class="grid h-7 w-7 place-items-center rounded-full bg-jelly-coral/25">●</span> Cal</div>
					<span class="flex items-center gap-2 text-xs font-700 text-jelly-mint"><span class="h-2 w-2 rounded-full bg-jelly-mint"></span> Connected</span>
				</div>
				<video
					bind:this={secondVideo}
					class="block aspect-video w-full bg-black object-cover"
					src="/sync-demo.webm"
					muted
					loop
					autoplay
					playsinline
					controls
					preload="auto"
					oncanplay={startDemo}
					onplay={() => mirrorWhenReady(secondVideo, firstVideo, "play")}
					onpause={() => mirrorWhenReady(secondVideo, firstVideo, "pause")}
					onseeked={() => mirrorWhenReady(secondVideo, firstVideo, "seek")}
					aria-label="Cal's synchronized demo video"
				></video>
			</article>
		</div>

		<div class="mt-8 flex flex-col justify-between gap-4 border-t border-white/8 pt-6 text-sm leading-6 text-slate-400 sm:flex-row">
			<p class="m-0 max-w-2xl">The extension does the same for the video on the page you are watching: when one person plays, pauses, or jumps to another moment, everyone else follows.</p>
			<a class="jp-link shrink-0" href="/supported-services">See where it works</a>
		</div>
	</div>
</section>
