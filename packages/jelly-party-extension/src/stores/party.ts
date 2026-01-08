/**
 * Party store - manages party connection state
 */

import type { ClientState, PartyState, Peer } from "jelly-party-lib";
import { derived, get, writable } from "svelte/store";

// Local user state
export interface LocalUser {
	uuid: string;
	clientState: ClientState;
}

// Party connection state
export interface PartyStoreState {
	partyId: string | null;
	isConnected: boolean;
	isConnecting: boolean;
	peers: Peer[];
	localUser: LocalUser | null;
	messages: ChatMessage[];
}

export interface ChatMessage {
	id: string;
	peerUuid: string;
	peerName: string;
	peerEmoji: string;
	text: string;
	timestamp: number;
}

// Initial state
const initialState: PartyStoreState = {
	partyId: null,
	isConnected: false,
	isConnecting: false,
	peers: [],
	localUser: null,
	messages: [],
};

// Create the store
function createPartyStore() {
	const { subscribe, set, update } = writable<PartyStoreState>(initialState);

	return {
		subscribe,

		// Set party ID when joining
		setPartyId: (partyId: string) => {
			update((s) => ({ ...s, partyId, isConnecting: true }));
		},

		// Set connection status
		setConnected: (isConnected: boolean) => {
			update((s) => ({ ...s, isConnected, isConnecting: false }));
		},

		// Set local user info (from setUUID message)
		setLocalUser: (uuid: string, clientState: ClientState) => {
			update((s) => ({ ...s, localUser: { uuid, clientState } }));
		},

		// Update party state from server
		updatePartyState: (partyState: PartyState) => {
			update((s) => ({
				...s,
				partyId: partyState.partyId,
				peers: partyState.peers,
				isConnected: partyState.isActive,
			}));
		},

		// Add chat message
		addMessage: (msg: ChatMessage) => {
			update((s) => ({
				...s,
				messages: [...s.messages, msg],
			}));
		},

		// Leave party
		leave: () => {
			set(initialState);
		},

		// Get current state (for non-reactive access)
		getState: () => get({ subscribe }),
	};
}

export const partyStore = createPartyStore();

// Derived stores for convenience
export const isInParty = derived(partyStore, ($party) => $party.isConnected);
export const peerCount = derived(partyStore, ($party) => $party.peers.length);
