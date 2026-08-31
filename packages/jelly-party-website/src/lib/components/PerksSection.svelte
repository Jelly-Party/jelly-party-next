<script lang="ts">
import LucideIcon from "./LucideIcon.svelte";

const LinkIcon = [
	["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }],
	["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }],
];
const SyncIcon = [
	["path", { d: "M20 7h-5V2" }],
	["path", { d: "M4 17h5v5" }],
	["path", { d: "M5.1 9A8 8 0 0 1 18.4 5.6L20 7" }],
	["path", { d: "M18.9 15A8 8 0 0 1 5.6 18.4L4 17" }],
];
const MessageIcon = [["path", { d: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" }]];

const features = [
	{
		title: "One link. No accounts.",
		icon: LinkIcon,
		description: "Create a temporary party and send the invite. Friends arrive at the same video without profiles or room codes.",
	},
	{
		title: "Everyone stays at the same moment",
		icon: SyncIcon,
		description: "Anyone can press play, pause for snacks, or skip back to a favourite scene. Everyone else's video follows, so nobody has to count down from three.",
	},
	{
		title: "Chat stays out of the way",
		icon: MessageIcon,
		description: "See who joined and talk in the browser sidebar. The video page itself is left alone, and the party disappears when everyone leaves.",
	},
];
</script>

<section id="features" class="bg-jelly-ink py-18 sm:py-24">
	<div class="jp-container">
		<div class="max-w-3xl">
			<p class="jp-kicker m-0">Just the useful parts</p>
			<h2 class="mb-0 mt-3 text-3xl leading-tight font-800 tracking-[-0.02em] text-white sm:text-5xl">A watch party without the ceremony</h2>
		</div>

		<div class="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-3">
			{#each features as feature}
				<article class="bg-jelly-panel p-6 sm:p-8">
					<div class="grid h-11 w-11 place-items-center rounded-xl bg-jelly-purple/20 text-jelly-mint" aria-hidden="true">
						<LucideIcon iconNode={feature.icon} size={22} />
					</div>
					<h3 class="mb-0 mt-5 text-xl font-750 tracking-normal text-white">{feature.title}</h3>
					<p class="mb-0 mt-2 leading-7 text-slate-400">{feature.description}</p>
				</article>
			{/each}
		</div>
	</div>
</section>
