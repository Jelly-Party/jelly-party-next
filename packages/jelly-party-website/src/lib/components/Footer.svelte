<script lang="ts">
const currentYear = new Date().getFullYear();
</script>

<footer class="bg-[#050505] text-white py-16 border-t border-white/5">
	<div class="container mx-auto px-4">
		<!-- Main footer content -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
			<!-- Extensions -->
			<div class="text-center md:text-left">
				<h3 class="font-bold mb-6 text-white text-lg">Get the Extension</h3>
				<ul class="space-y-4">
					<li>
						<a 
							href="https://chrome.google.com/webstore/detail/jelly-party/aiecbkandfgpphpdilbaaagnampmdgpd"
							class="text-white/60 hover:text-jelly-purple transition-colors flex items-center justify-center md:justify-start gap-2"
						>
							<span class="w-2 h-2 rounded-full bg-jelly-purple"></span>
							Chrome / Edge
						</a>
					</li>
					<li>
						<a 
							href="https://addons.mozilla.org/en-US/firefox/addon/jelly-party/"
							class="text-white/60 hover:text-jelly-orange transition-colors flex items-center justify-center md:justify-start gap-2"
						>
							<span class="w-2 h-2 rounded-full bg-jelly-orange"></span>
							Firefox
						</a>
					</li>
				</ul>
			</div>

			<!-- Links -->
			<div class="text-center">
				<h3 class="font-bold mb-6 text-white text-lg">Links</h3>
				<ul class="space-y-4">
					<li>
						<a href="/privacy-policy" class="text-white/60 hover:text-white transition-colors">
							Privacy Policy
						</a>
					</li>
					<li>
						<a href="/supported-services" class="text-white/60 hover:text-white transition-colors">
							Supported Services
						</a>
					</li>
					<li>
						<a 
							href="https://github.com/Jelly-Party"
							class="text-white/60 hover:text-white transition-colors"
							target="_blank"
							rel="noopener noreferrer"
						>
							GitHub
						</a>
					</li>
				</ul>
			</div>

			<!-- Feedback -->
			<div class="text-center md:text-right">
				<h3 class="font-bold mb-6 text-white text-lg">Feedback</h3>
				<p class="text-white/60 mb-4 text-sm leading-relaxed">
					Have questions or suggestions? <br/>
					We'd love to hear from you.
				</p>
				<a 
					href="mailto:hi@jelly-party.com"
					class="text-jelly-pink hover:text-white transition-colors font-medium inline-block border border-jelly-pink/30 px-6 py-2 rounded-full hover:bg-jelly-pink hover:border-transparent"
				>
					hi@jelly-party.com
				</a>
			</div>
		</div>

		<!-- Divider -->
		<div class="border-t border-white/5 pt-8">
			<p class="text-center text-white/40 text-sm">
				&copy; {currentYear} Jelly Party. Free &amp; 
				<a 
					href="https://github.com/Jelly-Party"
					class="text-white/60 hover:text-white transition-colors underline decoration-white/20 hover:decoration-white"
					target="_blank"
					rel="noopener noreferrer"
				>
					open source
				</a>.
			</p>
		</div>
	</div>
</footer>
