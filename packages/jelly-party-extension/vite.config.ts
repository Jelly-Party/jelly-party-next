import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
	publicDir: "icons",
	define: {
		// Build-time config replacement - use env vars or defaults
		__JELLY_WS_URL__: JSON.stringify(
			process.env.VITE_JELLY_WS_URL || "ws://localhost:8080",
		),
		__JELLY_JOIN_URL__: JSON.stringify(
			process.env.VITE_JELLY_JOIN_URL || "http://localhost:5180",
		),
		__JELLY_WEBSITE_URL__: JSON.stringify(
			process.env.VITE_JELLY_WEBSITE_URL || "https://www.jelly-party.com",
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
		}),
	],
});
