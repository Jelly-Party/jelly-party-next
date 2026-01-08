/**
 * Prometheus metrics for Jelly Party server
 */

import { Registry, Gauge, Counter, collectDefaultMetrics } from "prom-client";

// Create a custom registry
export const registry = new Registry();

// Collect default Node.js metrics (CPU, memory, etc.)
collectDefaultMetrics({ register: registry });

// Custom metrics
export const activeParties = new Gauge({
	name: "jellyparty_active_parties",
	help: "Number of active parties",
	registers: [registry],
});

export const activeClients = new Gauge({
	name: "jellyparty_active_clients",
	help: "Number of connected clients",
	registers: [registry],
});

export const messagesTotal = new Counter({
	name: "jellyparty_messages_total",
	help: "Total messages processed",
	labelNames: ["type"] as const,
	registers: [registry],
});

export const partiesCreatedTotal = new Counter({
	name: "jellyparty_parties_created_total",
	help: "Total parties created",
	registers: [registry],
});

export const clientConnectionsTotal = new Counter({
	name: "jellyparty_client_connections_total",
	help: "Total client connections",
	registers: [registry],
});
