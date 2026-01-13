/**
 * Sync options - Configuration for video synchronization features
 *
 * Options are stored in browser.storage.sync for cross-device persistence.
 */

import { createLogger } from "jelly-party-lib";
import browser from "webextension-polyfill";

const log = createLogger("SyncOptions");

export interface SyncOptionsConfig {
	/** Show sync badge on video (default: false) */
	showSyncBadge: boolean;
	/** Enable drift correction (default: true) */
	driftCorrectionEnabled: boolean;
	/** Hard seek threshold in seconds (default: 2.0) */
	hardSeekThreshold: number;
	/** Soft sync threshold in seconds (default: 0.5) */
	softSyncThreshold: number;
}

const DEFAULT_OPTIONS: SyncOptionsConfig = {
	showSyncBadge: false,
	driftCorrectionEnabled: true,
	hardSeekThreshold: 2.0,
	softSyncThreshold: 0.5,
};

const STORAGE_KEY = "jellyParty:syncOptions";

/**
 * Load sync options from storage
 */
export async function loadSyncOptions(): Promise<SyncOptionsConfig> {
	try {
		const result = await browser.storage.sync.get(STORAGE_KEY);
		const stored = result[STORAGE_KEY] as
			| Partial<SyncOptionsConfig>
			| undefined;
		const options = { ...DEFAULT_OPTIONS, ...stored };
		log.debug("Loaded sync options", options);
		return options;
	} catch (e) {
		log.warn("Failed to load sync options, using defaults", {
			error: String(e),
		});
		return DEFAULT_OPTIONS;
	}
}

/**
 * Save sync options to storage
 */
export async function saveSyncOptions(
	options: Partial<SyncOptionsConfig>,
): Promise<void> {
	try {
		const current = await loadSyncOptions();
		const updated = { ...current, ...options };
		await browser.storage.sync.set({ [STORAGE_KEY]: updated });
		log.info("Saved sync options", updated);
	} catch (e) {
		log.error("Failed to save sync options", { error: String(e) });
	}
}

/**
 * Get default options
 */
export function getDefaultSyncOptions(): SyncOptionsConfig {
	return { ...DEFAULT_OPTIONS };
}
