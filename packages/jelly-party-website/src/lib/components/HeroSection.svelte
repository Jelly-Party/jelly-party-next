<script lang="ts">
import { getDownloadLink } from "$lib/download-link";
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-jelly-coral via-[#f778b9] to-jelly-pink pb-18 pt-28 text-white sm:pb-24 sm:pt-34">
	<div class="pointer-events-none absolute -right-24 top-8 h-88 w-88 rounded-full bg-white/10 blur-3xl" aria-hidden="true"></div>
	<div class="jp-container relative grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-18">
		<div class="text-center lg:text-left">
			<p class="m-0 text-sm font-800 tracking-[0.2em] text-white/75 uppercase">Watch parties made simple</p>
			<h1 class="mb-0 mt-4 text-5xl leading-[0.98] font-850 tracking-[-0.035em] sm:text-7xl lg:text-8xl">Watch anything.<br />Together.</h1>
			<p class="mx-auto mb-0 mt-6 max-w-2xl text-xl leading-8 font-650 text-white lg:mx-0 sm:text-2xl">
				Jelly Party keeps videos in sync while you watch and chat with friends.
			</p>
			<p class="mx-auto mb-0 mt-3 max-w-xl text-base leading-7 text-white/82 lg:mx-0 sm:text-lg">
				Open it beside an accessible HTML video, start a temporary party, and share one link. No account or room setup.
			</p>

			<div class="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row lg:justify-start">
				<a href={getDownloadLink()} class="jp-button bg-jelly-ink px-7 text-white shadow-lg shadow-jelly-ink/20 hover:bg-[#171b32]">Get Jelly Party</a>
				<a href="#live-demo" class="jp-button border border-white/50 bg-white/8 px-7 text-white hover:bg-white/16">See it stay in sync</a>
			</div>
			<p class="mb-0 mt-5 text-sm font-650 text-white/72">Chrome, Firefox, and Edge · Free and open source</p>
		</div>

		<div class="relative mx-auto w-full max-w-lg" aria-label="Jelly Party lives beside the video">
			<div class="absolute -left-5 top-14 hidden items-center gap-2 rounded-full border border-white/25 bg-jelly-ink/90 px-4 py-2 text-sm font-700 shadow-xl sm:flex">
				<span class="h-2 w-2 rounded-full bg-jelly-mint"></span>
				2 friends connected
			</div>
			<div class="rotate-1 rounded-[2rem] border border-white/25 bg-jelly-ink p-3 shadow-2xl shadow-jelly-ink/30">
				<div class="flex items-center gap-2 px-3 pb-3 pt-1" aria-hidden="true">
					<span class="h-2.5 w-2.5 rounded-full bg-jelly-coral"></span>
					<span class="h-2.5 w-2.5 rounded-full bg-[#ffd36c]"></span>
					<span class="h-2.5 w-2.5 rounded-full bg-jelly-mint"></span>
					<span class="ml-2 h-2 flex-1 rounded-full bg-white/8"></span>
				</div>
				<div class="grid min-h-78 grid-cols-[1fr_8.5rem] overflow-hidden rounded-[1.35rem] bg-[#070914] sm:grid-cols-[1fr_11rem]">
					<div class="relative overflow-hidden bg-gradient-to-br from-[#232944] to-[#0e1020]">
						<div class="absolute inset-0 grid place-items-center">
							<img class="jp-logo h-32 w-32 opacity-90 sm:h-42 sm:w-42" src="/favicon.ico" alt="" width="128" height="128" />
						</div>
						<div class="absolute inset-x-5 bottom-5">
							<div class="h-1 rounded-full bg-white/15"><div class="h-full w-3/5 rounded-full bg-jelly-pink"></div></div>
							<div class="mt-3 flex items-center gap-2 text-[0.65rem] font-700 text-white/70"><span class="text-sm text-white">▶</span> 28:14 <span class="ml-auto">52:03</span></div>
						</div>
					</div>
					<div class="border-l border-white/8 bg-[#111426] p-3 text-left">
						<div class="flex items-center gap-2">
							<img class="jp-logo h-7 w-7" src="/favicon.ico" alt="" width="128" height="128" />
							<span class="text-xs font-800">Jelly Party</span>
						</div>
						<div class="mt-4 rounded-lg bg-white/5 p-3">
							<p class="m-0 text-[0.6rem] font-800 tracking-wide text-jelly-mint uppercase">Watching together</p>
							<p class="mb-0 mt-1 text-xs font-700">Friday movie night</p>
						</div>
						<div class="mt-3 flex gap-1.5 text-[0.62rem] text-slate-300"><span class="rounded-full bg-white/8 px-2 py-1">✦ Mira</span><span class="rounded-full bg-white/8 px-2 py-1">● Cal</span></div>
						<div class="mt-3 rounded-lg bg-white/5 p-3 text-[0.65rem] leading-4 text-slate-300"><b class="text-white">Cal</b><br />Ready when you are!</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
