<script lang="ts">
import "../app.css";
import Footer from "$lib/components/Footer.svelte";
import Navbar from "$lib/components/Navbar.svelte";

let { children } = $props();
</script>

<svelte:head>
	<title>Jelly Party - Watch anything together</title>
</svelte:head>

<Navbar />
<main>
	{@render children()}
</main>
<Footer />
