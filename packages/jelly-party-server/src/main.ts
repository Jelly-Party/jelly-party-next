import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import {
	type ClientState,
	config,
	createLogger,
	getRandomEmoji,
	type PartyState,
} from "jelly-party-lib";
import { v4 as uuid } from "uuid";
import {
	activeClients,
	activeParties,
	clientConnectionsTotal,
	messagesTotal,
	partiesCreatedTotal,
	registry,
} from "./metrics.js";

const log = createLogger("server");

// ============================================
// Types
// ============================================

interface JellyPartyWSContext {
	ws: WSContext;
	uuid: string;
	isAlive: boolean;
	partyId?: string;
	clientState?: ClientState;
	party?: Party;
	heartbeatInterval?: ReturnType<typeof setInterval>;
}

// ============================================
// Party Management
// ============================================

const parties: Record<string, Party> = {};

class Party {
	partyId: string;
	connections: JellyPartyWSContext[] = [];

	constructor(partyId: string) {
		this.partyId = partyId;
		log.info("Party created", { type: "partyCreated", partyId });
		partiesCreatedTotal.inc();
		activeParties.inc();
	}

	notifyClients(excludeId: string | undefined, msg: object) {
		const json = JSON.stringify(msg);
		log.debug("Notifying clients", {
			excludeId,
			msgType: (msg as { type: string }).type,
		});

		for (const conn of this.connections) {
			if (conn.uuid !== excludeId) {
				try {
					conn.ws.send(json);
				} catch (_e) {
					log.error("Failed to send to client", { uuid: conn.uuid });
				}
			}
		}
	}

	addClient(client: JellyPartyWSContext) {
		this.connections.push(client);
		activeClients.inc();
		clientConnectionsTotal.inc();
		this.broadcastPartyState();
	}

	removeClient(clientId: string) {
		log.debug("Removing client", { clientId });
		this.connections = this.connections.filter((c) => c.uuid !== clientId);
		activeClients.dec();

		if (this.connections.length === 0) {
			this.removeParty();
		} else {
			this.broadcastPartyState();
		}
	}

	broadcastPartyState() {
		const partyState: PartyState = {
			isActive: true,
			partyId: this.partyId,
			peers: this.connections.map((c) => ({
				uuid: c.uuid,
				clientState: c.clientState as ClientState,
			})),
		};

		this.notifyClients(undefined, {
			type: "partyStateUpdate",
			data: { partyState },
		});
	}

	removeParty() {
		log.info("Party removed", { type: "partyRemoved", partyId: this.partyId });
		activeParties.dec();
		delete parties[this.partyId];
	}
}

// ============================================
// Hono App
// ============================================

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// WebSocket endpoint
app.get(
	"/",
	upgradeWebSocket(() => {
		const ctx: JellyPartyWSContext = {
			ws: null as unknown as WSContext,
			uuid: uuid(),
			isAlive: true,
		};

		return {
			onOpen(_event, ws) {
				ctx.ws = ws;
				log.debug("Connection opened", { uuid: ctx.uuid });

				// Heartbeat
				ctx.heartbeatInterval = setInterval(() => {
					if (!ctx.isAlive) {
						ws.close();
						return;
					}
					ctx.isAlive = false;
					// Note: ping/pong handled by ws library
				}, 30000);
			},

			onMessage(event) {
				try {
					const raw =
						typeof event.data === "string" ? event.data : event.data.toString();
					const msg = JSON.parse(raw);
					const { type, data } = msg;

					log.debug("Received message", { type, uuid: ctx.uuid });
					messagesTotal.inc({ type });

					switch (type) {
						case "join": {
							const partyId = data.partyId as string;
							ctx.partyId = partyId;
							const providedState = data.clientState || {};
							ctx.clientState = {
								clientName: providedState.clientName || "Anonymous",
								emoji: providedState.emoji || getRandomEmoji(),
							};

							// Send UUID to client
							ctx.ws.send(
								JSON.stringify({ type: "setUUID", data: { uuid: ctx.uuid } }),
							);

							log.info("Client joining", {
								type: "join",
								partyId,
								clientName: ctx.clientState?.clientName,
								uuid: ctx.uuid,
							});

							if (partyId in parties) {
								const party = parties[partyId];
								party.addClient(ctx);
								ctx.party = party;
							} else {
								const party = new Party(partyId);
								party.addClient(ctx);
								parties[partyId] = party;
								ctx.party = party;
							}
							break;
						}

						case "forward": {
							if (!ctx.party) break;
							const cmd = data.commandToForward;
							cmd.peer = { uuid: ctx.uuid };
							ctx.party.notifyClients(ctx.uuid, cmd);
							break;
						}

						case "clientUpdate": {
							if (!ctx.party || !ctx.clientState) break;
							// Prevent mutation of immutable fields
							delete data.newClientState?.clientName;
							delete data.newClientState?.uuid;
							ctx.clientState = { ...ctx.clientState, ...data.newClientState };
							ctx.party.broadcastPartyState();
							break;
						}

						default:
							log.warn("Unknown message type", { type });
					}
				} catch (e) {
					log.error("Error handling message", { error: String(e) });
				}
			},

			onClose() {
				log.info("Client disconnected", { type: "disconnect", uuid: ctx.uuid });

				if (ctx.heartbeatInterval) {
					clearInterval(ctx.heartbeatInterval);
				}

				if (ctx.party) {
					ctx.party.removeClient(ctx.uuid);
				}
			},

			onError(event) {
				log.error("WebSocket error", { uuid: ctx.uuid, error: String(event) });
			},
		};
	}),
);

// ============================================
// Start Servers
// ============================================

const PORT = parseInt(process.env.PORT || "8080", 10);
const METRICS_PORT = parseInt(process.env.METRICS_PORT || "9090", 10);

log.info(`Starting server`, { version: config.version, port: PORT });

const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
	log.info(`WebSocket server listening`, { port: info.port });
});

injectWebSocket(server);

// Metrics endpoint (separate port for Prometheus scraping)
const metricsApp = new Hono();
metricsApp.get("/metrics", async (c) => {
	c.header("Content-Type", registry.contentType);
	return c.text(await registry.metrics());
});
metricsApp.get("/health", (c) => c.json({ status: "ok" }));

serve({ fetch: metricsApp.fetch, port: METRICS_PORT }, (info) => {
	log.info(`Metrics server listening`, { port: info.port });
});
