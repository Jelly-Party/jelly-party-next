# Jelly Party agent guide

Jelly Party is a deliberately small browser extension: create a temporary watch party, share a link, chat, and synchronize play, pause, and seek. The product and acceptance criteria live in [the Jelly Party 2.0 spec](.scratch/jelly-party/spec.md). Keep the implementation simpler than the existing prototype wherever possible.

## Non-negotiables

- Be pragmatic. Do not introduce frameworks, abstraction layers, compatibility systems, or infrastructure unless the spec requires them now.
- Preserve user-visible behavior from the old extension, not its internal architecture.
- The extension UI belongs in Chrome/Edge side panels and the Firefox sidebar. Page scripts only find/control video and communicate through extension runtime messaging.
- Production uses `wss://v2.jelly-party.com` only. Do not implement compatibility with the old extension or backend.
- A peer has a display name and emoji. Do not add avatars.
- Use TypeScript, Svelte, and UnoCSS. Prefer browser APIs and small local modules over dependencies.

## Tooling

- Enter the Nix development environment through the configured nix-direnv setup (`direnv allow` once). Nix supplies Playwright browsers.
- Use `vp` for Node.js, dependency management, formatting, linting, type-checking, tests, builds, and tasks. Never invoke `node`, `npm`, `npx`, `pnpm`, `vite`, or `vitest` directly.
- Use `vp install`, `vp dev`, `vp check`, `vp test --run`, and `vp build` for built-in workflows.
- Inspect project workflows with `vp run` and invoke them with `vp run <task>`. Add cross-package workflows to Vite Task in `vite.config.ts`; do not add another task runner.
- Use `vp node` for a Node.js script from the shell and `vp exec node` inside a Vite Task.
- Vite+ owns formatting, linting, type-checking, Vitest, builds, and tasks. Do not add Biome, ESLint, Prettier, or `just`.

## Validation

- Prefer one high-value Playwright flow over many brittle tests: create, share, join, chat, play, pause, and seek with two peers.
- Use Vitest for meaningful pure logic only, especially protocol validation, magic-link parsing, and playback synchronization behavior.
- Before handing off changes, run `vp check`, `vp test --run`, the Playwright E2E task, and the relevant Vite Task build.
- Extension build work is not complete until deterministic Chrome, Edge, and Firefox store archives are produced and their manifests are validated.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Local specifications

Specs live at `.scratch/<feature>/spec.md`; implementation tickets, when genuinely useful, live at `.scratch/<feature>/issues/`. Keep the spec authoritative and avoid duplicating its decisions into extra planning documents.
