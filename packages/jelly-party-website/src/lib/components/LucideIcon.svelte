<script lang="ts">
/**
 * Simplified Icon component to render Lucide icon nodes
 * avoids importing from the broken lucide-svelte package
 */
// oxlint-disable-next-line typescript/no-explicit-any -- Lucide nodes have heterogeneous attributes.
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
	"stroke-linecap": "round" as const,
	"stroke-linejoin": "round" as const,
	...$$restProps,
};
</script>

<svg {...attrs}>
	{#each iconNode as [tag, attrs]}
		<svelte:element this={tag} {...attrs} />
	{/each}
</svg>
