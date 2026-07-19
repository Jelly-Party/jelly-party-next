<script lang="ts">
import LucideIcon from "./LucideIcon.svelte";

const PanelIcon = [
	["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }],
	["path", { d: "M15 3v18" }],
];
const LinkIcon = [
	["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }],
	["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }],
];
const MessageIcon = [
	["path", { d: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" }],
];
const SyncIcon = [
	["path", { d: "M20 7h-5V2" }],
	["path", { d: "M4 17h5v5" }],
	["path", { d: "M5.1 9A8 8 0 0 1 18.4 5.6L20 7" }],
	["path", { d: "M18.9 15A8 8 0 0 1 5.6 18.4L4 17" }],
];

const features = [
	{
		title: "Lives beside the video",
		icon: PanelIcon,
		description: "Jelly Party opens in the browser side panel or sidebar, leaving the page itself alone.",
	},
	{
		title: "One link to join",
		icon: LinkIcon,
		description: "A temporary invite opens the shared video and guides friends through any required site access.",
	},
	{
		title: "Text chat and presence",
		icon: MessageIcon,
		description: "See who joined and chat with a display name and emoji. Nothing becomes a permanent profile.",
	},
	{
		title: "Playback stays together",
		icon: SyncIcon,
		description: "Play, pause, and seek travel in both directions so everyone stays near the same moment.",
	},
];
</script>

<section id="features" class="bg-jelly-ink py-20 sm:py-24">
	<div class="jp-container">
		<div class="max-w-2xl">
			<p class="jp-kicker m-0">What 2.0 does</p>
			<h2 class="mb-0 mt-3 text-3xl leading-tight font-800 tracking-normal text-white sm:text-5xl">A watch party without the ceremony</h2>
			<p class="mb-0 mt-5 text-lg leading-8 text-slate-300">Jelly Party keeps the useful parts close: invite, chat, and playback sync. Parties disappear when everyone leaves.</p>
		</div>

		<div class="mt-12 grid gap-4 md:grid-cols-2">
			{#each features as feature}
				<article class="jp-panel p-6 sm:p-7">
					<div class="grid h-11 w-11 place-items-center rounded-lg bg-jelly-purple/20 text-jelly-mint" aria-hidden="true">
						<LucideIcon iconNode={feature.icon} size={22} />
					</div>
					<h3 class="mb-0 mt-5 text-xl font-750 tracking-normal text-white">{feature.title}</h3>
					<p class="mb-0 mt-2 leading-7 text-slate-400">{feature.description}</p>
				</article>
			{/each}
		</div>
	</div>
</section>
