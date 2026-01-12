<script lang="ts">
import { faqItems } from "jelly-party-lib";

let openQuestion = $state<string | null>(null);

function toggleQuestion(id: string) {
	openQuestion = openQuestion === id ? null : id;
}
</script>

<div class="help-tab">
	<!-- Getting Started & Support -->
	<section class="section">
		<h3 class="section-title">Getting Started</h3>
		<p class="section-text">
			1. Ensure all friends have <strong>Jelly-Party</strong> installed.<br />
			2. One person clicks <strong>"Start a new party"</strong> in the Party tab.<br />
			3. Share the link with friends!
		</p>
		<p class="section-text help-link">
			Need help? Join our
			<a href="https://discord.gg/H3dExqc" target="_blank" rel="noopener">Discord community</a>.
		</p>
	</section>

	<!-- Q&A Section -->
	<section class="section">
		<h3 class="section-title">Common Questions</h3>
		<div class="qa-list">
			{#each faqItems as q}
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

	<!-- Open Source Section -->
	<section class="section open-source">
		<p class="section-text centered">
			Proudly open source ❤️<br />
			Check out the code on
			<a href="https://github.com/Jelly-Party/jelly-party-next" target="_blank" rel="noopener">GitHub</a>
		</p>
	</section>
</div>

<style>
	.help-tab {
		padding: 0 16px;
	}

	.section {
		margin-bottom: 24px;
	}

	.section-title {
		font-size: 15px;
		font-weight: 600;
		text-align: center;
		margin-bottom: 12px;
		color: #fff;
		opacity: 0.9;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.section-text {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.85);
		line-height: 1.6;
		text-align: left;
		margin-bottom: 8px;
	}

	.section-text strong {
		color: #fff;
		font-weight: 600;
	}

	.help-link {
		margin-top: 12px;
		font-size: 13px;
		opacity: 0.8;
	}

	.section-text.centered {
		text-align: center;
	}

	.section-text a {
		color: var(--jelly-purple);
		text-decoration: none;
		font-weight: 500;
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
		transition: background-color 0.2s;
	}

	.qa-item:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.qa-question {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 14px;
		background: none;
		border: none;
		color: #fff;
		font-size: 13.5px;
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		line-height: 1.4;
	}

	.qa-question.open {
		background: rgba(255, 255, 255, 0.05);
		font-weight: 500;
	}

	.qa-icon {
		font-size: 18px;
		font-weight: 300;
		opacity: 0.7;
		margin-left: 8px;
		flex-shrink: 0;
	}

	.qa-answer {
		padding: 4px 14px 14px;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.75);
		line-height: 1.5;
		white-space: pre-line;
	}

	.open-source {
		margin-top: 32px;
		margin-bottom: 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 20px;
	}
</style>
