#!/usr/bin/env node
/**
 * Dev runner with singleton process management.
 * Ensures only one dev process runs at a time by using a PID file.
 * If a previous dev process is running, it will be killed first.
 */
import { spawn, execSync } from "child_process";
import {
	writeFileSync,
	unlinkSync,
	readFileSync,
	existsSync,
	mkdirSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEV_DIR = __dirname;
const PID_FILE = join(DEV_DIR, "dev.pid");

// Ensure .dev directory exists
mkdirSync(DEV_DIR, { recursive: true });

/**
 * Kill a process and all its children (cross-platform)
 */
function killProcessTree(pid) {
	try {
		if (process.platform === "win32") {
			execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
		} else {
			// Kill process group (negative PID)
			process.kill(-pid, "SIGTERM");
		}
	} catch {
		// Try individual kill as fallback
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			// Process already dead
		}
	}
}

// Kill existing dev process if running
if (existsSync(PID_FILE)) {
	try {
		const oldPid = parseInt(readFileSync(PID_FILE, "utf8"));
		killProcessTree(oldPid);
		console.log(
			`\x1b[33m[dev]\x1b[0m Stopped previous dev process (PID ${oldPid})`,
		);
		// Wait for cleanup
		await new Promise((r) => setTimeout(r, 1000));
	} catch {
		// Process already dead
	}
	try {
		unlinkSync(PID_FILE);
	} catch {
		// File might be gone
	}
}

// Write our PID
writeFileSync(PID_FILE, process.pid.toString());

// Cleanup on exit
const cleanup = () => {
	try {
		unlinkSync(PID_FILE);
	} catch {
		// Ignore
	}
};

process.on("exit", cleanup);
process.on("SIGINT", () => {
	cleanup();
	process.exit(0);
});
process.on("SIGTERM", () => {
	cleanup();
	process.exit(0);
});

console.log(
	`\x1b[33m[dev]\x1b[0m Starting dev servers (PID ${process.pid})...`,
);

// Run the actual dev command with detached process group
const child = spawn("pnpm", ["run", "dev:all"], {
	stdio: "inherit",
	cwd: join(DEV_DIR, ".."),
	detached: true, // Create new process group so we can kill all children
});

// Store child's PID (process group leader) instead of our PID
writeFileSync(PID_FILE, child.pid.toString());

child.on("exit", (code) => {
	cleanup();
	process.exit(code ?? 0);
});

// Forward signals to child process group
process.on("SIGINT", () => killProcessTree(child.pid));
process.on("SIGTERM", () => killProcessTree(child.pid));
