<script lang="ts">
const services = [
	{ name: "DisneyPlus", sync: true, chat: true, fullscreen: true },
	{ name: "Jellyfin", sync: true, chat: true, fullscreen: true },
	{ name: "Netflix", sync: true, chat: true, fullscreen: true },
	{ name: "PrimeVideo", sync: true, chat: true, fullscreen: true },
	{ name: "Vimeo", sync: true, chat: true, fullscreen: false },
	{ name: "YouTube", sync: true, chat: true, fullscreen: true },
];
</script>

<svelte:head>
	<title>Supported Services - Jelly Party</title>
	<meta name="description" content="List of streaming services supported by Jelly Party for synchronized watching." />
</svelte:head>

<div class="pt-24 pb-16 bg-[#0a0a0a] min-h-screen">
	<div class="container mx-auto px-4 max-w-4xl">
		<h1 class="text-3xl font-bold mb-8 text-center text-white">Supported Streaming Services</h1>
		
		<div class="overflow-x-auto rounded-xl border border-white/10 shadow-xl">
			<table class="w-full border-collapse">
				<thead>
					<tr class="bg-white/10 text-white border-b border-white/10">
						<th class="text-left p-4 font-semibold">Streaming Service</th>
						<th class="text-center p-4 font-semibold">Video Sync</th>
						<th class="text-center p-4 font-semibold">Chat</th>
						<th class="text-center p-4 font-semibold">Fullscreen</th>
					</tr>
				</thead>
				<tbody>
					{#each services as service, i}
						<tr class="{i % 2 === 0 ? 'bg-white/5' : 'bg-transparent'} border-b border-white/5 hover:bg-white/10 transition-colors text-white/90">
							<td class="p-4 font-medium">{service.name}</td>
							<td class="p-4 text-center text-green-400">{service.sync ? "✓" : "✗"}</td>
							<td class="p-4 text-center text-green-400">{service.chat ? "✓" : "✗"}</td>
							<td class="p-4 text-center" class:text-green-400={service.fullscreen} class:text-red-400={!service.fullscreen}>
								{service.fullscreen ? "✓" : "✗"}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<p class="mt-8 text-white/60 text-center">
			Want to request support for another service? 
			<a href="mailto:hi@jelly-party.com" class="text-jelly-pink hover:text-white transition-colors underline">Contact us</a>!
		</p>
	</div>
</div>
