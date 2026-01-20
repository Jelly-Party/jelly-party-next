import type { LogLevel } from "jelly-party-lib";
import browser from "webextension-polyfill";

const WS_URL = "ws://localhost:3000";

let ws: WebSocket | null = null;
let isConnected = false;

// Queued logs: [level, msg, data]
const queue: [LogLevel, string, object | undefined][] = [];

// Identity: "bg" for background, or tab ID for content scripts
let identity: string = "?";

function detectIdentity(): string {
	try {
		if (typeof window === "undefined" || typeof document === "undefined") {
			return "bg";
		}
		if (
			window.location.protocol === "moz-extension:" ||
			window.location.protocol === "chrome-extension:"
		) {
			return "popup";
		}
		// Content script - will be replaced with tab ID after fetch
		return "content";
	} catch {
		return "?";
	}
}

async function fetchTabId(): Promise<void> {
	if (identity !== "content") return;
	try {
		const response = (await browser.runtime.sendMessage({
			type: "getTabId",
		})) as { tabId?: number };
		if (response?.tabId) {
			identity = String(response.tabId);
		}
	} catch {
		// Keep "content" as identity
	}
}

function connect() {
	const mode = import.meta.env.MODE;
	if (mode !== "development" && mode !== "test") return;

	identity = detectIdentity();
	ws = new WebSocket(WS_URL);

	ws.onopen = async () => {
		// Fetch tab ID BEFORE marking as connected
		await fetchTabId();
		isConnected = true;
		flushQueue();
		send("info", "Connected");
	};

	ws.onclose = () => {
		isConnected = false;
		setTimeout(connect, 3000);
	};

	ws.onerror = () => {};
}

function flushQueue() {
	if (!ws || !isConnected) return;
	while (queue.length > 0) {
		const item = queue.shift();
		if (item) {
			const [level, msg, data] = item;
			const entry = JSON.stringify({
				level,
				msg,
				ts: Date.now(),
				identity,
				...data,
			});
			ws.send(entry);
		}
	}
}

function send(level: LogLevel, msg: string, data?: object) {
	const mode = import.meta.env.MODE;
	if (mode !== "development" && mode !== "test") return;

	if (isConnected && ws) {
		const entry = JSON.stringify({
			level,
			msg,
			ts: Date.now(),
			identity,
			...data,
		});
		ws.send(entry);
	} else {
		// Queue without identity - will be set when flushing
		queue.push([level, msg, data]);
	}
}

function parseStructuredLog(
	// biome-ignore lint/suspicious/noExplicitAny: console args are any
	args: any[],
): { level: LogLevel; msg: string; data?: object } | null {
	if (args.length !== 1 || typeof args[0] !== "string") return null;

	try {
		const parsed = JSON.parse(args[0]);
		if (parsed.level && parsed.msg) {
			const { level, msg, ts, ...data } = parsed;
			return {
				level,
				msg,
				data: Object.keys(data).length > 0 ? data : undefined,
			};
		}
	} catch {}
	return null;
}

export function initDevLogger() {
	const mode = import.meta.env.MODE;
	if (mode !== "development" && mode !== "test") return;

	connect();

	const originalLog = console.log;
	const originalDebug = console.debug;
	const originalInfo = console.info;
	const originalWarn = console.warn;
	const originalError = console.error;

	const processConsoleCall = (
		// biome-ignore lint/suspicious/noExplicitAny: console overrides
		original: (...args: any[]) => void,
		defaultLevel: LogLevel,
		// biome-ignore lint/suspicious/noExplicitAny: console args
		...args: any[]
	) => {
		original(...args);

		const structured = parseStructuredLog(args);
		if (structured) {
			send(structured.level, structured.msg, structured.data);
		} else {
			const msg = args
				.map((arg) => {
					if (typeof arg === "object") {
						try {
							return JSON.stringify(arg);
						} catch {
							return "[Circular]";
						}
					}
					return String(arg);
				})
				.join(" ");
			send(defaultLevel, msg);
		}
	};

	console.log = (...args) => processConsoleCall(originalLog, "info", ...args);
	console.debug = (...args) =>
		processConsoleCall(originalDebug, "debug", ...args);
	console.info = (...args) => processConsoleCall(originalInfo, "info", ...args);
	console.warn = (...args) => processConsoleCall(originalWarn, "warn", ...args);
	console.error = (...args) =>
		processConsoleCall(originalError, "error", ...args);
}
