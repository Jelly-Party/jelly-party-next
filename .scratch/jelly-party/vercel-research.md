# Vercel, Vite+, and pnpm 11 deployment research

Date: 2026-07-19

## Conclusion

The deployment failure is caused by a **pnpm 11 lockfile compatibility gap in
Vercel CLI**, not by the monorepo layout and not by the Vite build.

The selected fix is to keep pnpm 11 and bypass Vercel's package-manager
autodetection with an explicit Vercel install command:

```sh
curl -fsSL https://vite.plus | VP_NODE_MANAGER=no bash && $HOME/.vite-plus/bin/vp install --frozen-lockfile
```

The build commands likewise invoke the installed CLI by its absolute path, for
example:

```sh
$HOME/.vite-plus/bin/vp run jelly-party-lib#build && $HOME/.vite-plus/bin/vp build
```

This deliberately avoids relying on Vercel to parse the pnpm 11 lockfile or to
make `vp` available on `PATH`. The Vite+ installer bootstraps `vp`; `vp install`
then reads the repository's existing pnpm 11 selection and performs the frozen
workspace install.

## Exact diagnosis

The repository's `pnpm-lock.yaml` is a YAML stream containing **two documents**:

- document 1 starts on line 1 and contains pnpm 11 environment metadata,
  including `configDependencies` and `packageManagerDependencies`;
- document 2 starts on line 199 and contains the actual workspace dependency
  graph.

That shape is intentional in pnpm 11. Its official v11 release notes state that
config-dependency and package-manager integrity information moved into a
separate lockfile YAML document, and that the environment lockfile section
stores resolved `packageManagerDependencies` used for package-manager switching.
[pnpm 11 release notes](https://github.com/orgs/pnpm/discussions/11377)

Vercel CLI 56.2.0 cannot parse that YAML stream. Its `readConfigFile()` calls
js-yaml's single-document `safeLoad()` for `.yaml` files and catches the
multiple-document error, printing exactly `Error while parsing config file` and
returning `null`.
[Vercel CLI 56.2.0 parser source](https://github.com/vercel/vercel/blob/vercel%4056.2.0/packages/build-utils/src/fs/read-config-file.ts)

The package-manager scanner treats a pnpm lockfile as present only when that
parser returns an object. When parsing returned `null`, it reaches the
no-lockfile branch; without active Corepack selection, that branch defaults to
npm. This explains the observed sequence precisely: two parse warnings,
`Installing dependencies...`, then npm failing on the pnpm-only `workspace:*`
specifier.
[Vercel CLI 56.2.0 package-manager scanner](https://github.com/vercel/vercel/blob/vercel%4056.2.0/packages/build-utils/src/fs/run-user-scripts.ts)

This is also why adding only `"packageManager": "pnpm@11.13.1"` did not fix the
deployment. It pins the desired manager for Vite+ and Corepack, but it does not
make Vercel's lockfile parser understand a multi-document pnpm 11 lockfile.

## Why Vite+ is not the culprit

Vite+ delegates dependency installation to the workspace's selected package
manager. Its documented detection order starts with `packageManager`, followed
by `devEngines.packageManager`, workspace configuration, and lockfiles; it then
downloads and invokes the matching package manager. It supports commands such
as `vp install --frozen-lockfile` and pnpm workspaces directly.
[Vite+ dependency installation documentation](https://viteplus.dev/guide/install)

The build never reaches `vp`: Vercel fails during its dependency-install phase,
before the locally declared `vite-plus` package and `vp` binary are available.
Changing Vite's build configuration therefore cannot solve this error.

## Why the monorepo is valid

Vercel officially supports pnpm workspaces and separate Vercel projects rooted
at individual application directories. Its monorepo requirements are satisfied
here:

- the root `pnpm-workspace.yaml` includes `packages/*`;
- every package has a unique `name`;
- `jelly-party-join` explicitly declares its internal dependency on
  `jelly-party-lib` using `workspace:*`;
- the Vercel project root is `packages/jelly-party-join`;
- source files outside that root can be included for shared packages and root
  configuration.

[Vercel monorepo documentation](https://vercel.com/docs/monorepos)
[Vercel monorepo FAQ](https://vercel.com/docs/monorepos/monorepo-faq)

The `workspace:*` npm error is a consequence of Vercel selecting the wrong
package manager after parsing fails; it is not evidence that the workspace
dependency is malformed.

## Selected fix: bootstrap Vite+ explicitly

Vercel supports a custom install command in `vercel.json`. When present, that
command is used instead of the inferred install command.
[Vercel package-manager overrides](https://vercel.com/docs/deployments/builds/package-managers#deployment-override)

Vite+'s official Unix installation command is `curl -fsSL https://vite.plus |
bash`. Its installer documentation defines `VP_NODE_MANAGER=no` specifically to
skip Node.js manager setup in CI, and documents `~/.vite-plus` as the default
`VP_HOME`. Vite+ creates command shims under `VP_HOME/bin`, which makes the
resulting executable `$HOME/.vite-plus/bin/vp` on Vercel's Linux build image.
[Vite+ installer environment variables](https://viteplus.dev/guide/installer-env-vars)
[Vite+ environment documentation](https://viteplus.dev/guide/env)

Using the absolute CLI path matters because the Vercel install command runs in
a fresh non-interactive shell. The installer may update shell-startup files, but
the current process is not guaranteed to reload them. The absolute path also
keeps both install and build commands independent of Vercel's erroneous npm
selection.

Once started, Vite+ detects the package manager from the repository root,
preferring `packageManager` and then `devEngines.packageManager`. It downloads
and invokes that declared package manager, so this repository continues using
its pinned pnpm 11 version. `vp install --frozen-lockfile` maps to the selected
package manager's frozen install and fails rather than rewriting the dependency
graph.
[Vite+ dependency installation documentation](https://viteplus.dev/guide/install)

### pnpm 11 build-script policy

The first clean pnpm 11 rehearsal reached the dependency graph correctly but
failed with `ERR_PNPM_IGNORED_BUILDS` for the legacy transitive dependency
`spawn-sync@1.0.15`. The lockfile path is:

```text
web-ext-run -> fx-runner -> spawn-sync@1.0.15
```

This is pnpm 11's intended security behavior. pnpm 11 makes
`strictDepBuilds: true` the default and replaces the older build-dependency
allowlist settings with an `allowBuilds` map. In that map, `true` permits a
package's lifecycle build script and `false` explicitly denies it.
[pnpm 11 release notes](https://github.com/orgs/pnpm/discussions/11377)

The workspace therefore records the decision explicitly:

```yaml
allowBuilds:
  esbuild: true
  spawn-sync: false
```

`esbuild` still needs its installation script, while `spawn-sync` does not on
the project's modern Node runtime. The package describes itself as a polyfill
for `child_process.spawnSync`; on Node 0.12 and newer it exports Node's built-in
implementation, and its own documentation says native compilation is
unnecessary on newer Node versions and installation may use `--ignore-scripts`.
[spawn-sync upstream README](https://github.com/ForbesLindesay/spawn-sync#readme)

Explicitly setting `spawn-sync: false` is preferable to weakening pnpm 11's
workspace-wide strict build policy: it documents the one legacy postinstall
that was reviewed and intentionally denied while preserving strict failure for
future unreviewed dependency scripts.

### Why installing the latest global `vp` does not float project dependencies

The installer defaults `VP_VERSION` to `latest`, so the bootstrap CLI itself is
updated on each clean Vercel build. That does **not** perform a project dependency
upgrade:

- the global CLI is installed under `VP_HOME`, outside the repository's
  `node_modules` dependency graph;
- `vp install --frozen-lockfile` installs exactly the committed lockfile and
  refuses dependency-resolution changes;
- the repository's local `vite-plus` package remains the version recorded by
  `package.json`/`pnpm-lock.yaml` (currently 0.2.5), and normal module resolution
  for imports from the project continues to use that local package.

The distinction is therefore “latest global command bootstrap” versus “locked
project dependencies.” The global CLI can still change behavior in a future
release; if that becomes undesirable, the same official installer supports
pinning it with `VP_VERSION=<exact version>` without changing the pnpm lockfile.
[Vite+ installer version controls](https://viteplus.dev/guide/installer-env-vars#vp_version)

## Conservative alternative: align the repository on pnpm 10

Vercel's current support table lists pnpm versions 6 through 10, but not pnpm 11. It automatically maps a `lockfileVersion: 9.0` lockfile to pnpm 9 or 10.
[Vercel package-manager support](https://vercel.com/docs/deployments/builds/package-managers)

The npm registry's official pnpm dist-tags identify `10.34.5` as the current
`latest-10` release as of the date of this note.
[pnpm registry dist-tags](https://registry.npmjs.org/-/package/pnpm/dist-tags)

Vite+ does not require pnpm 11. Its package-manager layer supports pnpm generally
and honors the repository pin, so pnpm 10 remains a viable fallback without
removing Vite+.

That alternative would pin `packageManager` and
`devEngines.packageManager.version` to `10.34.5`, remove pnpm 11's `allowBuilds`
setting while retaining `onlyBuiltDependencies`, and regenerate the lockfile
with `vp install`. The resulting conventional single-document v9 lockfile would
fit Vercel's officially supported automatic pnpm 10 path.

It is more conservative from Vercel's perspective, but it is not the chosen
fix because it changes the repository's intended package-manager version and
pnpm 11 configuration solely to accommodate Vercel's parser.

## Alternative considered: Vercel Corepack with pnpm 11

Vercel documents an experimental Corepack opt-in using
`ENABLE_EXPERIMENTAL_COREPACK=1` plus the root `packageManager` field.
[Vercel Corepack configuration](https://vercel.com/docs/builds/configure-a-build#corepack)

With that environment variable actually present, Vercel CLI's source indicates
that its no-lockfile fallback can select the package manager named by
`packageManager`, even after the pnpm lockfile parse fails. However, this is a
weaker choice here:

- Vercel still officially lists support only through pnpm 10;
- the lockfile parse warnings remain because Corepack does not repair the
  parser;
- Corepack support is explicitly experimental and requires per-project Vercel
  configuration;
- both Vercel projects would need that external setting kept in sync.

Corepack is a plausible workaround, but the custom Vite+ bootstrap is more
self-contained: it does not depend on an external per-project environment
variable and uses the project's existing Vite+ package-manager selection.

## Expected deployment after the fix

For each Vercel project:

- keep its application Root Directory (`packages/jelly-party-join` or
  `packages/jelly-party-website`);
- keep outside-root source inclusion enabled;
- use the committed custom Vite+ install command;
- use the package's committed `vercel.json` build and output settings.

Vercel may still print its pnpm lockfile parse warning while preparing the
custom command; the meaningful success criteria are that it runs the committed
custom install command, `$HOME/.vite-plus/bin/vp install --frozen-lockfile`
selects pnpm 11, and no automatic `npm install` is attempted.

## Clean verification result

After adding the explicit `spawn-sync: false` decision, a clean source-archive
rehearsal with no pre-existing `node_modules` successfully ran the exact Vercel
install command:

```sh
curl -fsSL https://vite.plus | VP_NODE_MANAGER=no bash && $HOME/.vite-plus/bin/vp install --frozen-lockfile
```

Both production build commands then passed from their respective Vercel project
roots:

```sh
# packages/jelly-party-join
$HOME/.vite-plus/bin/vp run jelly-party-lib#build && $HOME/.vite-plus/bin/vp build

# packages/jelly-party-website
$HOME/.vite-plus/bin/vp build
```

This verifies the important clean-deployment properties together: the global
Vite+ bootstrap works without shell initialization, Vite+ selects pnpm 11, the
frozen multi-document lockfile installs unchanged, the reviewed build-script
policy passes, the shared library is available to the join package, and both
static outputs build successfully.
