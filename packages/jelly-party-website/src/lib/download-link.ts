export function getDownloadLink(userAgent = globalThis.navigator?.userAgent ?? ""): string {
  if (userAgent.includes("Firefox")) return __JELLY_FIREFOX_STORE_URL__;
  if (userAgent.includes("Edg/")) return __JELLY_EDGE_STORE_URL__;
  return __JELLY_CHROME_STORE_URL__;
}
