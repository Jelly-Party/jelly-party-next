// @ts-nocheck -- throwaway Node TUI; the portable state machine remains fully typed.
import { emitKeypressEvents } from "node:readline";
import { allowedActions, initialState, transition, type JoinAction } from "./state-machine.ts";

const bold = "\u001b[1m";
const dim = "\u001b[2m";
const reset = "\u001b[0m";

const actions: Record<string, JoinAction> = {
  o: { type: "open-valid-link" },
  v: { type: "open-invalid-link" },
  i: { type: "install-extension" },
  t: { type: "click-toolbar" },
  c: { type: "continue" },
  g: { type: "grant-permission" },
  d: { type: "deny-permission" },
  l: { type: "video-loaded" },
  f: { type: "navigation-failed" },
  j: { type: "party-connected" },
  x: { type: "connection-failed" },
  s: { type: "close-sidebar" },
  r: { type: "retry" },
};

let state = initialState(false);

function field(name: string, value: unknown): string {
  return `${bold}${name.padEnd(20)}${reset} ${String(value)}`;
}

function render(): void {
  console.clear();
  console.log(`${bold}Jelly Party magic-link join — PROTOTYPE${reset}\n`);
  console.log(field("phase", state.phase));
  console.log(field("extension installed", state.extensionInstalled));
  console.log(field("origin permission", state.permission));
  console.log(field("sidebar", state.sidebar));
  console.log(field("tab", state.tab));
  console.log(field("party", state.party));
  console.log(field("pending invitation", state.pendingInvite));
  console.log(field("error", state.error ?? "none"));
  console.log(`\n${bold}What the peer sees${reset}\n${state.note}`);
  console.log(`\n${bold}Legal now${reset}\n${allowedActions(state).join(", ")}`);
  console.log(`\n${bold}Keys${reset}`);
  console.log(
    `${bold}o${reset} open valid link   ${bold}v${reset} invalid link      ${bold}i${reset} install extension`,
  );
  console.log(
    `${bold}t${reset} toolbar click     ${bold}c${reset} continue          ${bold}g${reset} grant permission`,
  );
  console.log(
    `${bold}d${reset} deny permission   ${bold}l${reset} video loaded      ${bold}f${reset} navigation fails`,
  );
  console.log(
    `${bold}j${reset} party connected   ${bold}x${reset} connection fails ${bold}s${reset} close sidebar`,
  );
  console.log(`${bold}r${reset} retry             ${bold}q${reset} quit`);
  console.log(`\n${dim}Try: o → i → t → c → d → r → c → g → l → x → r → j → s${reset}`);
}

function handle(input: string): void {
  if (input === "q" || input === "\u0003") {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.exit(0);
  }
  const action = actions[input];
  if (action) state = transition(state, action);
  render();
}

render();
emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("keypress", (input) => handle(input));
} else {
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (input: string) => {
    for (const character of input.trim()) handle(character);
  });
}
