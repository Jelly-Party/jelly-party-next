/**
 * Jelly Party Shared Library
 * Common types, constants, and utilities shared across packages
 */

// Config and logging
export { type Config, config } from "./config.js";
export { createLogger, type Logger, type LogLevel, log } from "./logger.js";

// WebSocket Message Types
export interface ClientState {
	clientName: string;
	emoji: string; // Replaces avatar with configurable emoji
}

export interface Peer {
	uuid: string;
	clientState: ClientState;
}

export interface PartyState {
	isActive: boolean;
	partyId: string;
	peers: Peer[];
}

// WebSocket Messages
export type MessageType =
	| "join"
	| "setUUID"
	| "forward"
	| "clientUpdate"
	| "partyStateUpdate"
	| "chatMessage"
	| "videoUpdate";

export interface BaseMessage {
	type: MessageType;
}

export interface JoinMessage extends BaseMessage {
	type: "join";
	data: {
		partyId: string;
		clientState: ClientState;
	};
}

export interface SetUUIDMessage extends BaseMessage {
	type: "setUUID";
	data: {
		uuid: string;
	};
}

export interface ChatMessage extends BaseMessage {
	type: "chatMessage";
	peer: { uuid: string };
	data: {
		text: string;
		timestamp: number;
	};
}

export interface PartyStateUpdateMessage extends BaseMessage {
	type: "partyStateUpdate";
	data: {
		partyState: PartyState;
	};
}

export interface VideoUpdateMessage extends BaseMessage {
	type: "videoUpdate";
	data: {
		variant: "playPause" | "seek";
		tick?: number;
		paused?: boolean;
	};
}

export type WSMessage =
	| JoinMessage
	| SetUUIDMessage
	| ChatMessage
	| PartyStateUpdateMessage
	| VideoUpdateMessage;

// API Constants
export const API_VERSION = "2.0.0";

export const ENDPOINTS = {
	production: "wss://ws.jelly-party.com:8080",
	staging: "wss://staging.jelly-party.com:8080",
	development: "ws://localhost:8080",
} as const;

// Random emoji generation for new users
const PARTY_EMOJIS = [
	"🎉",
	"🎊",
	"🥳",
	"🎈",
	"🎁",
	"🍿",
	"🎬",
	"📺",
	"🎭",
	"🌟",
	"✨",
	"🦋",
	"🐙",
	"🦄",
	"🐳",
	"🦊",
	"🐼",
	"🐨",
	"🦁",
	"🐯",
];

export function getRandomEmoji(): string {
	return PARTY_EMOJIS[Math.floor(Math.random() * PARTY_EMOJIS.length)];
}
