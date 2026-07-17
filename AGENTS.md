## Jelly Party development decisions

- The development environment is the Nix flake. `.envrc` is configured to activate it through nix-direnv when entering the repository after a one-time `direnv allow`; when diagnosing the environment, verify activation rather than assuming it from the presence of `vp`.
- Use the `vp` CLI for Node.js, dependency management, formatting, linting, type-checking, tests, builds, and project commands. Do not invoke `node`, `npm`, `npx`, `pnpm`, `vite`, or `vitest` directly.
- Use built-in commands for the common loop: `vp install`, `vp dev`, `vp check`, `vp test --run`, and `vp build`.
- Use Vite Task for project workflows: inspect them with `vp run`, then invoke them as `vp run <task>`. Prefer adding a task to `vite.config.ts` over introducing another task runner or a package script.
- Use `vp node` for Node.js scripts from the shell. Inside a Vite Task command, use `vp exec node`; the task environment resolves the workspace-local `vp` entrypoint, whose command surface does not include `vp node`.
- Target workspace package scripts through Vite Task, for example `vp run jelly-party-lib#build` or `vp run -r build`.
- Nix supplies the Playwright browser binaries; Vite+ supplies and runs the JavaScript toolchain. Keep the nixpkgs Playwright revision aligned with the Playwright version in the workspace lockfile.
- `just`, Biome, ESLint, and Prettier are intentionally not part of this project. Vite+ owns those responsibilities.

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

## Agent skills

### Issue tracker

Issues and specs are tracked as local Markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The tracker uses the five default triage role names. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain-doc layout. See `docs/agents/domain.md`.
