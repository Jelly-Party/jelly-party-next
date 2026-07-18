export { createLogger, type Logger, type LogLevel } from "./logger.js";
export {
  authorizeMagicJoin,
  type JoinAuthorizationResult,
  type PermissionService,
} from "./join-authorization.js";
export { buildMagicLink, parseMagicLink, type MagicLink } from "./magic-link.js";
export { RemoteEchoGuard, targetTime, timeFromEnd } from "./playback.js";
export {
  type ClientMessage,
  isPeerIdentity,
  isPlaybackAction,
  MAX_CHAT_LENGTH,
  MAX_EMOJI_LENGTH,
  MAX_NAME_LENGTH,
  parseClientMessage,
  parsePartyId,
  type PeerIdentity,
  type PlaybackAction,
  type ServerMessage,
} from "./protocol.js";

const partyEmojis = ["🎉", "🥳", "🍿", "🎬", "✨", "🪼", "🦄", "🐳", "🦊", "🐼"];

export function getRandomEmoji(): string {
  return partyEmojis[Math.floor(Math.random() * partyEmojis.length)] as string;
}
