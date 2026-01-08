/**
 * Structured JSON logger
 * Outputs Grafana/Loki-ready JSON logs
 */

import { config, type Environment } from "./config.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
	level: LogLevel;
	msg: string;
	ts: number;
	env: Environment;
	[key: string]: unknown;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

function shouldLog(level: LogLevel): boolean {
	return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[config.logLevel];
}

function formatLog(level: LogLevel, msg: string, data?: object): string {
	const entry: LogEntry = {
		level,
		msg,
		ts: Date.now(),
		env: config.env,
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
			if (shouldLog("debug")) {
				console.log(formatLog("debug", prefix + msg, data));
			}
		},
		info(msg: string, data?: object) {
			if (shouldLog("info")) {
				console.log(formatLog("info", prefix + msg, data));
			}
		},
		warn(msg: string, data?: object) {
			if (shouldLog("warn")) {
				console.warn(formatLog("warn", prefix + msg, data));
			}
		},
		error(msg: string, data?: object) {
			if (shouldLog("error")) {
				console.error(formatLog("error", prefix + msg, data));
			}
		},
	};
}

// Default logger instance
export const log = createLogger();
