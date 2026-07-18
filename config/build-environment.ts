import { fileURLToPath } from "node:url";
import { loadEnv } from "vite-plus";

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));

export function loadBuildEnvironment(mode: string): Record<string, string | undefined> {
  return { ...loadEnv(mode, workspaceRoot, ""), ...process.env };
}
