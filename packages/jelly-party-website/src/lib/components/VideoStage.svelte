<script lang="ts">
interface Props {
	/** Video file served by this site, so the shots never depend on a streaming service. */
	src: string;
	/** The frame the stage is parked on. Two stages on the same time show the same picture. */
	posterTime: number;
	elapsed: string;
	duration: string;
	progress: number;
	/** Smaller padding and type for the secondary screen in the "everyone in sync" shot. */
	compact?: boolean;
}

let { src, posterTime, elapsed, duration, progress, compact = false }: Props = $props();

let video = $state<HTMLVideoElement>();
let ready = $state(false);

/** Parks the video on one fixed frame and reports when it is painted, so captures are repeatable. */
async function showPosterFrame(): Promise<void> {
	const element = video;
	if (!element) return;
	if (Math.abs(element.currentTime - posterTime) > 0.01) {
		element.currentTime = posterTime;
		await new Promise((resolve) => element.addEventListener("seeked", resolve, { once: true }));
	}
	ready = true;
}

// The server-rendered markup starts loading the video before this component is hydrated, so the
// frame is set from whatever state the element is already in rather than from the load event alone.
$effect(() => {
	const element = video;
	if (!element) return;
	if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
		void showPosterFrame();
		return;
	}
	const onLoaded = () => void showPosterFrame();
	element.addEventListener("loadeddata", onLoaded, { once: true });
	return () => element.removeEventListener("loadeddata", onLoaded);
});
</script>

<div class="relative min-w-0 flex-1 bg-black" data-press-media data-press-media-ready={ready}>
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={video}
		class="block h-full w-full object-cover"
		{src}
		muted
		playsinline
		preload="auto"
	></video>
	<div
		class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent {compact ? 'px-3 pb-2.5 pt-8' : 'px-5 pb-4 pt-12'}"
		aria-hidden="true"
	>
		<div class="flex items-center {compact ? 'gap-2' : 'gap-3'}">
			<svg class="{compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
			<span class="{compact ? 'text-[0.6rem]' : 'text-[0.7rem]'} font-650 tabular-nums text-white/85">{elapsed}</span>
			<span class="h-1 flex-1 rounded-full bg-white/25">
				<span class="block h-full rounded-full bg-jelly-pink" style="width: {Math.round(progress * 100)}%"></span>
			</span>
			<span class="{compact ? 'text-[0.6rem]' : 'text-[0.7rem]'} font-650 tabular-nums text-white/70">{duration}</span>
		</div>
	</div>
</div>
