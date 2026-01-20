<script lang="ts">
import LucideIcon from "./LucideIcon.svelte";

// Icon definitions extracted from lucide-svelte to avoid import errors
const VideoIcon = [
	[
		"path",
		{
			d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
		},
	],
	["rect", { x: "2", y: "6", width: "14", height: "12", rx: "2" }],
];
const RefreshCcwIcon = [
	["path", { d: "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
	["path", { d: "M3 3v5h5" }],
	["path", { d: "M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" }],
	["path", { d: "M16 16h5v5" }],
];
const BeerIcon = [
	["path", { d: "M17 11h1a3 3 0 0 1 0 6h-1" }],
	["path", { d: "M9 12v6" }],
	["path", { d: "M13 12v6" }],
	[
		"path",
		{
			d: "M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z",
		},
	],
	["path", { d: "M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" }],
];

const perks = [
	{
		title: "(Video-) Chat with friends",
		icon: VideoIcon,
		description:
			"Stay connected while watching together with integrated video chat.",
	},
	{
		title: "Always watch in sync",
		icon: RefreshCcwIcon,
		description:
			"Advanced synchronization ensures everyone sees the same frame at the same time.",
	},
	{
		title: "Free. As in free beer.",
		icon: BeerIcon,
		description:
			"Open source software. No hidden costs, no premium tiers, just fun.",
	},
];
</script>

<section class="py-24 bg-[#0a0a0a] relative z-10">
	<div class="container mx-auto px-4">
		<h2 class="text-3xl md:text-5xl font-bold text-center mb-20 text-white tracking-tight">
			Worry-free watch parties
		</h2>
		
		<div class="grid md:grid-cols-3 gap-8 lg:gap-12">
			{#each perks as perk}
				<div class="flex flex-col items-center text-center p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-2 group">
					<!-- Icon with gradient background -->
					<div class="w-20 h-20 mb-8 rounded-2xl bg-gradient-to-br from-jelly-purple to-jelly-pink p-[1px] group-hover:shadow-[0_0_30px_rgba(145,100,255,0.3)] transition-shadow">
						<div class="w-full h-full rounded-2xl bg-[#0a0a0a] flex items-center justify-center">
							<LucideIcon iconNode={perk.icon} class="w-10 h-10 text-white group-hover:scale-110 transition-transform duration-300" />
						</div>
					</div>
					
					<h3 class="text-xl md:text-2xl font-bold text-white mb-4">
						{perk.title}
					</h3>
					<p class="text-white/60 leading-relaxed max-w-sm">
						{perk.description}
					</p>
				</div>
			{/each}
		</div>
	</div>
</section>
