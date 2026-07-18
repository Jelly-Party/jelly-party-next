export interface BuildUrls {
  website: string;
  join: string;
  websocket: string;
  repository: string;
  chromeStore: string;
  edgeStore: string;
  firefoxStore: string;
}

export const DEFAULT_BUILD_URLS: BuildUrls = {
  website: "https://www.jelly-party.com",
  join: "https://join.jelly-party.com",
  websocket: "wss://v2.jelly-party.com",
  repository: "https://github.com/Jelly-Party/jelly-party-next",
  chromeStore:
    "https://chromewebstore.google.com/detail/jelly-party/aiecbkandfgpphpdilbaaagnampmdgpd",
  edgeStore:
    "https://microsoftedge.microsoft.com/addons/detail/jelly-party/nbipgecjkbeflbbjolebocjboplijnfp",
  firefoxStore: "https://addons.mozilla.org/firefox/addon/jelly-party",
};

const BUILD_VARIABLES: Record<keyof BuildUrls, string> = {
  website: "VITE_JELLY_WEBSITE_URL",
  join: "VITE_JELLY_JOIN_URL",
  websocket: "VITE_JELLY_WS_URL",
  repository: "VITE_JELLY_REPOSITORY_URL",
  chromeStore: "VITE_JELLY_CHROME_STORE_URL",
  edgeStore: "VITE_JELLY_EDGE_STORE_URL",
  firefoxStore: "VITE_JELLY_FIREFOX_STORE_URL",
};

export function resolveBuildUrls(
  environment: Record<string, string | undefined>,
  options: { allowInsecureLocalhost?: boolean } = {},
): BuildUrls {
  return Object.fromEntries(
    Object.entries(DEFAULT_BUILD_URLS).map(([key, fallback]) => {
      const buildKey = key as keyof BuildUrls;
      const variable = BUILD_VARIABLES[buildKey];
      const value = environment[variable] || fallback;
      validateBuildUrl(variable, value, buildKey === "websocket", options.allowInsecureLocalhost);
      return [buildKey, value.replace(/\/$/, "")];
    }),
  ) as unknown as BuildUrls;
}

export function toWebExtensionMatchPattern(value: string): string {
  const parsed = new URL(value);
  return `${parsed.protocol}//${parsed.hostname}/*`;
}

function validateBuildUrl(
  variable: string,
  value: string,
  websocket: boolean,
  allowInsecureLocalhost = false,
): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${variable} must be an absolute URL`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(`${variable} must not contain credentials`);
  }

  const secureProtocol = websocket ? "wss:" : "https:";
  const localProtocol = websocket ? "ws:" : "http:";
  const isAllowedLocal =
    allowInsecureLocalhost &&
    localProtocol === parsed.protocol &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  if (parsed.protocol !== secureProtocol && !isAllowedLocal) {
    throw new Error(`${variable} must use ${secureProtocol}`);
  }
}
