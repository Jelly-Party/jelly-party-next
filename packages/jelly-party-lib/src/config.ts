/**
 * Environment-based configuration
 * Simple, type-safe config that works in both Node.js and browser
 */

export type Environment = "development" | "staging" | "production";

// Detect environment from various sources
function detectEnvironment(): Environment {
	// Node.js
	if (typeof process !== "undefined" && process.env) {
		const mode = process.env.NODE_ENV || process.env.MODE;
		if (mode === "production") return "production";
		if (mode === "staging") return "staging";
	}
	// Browser - check URL
	if (typeof window !== "undefined") {
		const host = window.location?.hostname;
		if (host?.includes("staging")) return "staging";
		if (host && !host.includes("localhost")) return "production";
	}
	return "development";
}

export interface Config {
	env: Environment;
	isDev: boolean;
	isProd: boolean;

	// WebSocket server
	wsUrl: string;

	// Logging
	logLevel: "debug" | "info" | "warn" | "error";

	// Version
	version: string;
}

const WS_URLS: Record<Environment, string> = {
	production: "wss://ws.jelly-party.com:8080",
	staging: "wss://staging.jelly-party.com:8080",
	development: "ws://localhost:8080",
};

function createConfig(): Config {
	const env = detectEnvironment();

	return {
		env,
		isDev: env === "development",
		isProd: env === "production",

		wsUrl: WS_URLS[env],

		logLevel: env === "production" ? "info" : "debug",

		version: "2.0.0",
	};
}

// Singleton config instance
export const config = createConfig();
