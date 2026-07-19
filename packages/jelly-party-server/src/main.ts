import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import { parseClientMessage, type PeerIdentity, type ServerMessage } from "jelly-party-lib";
import { createLogger } from "./logger.js";

interface Connection {
  ws: WSContext;
  partyId?: string;
  peer?: PeerIdentity;
}

const log = createLogger("server");
const parties = new Map<string, Set<Connection>>();
const app = new Hono();
const nodeWebSocket = createNodeWebSocket({ app });

app.get("/health", (context) =>
  context.json({ status: "ok", parties: parties.size, version: "2.0.0" }),
);

app.get(
  "/",
  nodeWebSocket.upgradeWebSocket(() => {
    const connection: Connection = { ws: null as unknown as WSContext };

    return {
      onOpen(_event, ws) {
        connection.ws = ws;
      },
      onMessage(event) {
        const raw =
          typeof event.data === "string"
            ? event.data
            : event.data instanceof ArrayBuffer
              ? new TextDecoder().decode(event.data)
              : "";
        const parsed = parseClientMessage(raw);
        if (!parsed.ok) {
          send(connection, {
            type: "error",
            code: "invalid-message",
            message: parsed.error,
          });
          return;
        }

        const message = parsed.value;
        if (message.type === "ping") {
          send(connection, { type: "pong" });
          return;
        }
        if (message.type === "join") {
          leave(connection);
          connection.partyId = message.partyId;
          connection.peer = message.peer;
          const party = parties.get(message.partyId) ?? new Set<Connection>();
          party.add(connection);
          parties.set(message.partyId, party);
          send(connection, { type: "welcome", peerId: message.peer.id });
          broadcastPresence(message.partyId);
          return;
        }

        if (!connection.partyId || !connection.peer) {
          send(connection, {
            type: "error",
            code: "join-required",
            message: "Join a party before sending messages",
          });
          return;
        }

        if (message.type === "chat") {
          broadcast(connection.partyId, {
            type: "chat",
            peer: connection.peer,
            text: message.text,
            sentAt: Date.now(),
          });
          return;
        }

        broadcast(
          connection.partyId,
          {
            type: "playback",
            peerId: connection.peer.id,
            action: message.action,
            timeFromEnd: message.timeFromEnd,
          },
          connection,
        );
      },
      onClose() {
        leave(connection);
      },
      onError() {
        log.warn("WebSocket connection failed");
        leave(connection);
      },
    };
  }),
);

function leave(connection: Connection): void {
  const partyId = connection.partyId;
  if (!partyId) return;
  const party = parties.get(partyId);
  party?.delete(connection);
  connection.partyId = undefined;
  connection.peer = undefined;
  if (!party || party.size === 0) parties.delete(partyId);
  else broadcastPresence(partyId);
}

function broadcastPresence(partyId: string): void {
  const peers = [...(parties.get(partyId) ?? [])]
    .map((connection) => connection.peer)
    .filter((peer): peer is PeerIdentity => Boolean(peer));
  broadcast(partyId, { type: "presence", peers });
}

function broadcast(partyId: string, message: ServerMessage, exclude?: Connection): void {
  for (const connection of parties.get(partyId) ?? []) {
    if (connection !== exclude) send(connection, message);
  }
}

function send(connection: Connection, message: ServerMessage): void {
  try {
    connection.ws.send(JSON.stringify(message));
  } catch (error) {
    log.warn("Could not send WebSocket message", { error: String(error) });
  }
}

const port = Number.parseInt(process.env.PORT ?? "8080", 10);
const server = serve({ fetch: app.fetch, port }, (info) => {
  log.info("Jelly Party 2.0 listening", { port: info.port });
});
nodeWebSocket.injectWebSocket(server);
