<script lang="ts">
import "virtual:uno.css";
import "../app.css";
import { page } from "$app/state";
import Footer from "$lib/components/Footer.svelte";
import Navbar from "$lib/components/Navbar.svelte";

let { children } = $props();
let standalone = $derived(page.url.pathname === "/join");
</script>

<svelte:head>
	<title>Jelly Party - Watch anything together</title>
</svelte:head>

{#if standalone}
	<main>{@render children()}</main>
{:else}
	<Navbar />
	<main>{@render children()}</main>
	<Footer />
{/if}
