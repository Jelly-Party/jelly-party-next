# Firefox source review

Jelly Party 2.0 is built entirely from the checked-in TypeScript and Svelte sources with Vite+.

1. Enter the repository Nix environment with `direnv allow`.
2. Install the locked workspace with `vp install --frozen-lockfile`.
3. Run `vp run build:artifacts`.

The Firefox extension is `artifacts/jelly-party-2.0.0-firefox.zip`. The build task validates the
manifest and uses a fixed timestamp, sorted paths, and fixed compression settings so repeated builds
from the same source produce the same bytes.
