import type { MagicLink } from "./magic-link.js";
import { parsePartyId } from "./protocol.js";

export interface PermissionService {
  contains(originPattern: string): Promise<boolean>;
  request(originPattern: string): Promise<boolean>;
}

export type JoinAuthorizationResult = { ok: true } | { ok: false; error: string };

export async function authorizeMagicJoin(
  invite: MagicLink,
  permissions: PermissionService,
): Promise<JoinAuthorizationResult> {
  if (!validInvite(invite)) return { ok: false, error: "Invalid invite link" };

  try {
    if (await permissions.contains(invite.originPattern)) return { ok: true };
    if (await permissions.request(invite.originPattern)) return { ok: true };
    return { ok: false, error: "Site access was not granted" };
  } catch {
    return { ok: false, error: "Could not contact the browser permission service" };
  }
}

function validInvite(invite: MagicLink): boolean {
  if (!parsePartyId(invite.partyId)) return false;
  try {
    const destination = new URL(invite.destination);
    return (
      (destination.protocol === "https:" || destination.protocol === "http:") &&
      !destination.username &&
      !destination.password &&
      invite.originPattern === `${destination.origin}/*`
    );
  } catch {
    return false;
  }
}
