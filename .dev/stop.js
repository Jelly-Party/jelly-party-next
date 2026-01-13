#!/usr/bin/env node
/**
 * Stop all dev processes - emergency fallback.
 * First tries clean PID-based kill, then falls back to port-based killing.
 */
import { execSync } from "child_process";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PID_FILE = join(__dirname, "dev.pid");

// Ports used by dev processes
const PORTS = [3000, 5173, 5174, 5175, 5180, 5181, 5182, 8080, 9090];

/**
 * Kill a process tree (cross-platform)
 */
function killProcessTree(pid) {
	try {
		if (process.platform === "win32") {
			execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
		} else {
			// Kill process group (negative PID)
			process.kill(-pid, "SIGTERM");
		}
		return true;
	} catch {
		try {
			process.kill(pid, "SIGTERM");
			return true;
		} catch {
			return false;
		}
	}
}

/**
 * Kill process on a port (cross-platform)
 */
function killOnPort(port) {
	try {
		if (process.platform === "win32") {
			// Windows: use netstat and taskkill
			const output = execSync(`netstat -ano | findstr :${port}`, {
				encoding: "utf8",
				stdio: ["pipe", "pipe", "ignore"],
			});
			const lines = output.trim().split("\n");
			for (const line of lines) {
				const parts = line.trim().split(/\s+/);
				const pid = parts[parts.length - 1];
				if (pid && /^\d+$/.test(pid)) {
					execSync(`taskkill /pid ${pid} /F`, { stdio: "ignore" });
				}
			}
		} else {
			// Unix: use lsof
			const output = execSync(`lsof -ti:${port}`, {
				encoding: "utf8",
				stdio: ["pipe", "pipe", "ignore"],
			});
			const pids = output.trim().split("\n").filter(Boolean);
			for (const pid of pids) {
				try {
					process.kill(parseInt(pid), "SIGKILL");
				} catch {
					// Process already dead
				}
			}
		}
	} catch {
		// No process on this port, that's fine
	}
}

// Main
console.log("\x1b[33m[stop]\x1b[0m Stopping dev processes...");

let killedViaPid = false;

// First try PID file (clean approach)
if (existsSync(PID_FILE)) {
	try {
		const pid = parseInt(readFileSync(PID_FILE, "utf8"));
		console.log(`\x1b[33m[stop]\x1b[0m Killing process group (PID ${pid})...`);
		killedViaPid = killProcessTree(pid);
		unlinkSync(PID_FILE);
	} catch {
		// File might be corrupt or process already dead
	}
}

// Wait a bit if we killed via PID
if (killedViaPid) {
	await new Promise((r) => setTimeout(r, 500));
}

// Fallback: kill by port
console.log(
	"\x1b[33m[stop]\x1b[0m Cleaning up any remaining processes on dev ports...",
);
for (const port of PORTS) {
	killOnPort(port);
}

console.log("\x1b[33m[stop]\x1b[0m Done!");
