{
  description = "Jelly Party development environment";

  # Keep the browser revisions aligned with Playwright 1.57 in pnpm-lock.yaml.
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/145b67bd0bd4e075f981c1c2b81155d9e2982de2";

  outputs = { nixpkgs, ... }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.geckodriver
              pkgs.playwright-driver.browsers
              pkgs.noto-fonts-color-emoji
            ] ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
              pkgs.firefox
            ];

            # The store assets are screenshots of the real UI, which shows peer emoji, so the
            # capture browser needs an emoji font wherever `vp run assets:store` is run.
            FONTCONFIG_FILE = pkgs.makeFontsConf {
              fontDirectories = [ pkgs.noto-fonts-color-emoji pkgs.dejavu_fonts ];
            };

            PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = true;
            CHROME_PATH =
              if pkgs.stdenv.isDarwin then
                # Development should open the user's real Chrome on macOS. The internal
                # Playwright directory differs between Intel and Apple Silicon releases.
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
              else
                "${pkgs.playwright-driver.browsers}/chromium-1200/chrome-linux/chrome";
            FIREFOX_BIN =
              if pkgs.stdenv.isDarwin then
                "/Applications/Firefox.app/Contents/MacOS/firefox"
              else
                "${pkgs.firefox}/bin/firefox";
            GECKODRIVER_BIN = "${pkgs.geckodriver}/bin/geckodriver";
          };
        });
    };
}
