<script lang="ts">
let openQuestion = $state<string | null>(null);

function toggleQuestion(id: string) {
	openQuestion = openQuestion === id ? null : id;
}

const questions = [
	{
		id: "start-party",
		question: "How do I start a party?",
		answer: 'Simply head to the "Party" tab and press "Start a new party".',
	},
	{
		id: "fullscreen",
		question: "How do I enable fullscreen?",
		answer:
			"Some websites have a very obtrusive full-screen handler. In this case, try toggling fullscreen using the fullscreen button located in the Controls-Bar under the Party tab (visible after you have joined a party).",
	},
	{
		id: "magic-link",
		question: "How do I join using a magic link?",
		answer:
			"Simply open the magic link in a browser with Jelly-Party installed and you will automatically join the party. Note that Jelly-Party may ask you for additional permissions.",
	},
	{
		id: "manual-join",
		question: "How do I manually join a party?",
		answer:
			'Head to the video you want to watch and open Jelly-Party. Now type in the common Party-Id (you can either generate one by clicking on "Start a new party" or make one up yourself) and press "Join party manually by Id".',
	},
	{
		id: "when-manual",
		question: "When should I join manually?",
		answer:
			"Currently, there're two use-cases for joining a party manually:\n\n1. The website you're using Jelly-Party on doesn't support magic links.\n\n2. You want to sync videos from different video streaming services (e.g. one has Netflix, another has Prime).",
	},
];
</script>

<div class="help-tab">
	<!-- Q&A Section -->
	<section class="section">
		<h3 class="section-title">Q & A</h3>
		<div class="qa-list">
			{#each questions as q}
				<div class="qa-item">
					<button
						class="qa-question"
						onclick={() => toggleQuestion(q.id)}
						class:open={openQuestion === q.id}
					>
						<span>{q.question}</span>
						<span class="qa-icon">{openQuestion === q.id ? "−" : "+"}</span>
					</button>
					{#if openQuestion === q.id}
						<div class="qa-answer">
							{q.answer}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- Support Section -->
	<section class="section">
		<h3 class="section-title">Support Jelly-Party</h3>
		<p class="section-text">
			If you want to show your support, you can back us on Patreon. This will
			help cover the server costs and allow us to spend more time on improving
			Jelly-Party.
		</p>
		<a
			href="https://www.patreon.com/nicholasliu"
			target="_blank"
			rel="noopener"
			class="btn-secondary"
		>
			Support on Patreon
		</a>
	</section>

	<!-- More Help Section -->
	<section class="section">
		<h3 class="section-title">More help</h3>
		<p class="section-text">
			Join our
			<a href="https://discord.gg/H3dExqc" target="_blank" rel="noopener"
				>Discord channel</a
			>
			to get more help and browse our
			<a href="https://www.jelly-party.com/" target="_blank" rel="noopener"
				>website</a
			>
			to learn more about Jelly-Party.
		</p>
	</section>

	<!-- Open Source Section -->
	<section class="section">
		<h3 class="section-title">Open source software</h3>
		<p class="section-text">
			Jelly-Party is powered by amazing open source software, notably
			<a href="https://nodejs.org/en/" target="_blank" rel="noopener">Node.js</a
			>,
			<a href="https://svelte.dev/" target="_blank" rel="noopener">Svelte</a>,
			and much more!
		</p>
	</section>
</div>

<style>
	.help-tab {
		padding: 0 16px;
	}

	.section {
		margin-bottom: 20px;
	}

	.section-title {
		font-size: 16px;
		font-weight: 600;
		text-align: center;
		margin-bottom: 12px;
		color: #fff;
	}

	.section-text {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.9);
		line-height: 1.5;
		text-align: justify;
		margin-bottom: 12px;
	}

	.section-text a {
		color: var(--jelly-purple);
		text-decoration: none;
	}

	.section-text a:hover {
		text-decoration: underline;
	}

	.qa-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.qa-item {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		overflow: hidden;
	}

	.qa-question {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: none;
		border: none;
		color: #fff;
		font-size: 14px;
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.qa-question:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.qa-question.open {
		background: rgba(255, 255, 255, 0.08);
	}

	.qa-icon {
		font-size: 18px;
		font-weight: 300;
		opacity: 0.7;
	}

	.qa-answer {
		padding: 0 16px 12px;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
		white-space: pre-line;
	}

	.btn-secondary {
		display: block;
		width: 100%;
		padding: 10px 16px;
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50rem;
		font-size: 14px;
		font-weight: 500;
		font-family: inherit;
		text-align: center;
		text-decoration: none;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.15);
	}
</style>
