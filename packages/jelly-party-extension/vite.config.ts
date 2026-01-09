import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
	publicDir: "icons",
	plugins: [
		svelte(),
		tailwindcss(),
		webExtension({
			additionalInputs: ["src/chat/chat.html", "src/content/main.ts"],
		}),
	],
});
