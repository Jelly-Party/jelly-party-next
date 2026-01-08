import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [
		svelte(),
		tailwindcss(),
		webExtension({
			// Uses manifest.json in same directory by default
		}),
	],
});
