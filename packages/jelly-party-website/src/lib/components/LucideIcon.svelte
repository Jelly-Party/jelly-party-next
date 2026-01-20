<script lang="ts">
/**
 * Simplified Icon component to render Lucide icon nodes
 * avoids importing from the broken lucide-svelte package
 */
// biome-ignore lint/suspicious/noExplicitAny: generic icon node structure
export let iconNode: any[] = [];
export let size = 24;
export let color = "currentColor";
export let strokeWidth = 2;

$: attrs = {
	xmlns: "http://www.w3.org/2000/svg",
	width: size,
	height: size,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: color,
	"stroke-width": strokeWidth,
	"stroke-linecap": "round" as "round",
	"stroke-linejoin": "round" as "round",
	...$$restProps,
};
</script>

<svg {...attrs}>
	{#each iconNode as [tag, attrs]}
		<svelte:element this={tag} {...attrs} />
	{/each}
</svg>
