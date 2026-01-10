/**
 * Structured JSON logger
 * Outputs Grafana/Loki-ready JSON logs
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
	level: LogLevel;
	msg: string;
	ts: number;
	[key: string]: unknown;
}

function formatLog(level: LogLevel, msg: string, data?: object): string {
	const entry: LogEntry = {
		level,
		msg,
		ts: Date.now(),
		...data,
	};
	return JSON.stringify(entry);
}

export interface Logger {
	debug: (msg: string, data?: object) => void;
	info: (msg: string, data?: object) => void;
	warn: (msg: string, data?: object) => void;
	error: (msg: string, data?: object) => void;
}

/**
 * Create a logger with an optional namespace prefix
 */
export function createLogger(namespace?: string): Logger {
	const prefix = namespace ? `[${namespace}] ` : "";

	return {
		debug(msg: string, data?: object) {
			console.debug(formatLog("debug", prefix + msg, data));
		},
		info(msg: string, data?: object) {
			console.log(formatLog("info", prefix + msg, data));
		},
		warn(msg: string, data?: object) {
			console.warn(formatLog("warn", prefix + msg, data));
		},
		error(msg: string, data?: object) {
			console.error(formatLog("error", prefix + msg, data));
		},
	};
}

// Default logger instance
export const log = createLogger();
