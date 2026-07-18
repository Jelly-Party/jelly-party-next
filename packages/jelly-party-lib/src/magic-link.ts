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
  link.searchParams.set("party", partyId);
  link.searchParams.set("video", destinationUrl.toString());
  return link.toString();
}

export function parseMagicLink(input: string | URL): MagicLink | null {
  let link: URL;
  try {
    link = input instanceof URL ? input : new URL(input);
  } catch {
    return null;
  }

  const partyId = parsePartyId(link.searchParams.get("party"));
  const destinationUrl = safeWebUrl(link.searchParams.get("video"));
  if (!partyId || !destinationUrl) return null;

  return {
    partyId,
    destination: destinationUrl.toString(),
    originPattern: `${destinationUrl.origin}/*`,
  };
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
