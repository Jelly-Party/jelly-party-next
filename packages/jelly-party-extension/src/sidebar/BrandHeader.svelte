<script lang="ts">
  // The website's store-asset page renders this outside the extension, where the icon lives at a
  // different path, so the logo source is a prop instead of a hard-coded extension asset.
  export let logoSrc = "/128x128.png";
</script>

<header class="brand-header">
  <img class="jp-logo h-11 w-11" src={logoSrc} alt="" width="128" height="128" />
  <div class="min-w-0">
    <h1 class="m-0 text-xl font-700">Jelly Party</h1>
    <p class="m-0 truncate text-sm text-slate-400">Watch together, right beside the video.</p>
  </div>
</header>
