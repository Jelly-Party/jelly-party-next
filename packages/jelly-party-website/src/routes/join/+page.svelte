<script lang="ts">
import { onMount } from "svelte";
import { parseMagicLink } from "jelly-party-lib";

let description = $state("Checking your Jelly Party invite…");
let status = $state("");
let showInstall = $state(false);

onMount(() => {
	const invite = parseMagicLink(window.location.href);
	let extensionAvailable = document.documentElement.dataset.jellyPartyExtension === "installed";
	const startupError = document.documentElement.dataset.jellyPartyError;

	if (!invite) {
		description = "This invite is incomplete or unsafe. Ask your friend for a new link.";
		status = "Invalid invite link";
	} else {
		description = `Jelly Party will request access to ${new URL(invite.destination).hostname}, then open the shared video.`;
		if (extensionAvailable) status = "Opening Jelly Party…";
	}

	const onMessage = (event: MessageEvent) => {
		if (event.source !== window || !event.data) return;
		if (event.data.type === "jelly-party:available") {
			extensionAvailable = true;
			if (invite) status = "Opening Jelly Party…";
		}
		if (event.data.type === "jelly-party:result" && event.data.ok === false) {
			status = event.data.error ?? "Could not join. Please try again.";
		}
	};

	window.addEventListener("message", onMessage);
	if (startupError) status = startupError;
	const timeout = window.setTimeout(() => {
		if (!extensionAvailable && invite) {
			description = "Install Jelly Party, then open this invite again.";
			status = "Extension not detected";
			showInstall = true;
		}
	}, 750);

	return () => {
		window.clearTimeout(timeout);
		window.removeEventListener("message", onMessage);
	};
});
</script>

<svelte:head>
	<title>Join a Jelly Party</title>
	<meta name="description" content="Join a temporary Jelly Party watch party." />
</svelte:head>

<section
	class="grid min-h-[100svh] place-items-center overflow-x-hidden bg-gradient-to-br from-jelly-coral to-jelly-pink p-5 text-slate-100"
>
	<div class="jp-panel w-full max-w-108 p-7 text-center sm:p-10">
		<img
			class="jp-logo mx-auto h-22 w-22"
			src="/jelly-party.svg"
			alt="Jelly Party"
			width="128"
			height="128"
		/>
		<p class="mb-6 mt-3 text-xs font-800 tracking-widest text-rose-300 uppercase">Jelly Party</p>
		<h1 class="m-0 text-3xl leading-tight font-750 tracking-normal sm:text-4xl">
			You’re invited to watch together
		</h1>
		<p class="my-5 break-words text-sm leading-6 text-slate-300">{description}</p>
		<p
			id="status"
			class="mb-0 mt-4 min-h-5 text-sm leading-5 text-amber-200"
			role="status"
			aria-live="polite"
		>
			{status}
		</p>
		{#if showInstall}
			<a class="jp-button-primary mt-5 block w-full no-underline" href={__JELLY_WEBSITE_URL__}>
				Install Jelly Party
			</a>
		{/if}
	</div>
</section>
