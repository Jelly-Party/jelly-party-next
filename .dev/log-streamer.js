#!/usr/bin/env node
/**
 * WebSocket log streamer for extension logs.
 * Receives logs from the extension and outputs them in structured JSON format.
 */
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3000 });

// ANSI colors (just for startup message)
const c = {
	cyan: "\x1b[36m",
	reset: "\x1b[0m",
};

console.log(
	`${c.cyan}[log-streamer]${c.reset} Listening on ws://localhost:3000`,
);

wss.on("connection", (ws) => {
	ws.on("message", (raw) => {
		try {
			const { identity = "?", ...rest } = JSON.parse(raw.toString());

			// Output as JSON, adding identity to msg prefix to match server format
			// Server format: {"level":"info","msg":"[server] Message","ts":...}
			// Extension format: {"level":"info","msg":"[ext:bg] Message","ts":...}
			const entry = {
				...rest,
				msg: `[ext:${identity}] ${rest.msg || ""}`,
			};
			console.log(JSON.stringify(entry));
		} catch {
			console.log(raw.toString());
		}
	});
});
