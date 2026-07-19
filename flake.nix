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
              pkgs.firefox
              pkgs.geckodriver
              pkgs.playwright-driver.browsers
            ];

            PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = true;
            CHROME_PATH =
              if pkgs.stdenv.isDarwin then
                "${pkgs.playwright-driver.browsers}/chromium-1200/chrome-mac/Chromium.app/Contents/MacOS/Chromium"
              else
                "${pkgs.playwright-driver.browsers}/chromium-1200/chrome-linux/chrome";
            FIREFOX_BIN = "${pkgs.firefox}/bin/firefox";
            GECKODRIVER_BIN = "${pkgs.geckodriver}/bin/geckodriver";
          };
        });
    };
}
