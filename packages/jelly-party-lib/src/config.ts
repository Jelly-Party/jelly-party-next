/**
 * Configuration with dev defaults
 * Values are replaced at build time via Vite's `define` for production builds
 */

// Vite build-time globals (replaced by vite.config.ts define)
declare const __JELLY_WS_URL__: string | undefined;
declare const __JELLY_JOIN_URL__: string | undefined;
declare const __JELLY_WEBSITE_URL__: string | undefined;

export interface Config {
	// URLs - dev defaults, replaced at build time for production
	wsUrl: string;
	joinUrl: string;
	websiteUrl: string;

	// Version
	version: string;
}

/**
 * Configuration with build-time overrides
 * Uses Vite-defined globals if available, otherwise dev defaults
 */
export const config: Config = {
	wsUrl:
		typeof __JELLY_WS_URL__ !== "undefined"
			? __JELLY_WS_URL__
			: "ws://localhost:8080",
	joinUrl:
		typeof __JELLY_JOIN_URL__ !== "undefined"
			? __JELLY_JOIN_URL__
			: "http://localhost:5180",
	websiteUrl:
		typeof __JELLY_WEBSITE_URL__ !== "undefined"
			? __JELLY_WEBSITE_URL__
			: "https://www.jelly-party.com",
	version: "2.0.0",
};
