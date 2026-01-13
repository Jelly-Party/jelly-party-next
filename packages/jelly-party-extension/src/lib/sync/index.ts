/**
 * Sync module - Video synchronization components
 */

export { DeferredPromise } from "./DeferredPromise";
export { SyncBadge, syncBadge } from "./SyncBadge";
export {
	getDefaultSyncOptions,
	loadSyncOptions,
	type SyncOptionsConfig,
	saveSyncOptions,
} from "./SyncOptions";
export {
	VideoController,
	type VideoEventCallback,
	type VideoState,
	videoController,
} from "./VideoController";
