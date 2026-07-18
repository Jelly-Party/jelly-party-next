# Set the implementation standards

Type: grilling
Status: resolved

## Question

What implementation and toolchain constraints must all Jelly Party 2.0 production work follow?

## Answer

- Write simple, idiomatic TypeScript throughout the workspace.
- Use UnoCSS as the CSS processor. Replace the current Tailwind setup rather than operating two styling systems.
- Prefer browser, WebExtension, platform, and Vite+ capabilities over dependencies. Add a library only when it removes substantial owned complexity; keep the dependency surface small and justify exceptions.
- Avoid speculative abstractions, framework-like internal machinery, and indirection without a demonstrated second implementation or caller.
- Use Vite+ consistently for runtime and package management through `vp`, workspace tasks, development, tests, builds, formatting, linting, and type-checking.
- Express project workflows as Vite Task entries and package-level Vite+ configuration. Do not introduce another task runner or invoke `node`, `npm`, `npx`, `pnpm`, `vite`, or `vitest` directly from the development shell.
- Keep validation at the smallest useful interface, using Vitest through Vite+ and browser-level coverage where WebExtension or media behavior requires a real browser.
