/**
 * WebSocket client for party communication
 */
import {
	type ClientState,
	config,
	createLogger,
	type Peer,
} from "jelly-party-lib";
import { type ChatMessage, partyStore } from "../stores/party";

const log = createLogger("PartyClient");

export class PartyClient {
	private ws: WebSocket | null = null;
	private partyId: string | null = null;
	private clientState: ClientState | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	private syncInitialized = false;

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
		this.stopSync();
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
	 * Send video event to party (uses timeFromEnd for sync position)
	 */
	sendVideoEvent(event: "play" | "pause" | "seek", timeFromEnd: number): void {
		// Skip if not connected to party
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			log.debug("Skipping video event, not connected to party", { event });
			return;
		}

		log.debug("Sending video event", { event, timeFromEnd });
		this.send({
			type: "forward",
			data: {
				commandToForward: {
					type: "videoUpdate",
					data: {
						variant: event === "seek" ? "seek" : "playPause",
						tick: timeFromEnd,
						paused: event === "pause",
						// timestamp removed - simpler sync
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

					// Initialize video sync now that we're connected
					this.initSync();
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

				case "partyStateUpdate": {
					// Detect joins/leaves
					const previousPeers = partyStore.getState().peers;
					const newPeers = msg.data.partyState.peers as Peer[];

					// Only detect changes if we had peers before (avoids initial load spam)
					if (previousPeers.length > 0) {
						// Joins
						const joined = newPeers.filter(
							(np: Peer) => !previousPeers.find((pp) => pp.uuid === np.uuid),
						);
						for (const peer of joined) {
							partyStore.addMessage({
								id: `event-join-${peer.uuid}-${Date.now()}`,
								peerUuid: peer.uuid,
								peerName: peer.clientState.clientName,
								peerEmoji: peer.clientState.emoji,
								text: `${peer.clientState.clientName} joined the party`,
								timestamp: Date.now(),
								type: "event",
								eventType: "join",
							});
						}

						// Leaves
						const left = previousPeers.filter(
							(pp) => !newPeers.find((np: Peer) => np.uuid === pp.uuid),
						);
						for (const peer of left) {
							partyStore.addMessage({
								id: `event-leave-${peer.uuid}-${Date.now()}`,
								peerUuid: peer.uuid,
								peerName: peer.clientState.clientName,
								peerEmoji: peer.clientState.emoji,
								text: `${peer.clientState.clientName} left the party`,
								timestamp: Date.now(),
								type: "event",
								eventType: "leave",
							});
						}
					}

					partyStore.updatePartyState(msg.data.partyState);
					break;
				}

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

				case "videoUpdate": {
					const { variant, tick: timeFromEnd, paused } = msg.data;
					log.debug("Received video update", { variant, timeFromEnd, paused });

					// Add chat event for video actions
					if (msg.peer) {
						let text = "";
						let eventType: ChatMessage["eventType"];

						if (variant === "seek") {
							text = `${this.getPeerName(msg.peer.uuid)} seeked the video`;
							eventType = "seek";
						} else if (paused) {
							text = `${this.getPeerName(msg.peer.uuid)} paused the video`;
							eventType = "pause";
						} else {
							text = `${this.getPeerName(msg.peer.uuid)} played the video`;
							eventType = "play";
						}

						partyStore.addMessage({
							id: `event-video-${msg.peer.uuid}-${Date.now()}`,
							peerUuid: msg.peer.uuid,
							peerName: this.getPeerName(msg.peer.uuid),
							peerEmoji: this.getPeerEmoji(msg.peer.uuid),
							text,
							timestamp: Date.now(),
							type: "event",
							eventType,
						});
					}

					// Forward remote video command to parent frame (SyncManager)
					window.parent.postMessage(
						{
							type: "jellyparty:remoteVideoCommand",
							command: variant === "seek" ? "seek" : paused ? "pause" : "play",
							timeFromEnd,
						},
						"*",
					);
					break;
				}

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

	private initSync(): void {
		if (this.syncInitialized) return;
		this.syncInitialized = true;

		log.info("Initializing video sync (iframe mode)");

		// Listen for local video events from parent frame
		window.addEventListener("message", this.handleWindowMessage);
	}

	private stopSync(): void {
		if (!this.syncInitialized) return;
		this.syncInitialized = false;

		log.info("Stopping video sync");
		window.removeEventListener("message", this.handleWindowMessage);
	}

	private handleWindowMessage = (event: MessageEvent): void => {
		const msg = event.data;
		if (!msg || typeof msg !== "object") return;

		if (msg.type === "jellyparty:localVideoEvent") {
			const { event: videoEvent, timeFromEnd } = msg; // Rename locally to avoid conflict
			this.sendVideoEvent(videoEvent, timeFromEnd);
		}
	};
}

// Singleton instance
export const partyClient = new PartyClient();
