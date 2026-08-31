import { parsePartyId } from "./protocol.js";

export interface MagicLink {
  partyId: string;
  destination: string;
  originPattern: string;
}

export function buildMagicLink(joinOrigin: string, partyId: string, destination: string): string {
  if (!parsePartyId(partyId)) throw new TypeError("Invalid party ID");
  const destinationUrl = safeWebUrl(destination);
  if (!destinationUrl) throw new TypeError("Invalid destination URL");

  const link = new URL(joinOrigin);
  link.search = "";
  link.hash = "";
  link.hash = `${partyId}@${compactDestination(destinationUrl)}`;
  return link.toString();
}

export function parseMagicLink(input: string | URL): MagicLink | null {
  let link: URL;
  try {
    link = input instanceof URL ? input : new URL(input);
  } catch {
    return null;
  }

  const compact = parseCompactLink(link.hash);
  if (!compact) return null;

  return {
    partyId: compact.partyId,
    destination: compact.destination.toString(),
    originPattern: `${compact.destination.origin}/*`,
  };
}

function compactDestination(url: URL): string {
  return url.protocol === "https:" ? url.toString().slice("https://".length) : url.toString();
}

function parseCompactLink(hash: string): { partyId: string; destination: URL } | null {
  const separator = hash.indexOf("@");
  if (!hash.startsWith("#") || separator < 0) return null;

  const partyId = parsePartyId(hash.slice(1, separator));
  const compact = hash.slice(separator + 1);
  const destination = safeWebUrl(
    compact.startsWith("https://") || compact.startsWith("http://")
      ? compact
      : `https://${compact}`,
  );
  return partyId && destination ? { partyId, destination } : null;
}

function safeWebUrl(input: string | null): URL | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}
