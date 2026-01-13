import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig(({ mode }) => {
	const isTest = mode === "test";
	const isProd = mode === "production";

	// URL configuration based on mode
	const wsUrl = isProd ? "wss://ws.jelly-party.com" : "ws://localhost:8080";
	const joinUrl = isProd
		? "https://join.jelly-party.com"
		: "http://localhost:5180";
	const websiteUrl = "https://www.jelly-party.com";

	return {
		publicDir: "icons",
		build: {
			outDir: isTest ? "dist-test" : "dist",
		},
		define: {
			__JELLY_WS_URL__: JSON.stringify(process.env.VITE_JELLY_WS_URL || wsUrl),
			__JELLY_JOIN_URL__: JSON.stringify(
				process.env.VITE_JELLY_JOIN_URL || joinUrl,
			),
			__JELLY_WEBSITE_URL__: JSON.stringify(
				process.env.VITE_JELLY_WEBSITE_URL || websiteUrl,
			),
		},
		plugins: [
			svelte(),
			tailwindcss(),
			webExtension({
				additionalInputs: [
					"src/chat/chat.html",
					"src/content/main.ts",
					"src/content/videoAgent.ts",
				],
				transformManifest(manifest) {
					// For test mode: convert optional_host_permissions to host_permissions
					// This pre-grants permissions so script injection works without user gesture
					if (isTest && manifest.optional_host_permissions) {
						manifest.host_permissions = manifest.optional_host_permissions;
						delete manifest.optional_host_permissions;
					}

					return manifest;
				},
			}),
		],
	};
});
