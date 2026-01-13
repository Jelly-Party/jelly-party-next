<script lang="ts">
interface Props {
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
	confirmDanger?: boolean;
}

let {
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	onConfirm,
	onCancel,
	confirmDanger = false,
}: Props = $props();

function handleBackdropClick(e: MouseEvent) {
	if (e.target === e.currentTarget) {
		onCancel();
	}
}
</script>

<div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true">
	<div class="modal-card">
		<h2 class="modal-title">{title}</h2>
		<p class="modal-message">{message}</p>
		<div class="modal-actions">
			<button class="btn-secondary" onclick={onCancel} data-testid="modal-cancel-btn">
				{cancelText}
			</button>
			<button
				class="btn-primary"
				class:danger={confirmDanger}
				onclick={onConfirm}
				data-testid="modal-confirm-btn"
			>
				{confirmText}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		backdrop-filter: blur(2px);
	}

	.modal-card {
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		border-radius: 16px;
		padding: 24px;
		max-width: 320px;
		width: 90%;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-title {
		font-size: 18px;
		font-weight: 600;
		color: #fff;
		margin-bottom: 12px;
		text-align: center;
	}

	.modal-message {
		font-size: 14px;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
		margin-bottom: 20px;
		text-align: center;
	}

	.modal-actions {
		display: flex;
		gap: 12px;
	}

	.btn-secondary {
		flex: 1;
		padding: 12px 16px;
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50rem;
		font-size: 14px;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.btn-primary {
		flex: 1;
		padding: 12px 16px;
		background: var(--jelly-purple);
		color: #fff;
		border: none;
		border-radius: 50rem;
		font-size: 14px;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-primary:hover {
		background: #7a4de6;
	}

	.btn-primary.danger {
		background: #dc3545;
	}

	.btn-primary.danger:hover {
		background: #c82333;
	}
</style>
