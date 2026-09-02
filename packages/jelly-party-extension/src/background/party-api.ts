import { parsePartyId } from "jelly-party-lib";

export async function requestPartyId(
  url: string,
  request: typeof fetch = globalThis.fetch,
): Promise<string> {
  const response = await request(url, { method: "POST" });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const error = isRecord(body) && typeof body.error === "string" ? body.error : undefined;
    throw new Error(error ?? "Could not create a party. Try again.");
  }

  const partyId = isRecord(body) ? parsePartyId(body.partyId) : null;
  if (!partyId) throw new Error("The party service returned an invalid party ID.");
  return partyId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
