import type { MagicLink } from "./magic-link.js";
import { parsePartyId } from "./protocol.js";

export interface PermissionService {
  contains(originPattern: string): Promise<boolean>;
}

export type JoinAuthorizationResult =
  | { status: "authorized" }
  | { status: "needs-permission"; originPattern: string }
  | { status: "unavailable" }
  | { status: "invalid" };

/**
 * Only reports whether the destination origin is already granted. Requesting it
 * has to happen inside a user gesture, which a background worker handling a
 * message no longer has, so the caller drives that from a click on the grant page.
 */
export async function authorizeMagicJoin(
  invite: MagicLink,
  permissions: PermissionService,
): Promise<JoinAuthorizationResult> {
  if (!validInvite(invite)) return { status: "invalid" };

  try {
    if (await permissions.contains(invite.originPattern)) return { status: "authorized" };
    return { status: "needs-permission", originPattern: invite.originPattern };
  } catch {
    return { status: "unavailable" };
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
