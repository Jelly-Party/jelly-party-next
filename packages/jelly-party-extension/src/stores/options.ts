/**
 * Options store - persists user settings to browser storage
 */
import { writable } from "svelte/store";
import browser from "webextension-polyfill";

export interface UserOptions {
	guid: string;
	clientName: string;
	emoji: string;
}

const defaultOptions: UserOptions = {
	guid: "",
	clientName: "Anonymous",
	emoji: "🎉",
};

// Create the store
function createOptionsStore() {
	const { subscribe, set, update } = writable<UserOptions>(defaultOptions);

	// Load from storage on init
	async function load() {
		try {
			const result = await browser.storage.local.get("options");
			if (result.options) {
				set({ ...defaultOptions, ...result.options });
			}
		} catch (e) {
			console.error("Jelly Party: Failed to load options", e);
		}
	}

	// Save to storage
	async function save(options: UserOptions) {
		try {
			await browser.storage.local.set({ options });
			set(options);
		} catch (e) {
			console.error("Jelly Party: Failed to save options", e);
		}
	}

	return {
		subscribe,
		load,
		save,

		// Update single field
		updateField: async <K extends keyof UserOptions>(
			key: K,
			value: UserOptions[K],
		) => {
			update((opts) => {
				const newOpts = { ...opts, [key]: value };
				// Save async
				browser.storage.local.set({ options: newOpts });
				return newOpts;
			});
		},
	};
}

export const optionsStore = createOptionsStore();
