/**
 * Video site configurations for E2E testing.
 * Each site defines URLs and selectors needed for party sync testing.
 */

export interface VideoSite {
	/** Unique identifier for the site */
	name: string;
	/** Display name for test reports */
	displayName: string;
	/** URL to a video page on this site */
	url: string;
	/** CSS selector for the video element */
	videoSelector: string;
	/** Whether login is required (for future cookie caching) */
	requiresLogin: boolean;
	/** Path to stored authentication state (relative to e2e/auth/) */
	authStatePath?: string;
}

export const sites: VideoSite[] = [
	{
		name: "peertube",
		displayName: "PeerTube",
		url: "https://peertube.tv/w/g7hf7Qfyj4TWt7RRBBK2EK",
		videoSelector: "video",
		requiresLogin: false,
	},
	// Future sites can be added here:
	// {
	//   name: 'netflix',
	//   displayName: 'Netflix',
	//   url: 'https://www.netflix.com/watch/...',
	//   videoSelector: 'video',
	//   requiresLogin: true,
	//   authStatePath: 'netflix.json',
	// },
];

/**
 * Get a site configuration by name.
 */
export function getSite(name: string): VideoSite {
	const site = sites.find((s) => s.name === name);
	if (!site) {
		throw new Error(`Unknown video site: ${name}`);
	}
	return site;
}

/**
 * Default site for testing.
 */
export const defaultSite = sites[0];
