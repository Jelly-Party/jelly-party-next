/**
 * WebSocket client for party communication
 */
import { type ClientState, config, createLogger } from "jelly-party-lib";
import { type ChatMessage, partyStore } from "../stores/party";

const log = createLogger("PartyClient");

export class PartyClient {
	private ws: WebSocket | null = null;
	private partyId: string | null = null;
	private clientState: ClientState | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Connect to a party
	 */
	async connect(partyId: string, clientState: ClientState): Promise<void> {
		this.partyId = partyId;
		this.clientState = clientState;
		this.reconnectAttempts = 0;

		partyStore.setPartyId(partyId);
		await this.establishConnection();
	}

	/**
	 * Disconnect from party
	 */
	disconnect(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.partyId = null;
		partyStore.leave();
		log.info("Disconnected from party");
	}

	/**
	 * Send video event to party
	 */
	sendVideoEvent(event: "play" | "pause" | "seek", tick: number): void {
		this.send({
			type: "forward",
			data: {
				commandToForward: {
					type: "videoUpdate",
					data: {
						variant: event === "seek" ? "seek" : "playPause",
						tick,
						paused: event === "pause",
					},
				},
			},
		});
	}

	/**
	 * Send chat message
	 */
	sendChatMessage(text: string): void {
		this.send({
			type: "forward",
			data: {
				commandToForward: {
					type: "chatMessage",
					data: {
						text,
						timestamp: Date.now(),
					},
				},
			},
		});
	}

	/**
	 * Update client state (e.g., emoji change)
	 */
	updateClientState(newState: Partial<ClientState>): void {
		this.send({
			type: "clientUpdate",
			data: { newClientState: newState },
		});
	}

	private async establishConnection(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.ws = new WebSocket(config.wsUrl);

				this.ws.onopen = () => {
					log.info("WebSocket connected", { partyId: this.partyId });
					this.reconnectAttempts = 0;

					// Send join message
					this.send({
						type: "join",
						data: {
							partyId: this.partyId,
							clientState: this.clientState,
						},
					});
					resolve();
				};

				this.ws.onmessage = (event) => {
					this.handleMessage(event.data);
				};

				this.ws.onclose = () => {
					log.info("WebSocket closed");
					partyStore.setConnected(false);
					this.attemptReconnect();
				};

				this.ws.onerror = (error) => {
					log.error("WebSocket error", { error: String(error) });
					reject(error);
				};
			} catch (error) {
				log.error("Failed to create WebSocket", { error: String(error) });
				reject(error);
			}
		});
	}

	private handleMessage(data: string): void {
		try {
			const msg = JSON.parse(data);
			log.debug("Received message", { type: msg.type });

			switch (msg.type) {
				case "setUUID":
					if (this.clientState) {
						partyStore.setLocalUser(msg.data.uuid, this.clientState);
						partyStore.setConnected(true);
					}
					break;

				case "partyStateUpdate":
					partyStore.updatePartyState(msg.data.partyState);
					break;

				case "chatMessage": {
					const chatMsg: ChatMessage = {
						id: `${msg.peer.uuid}-${msg.data.timestamp}`,
						peerUuid: msg.peer.uuid,
						peerName: this.getPeerName(msg.peer.uuid),
						peerEmoji: this.getPeerEmoji(msg.peer.uuid),
						text: msg.data.text,
						timestamp: msg.data.timestamp,
					};
					partyStore.addMessage(chatMsg);
					break;
				}

				case "videoUpdate":
					// Emit event for VideoController to handle
					window.dispatchEvent(
						new CustomEvent("jellyparty:videoUpdate", { detail: msg.data }),
					);
					break;

				default:
					log.warn("Unknown message type", { type: msg.type });
			}
		} catch (e) {
			log.error("Failed to parse message", { error: String(e) });
		}
	}

	private getPeerName(uuid: string): string {
		const state = partyStore.getState();
		const peer = state.peers.find((p) => p.uuid === uuid);
		return peer?.clientState?.clientName ?? "Unknown";
	}

	private getPeerEmoji(uuid: string): string {
		const state = partyStore.getState();
		const peer = state.peers.find((p) => p.uuid === uuid);
		return peer?.clientState?.emoji ?? "🎉";
	}

	private send(message: object): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			log.warn("Cannot send message, WebSocket not open");
		}
	}

	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			log.error("Max reconnect attempts reached");
			return;
		}

		const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
		this.reconnectAttempts++;

		log.info("Reconnecting...", { attempt: this.reconnectAttempts, delay });

		this.reconnectTimeout = setTimeout(() => {
			if (this.partyId && this.clientState) {
				this.establishConnection();
			}
		}, delay);
	}
}

// Singleton instance
export const partyClient = new PartyClient();
