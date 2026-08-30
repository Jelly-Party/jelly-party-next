import {
  HISTORY_PAGE_SIZE,
  parseClientMessage,
  parsePartyId,
  type ChatEntry,
  type ChatHistoryPage,
  type PeerIdentity,
  type PlaybackSnapshot,
  type ServerMessage,
} from "jelly-party-lib";

interface Env {
  PARTY: DurableObjectNamespace;
}

const HISTORY_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
const SCHEMA_VERSION = 1;

interface ChatRow extends Record<string, string | number> {
  id: number;
  peerId: string;
  peerName: string;
  peerEmoji: string;
  text: string;
  sentAt: number;
}

interface ConnectionAttachment {
  peer: PeerIdentity;
  playback?: PlaybackSnapshot;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ status: "ok", version: "2.0.0" });
    }

    const partyId = /^\/party\/([^/]+)$/.exec(url.pathname)?.[1];
    if (!partyId || !parsePartyId(partyId)) return new Response("Not found", { status: 404 });
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    return env.PARTY.get(env.PARTY.idFromName(partyId)).fetch(request);
  },
};

export class Party implements DurableObject {
  constructor(
    private readonly ctx: DurableObjectState,
    _env: Env,
  ) {
    void this.ctx.blockConcurrencyWhile(async () => this.migrate());
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const parsed = parseClientMessage(
      typeof raw === "string" ? raw : new TextDecoder().decode(raw),
    );
    if (!parsed.ok)
      return this.send(socket, { type: "error", code: "invalid-message", message: parsed.error });

    const message = parsed.value;
    const peer = this.peer(socket);
    if (message.type === "join") {
      if (peer)
        return this.send(socket, {
          type: "error",
          code: "invalid-message",
          message: "Already joined",
        });
      const initializePlayback = this.peers().length === 0;
      const playback = this.playback();
      socket.serializeAttachment({ peer: message.peer, playback });
      await this.ctx.storage.deleteAlarm();
      this.send(socket, {
        type: "welcome",
        peerId: message.peer.id,
        history: this.history(),
        playback,
        initializePlayback,
      });
      this.broadcastPresence();
      return;
    }
    if (!peer) {
      return this.send(socket, {
        type: "error",
        code: "join-required",
        message: "Join a party before sending messages",
      });
    }
    if (message.type === "history")
      return this.send(socket, { type: "history", history: this.history(message.beforeId) });
    if (message.type === "chat") {
      const entry = this.saveChat(peer, message.text);
      this.broadcast({ type: "chat", entry });
      return;
    }
    const current = this.playback();
    const playback: PlaybackSnapshot = {
      playing:
        message.action === "play"
          ? true
          : message.action === "pause"
            ? false
            : (current?.playing ?? false),
      timeFromEnd: message.timeFromEnd,
      updatedAt: Date.now(),
    };
    this.rememberPlayback(playback);
    this.broadcast(
      {
        type: "playback",
        peerId: peer.id,
        action: message.action,
        timeFromEnd: message.timeFromEnd,
      },
      socket,
    );
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    if (!this.peer(socket)) return;
    this.broadcastPresence();
    if (this.peers().length === 0)
      await this.ctx.storage.setAlarm(Date.now() + HISTORY_RETENTION_MS);
  }

  async alarm(): Promise<void> {
    if (this.peers().length === 0) await this.ctx.storage.deleteAll();
  }

  private saveChat(peer: PeerIdentity, text: string): ChatEntry {
    const entry = this.ctx.storage.sql
      .exec<ChatRow>(
        `INSERT INTO chat (peer_id, peer_name, peer_emoji, text, sent_at)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id, peer_id AS peerId, peer_name AS peerName, peer_emoji AS peerEmoji, text,
                   sent_at AS sentAt`,
        peer.id,
        peer.name,
        peer.emoji,
        text,
        Date.now(),
      )
      .one();
    return toChatEntry(entry);
  }

  private history(beforeId = Number.MAX_SAFE_INTEGER): ChatHistoryPage {
    const entries = this.ctx.storage.sql
      .exec<ChatRow>(
        `SELECT id, peer_id AS peerId, peer_name AS peerName, peer_emoji AS peerEmoji, text,
                sent_at AS sentAt
         FROM chat
         WHERE id < ?
         ORDER BY id DESC
         LIMIT ?`,
        beforeId,
        HISTORY_PAGE_SIZE + 1,
      )
      .toArray();
    return {
      entries: entries.slice(0, HISTORY_PAGE_SIZE).reverse().map(toChatEntry),
      hasMore: entries.length > HISTORY_PAGE_SIZE,
    };
  }

  private migrate(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY CHECK (version > 0)
      )
    `);
    const { version } = this.ctx.storage.sql
      .exec<{ version: number }>(
        "SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations",
      )
      .one();
    if (version > SCHEMA_VERSION) throw new Error("Party storage uses a newer schema version");
    if (version === 0) {
      this.ctx.storage.sql.exec(`
        CREATE TABLE chat (
          id INTEGER PRIMARY KEY,
          peer_id TEXT NOT NULL,
          peer_name TEXT NOT NULL,
          peer_emoji TEXT NOT NULL,
          text TEXT NOT NULL,
          sent_at INTEGER NOT NULL
        );
        INSERT INTO schema_migrations (version) VALUES (1);
      `);
    }
  }

  private peers(): PeerIdentity[] {
    return this.ctx.getWebSockets().flatMap((socket) => {
      const peer = this.peer(socket);
      return peer && socket.readyState === WebSocket.OPEN ? [peer] : [];
    });
  }

  private peer(socket: WebSocket): PeerIdentity | null {
    return this.attachment(socket)?.peer ?? null;
  }

  private attachment(socket: WebSocket): ConnectionAttachment | null {
    const value = socket.deserializeAttachment();
    // Accept the previous attachment shape during a rolling deployment.
    if (isPeer(value)) return { peer: value };
    if (!isRecord(value) || !isPeer(value.peer)) return null;
    return {
      peer: value.peer,
      playback: isPlaybackSnapshot(value.playback) ? value.playback : undefined,
    };
  }

  private playback(): PlaybackSnapshot | undefined {
    let latest: PlaybackSnapshot | undefined;
    for (const socket of this.ctx.getWebSockets()) {
      const playback = this.attachment(socket)?.playback;
      if (playback && (!latest || playback.updatedAt > latest.updatedAt)) latest = playback;
    }
    return latest;
  }

  private rememberPlayback(playback: PlaybackSnapshot): void {
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = this.attachment(socket);
      if (attachment) socket.serializeAttachment({ ...attachment, playback });
    }
  }

  private broadcastPresence(): void {
    this.broadcast({ type: "presence", peers: this.peers() });
  }

  private broadcast(message: ServerMessage, exclude?: WebSocket): void {
    for (const socket of this.ctx.getWebSockets())
      if (socket !== exclude) this.send(socket, message);
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }
}

function toChatEntry(row: ChatRow): ChatEntry {
  return {
    id: row.id,
    peer: { id: row.peerId, name: row.peerName, emoji: row.peerEmoji },
    text: row.text,
    sentAt: row.sentAt,
  };
}

function isPeer(value: unknown): value is PeerIdentity {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "emoji" in value
  );
}

function isPlaybackSnapshot(value: unknown): value is PlaybackSnapshot {
  return (
    isRecord(value) &&
    typeof value.playing === "boolean" &&
    typeof value.timeFromEnd === "number" &&
    Number.isFinite(value.timeFromEnd) &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
