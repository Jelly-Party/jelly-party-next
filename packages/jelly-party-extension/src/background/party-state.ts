import type { PeerIdentity } from "jelly-party-lib";

export type PartyConnectionStatus = "connecting" | "connected" | "disconnected";

export interface ChatEntry {
  peer: PeerIdentity;
  text: string;
  sentAt: number;
}

export interface ActiveParty {
  partyId: string;
  tabId: number;
  tabUrl: string;
  tabTitle: string;
  status: PartyConnectionStatus;
  peers: PeerIdentity[];
  messages: ChatEntry[];
  hasVideo: boolean;
  notice: string;
}

export type PartyState = { kind: "idle" } | { kind: "active"; party: ActiveParty };

export type PartyStateEvent =
  | {
      type: "started";
      partyId: string;
      tabId: number;
      tabUrl: string;
      tabTitle: string;
      hasVideo?: boolean;
    }
  | { type: "connection"; status: PartyConnectionStatus }
  | { type: "presence"; peers: PeerIdentity[] }
  | { type: "chat"; entry: ChatEntry }
  | { type: "video"; hasVideo: boolean }
  | { type: "notice"; notice: string }
  | { type: "tab-updated"; tabId: number; tabUrl: string; tabTitle: string }
  | { type: "tab-removed"; tabId: number }
  | { type: "left" };

export type PartyView =
  | { mode: "setup" }
  | { mode: "party"; party: ActiveParty }
  | { mode: "away"; party: ActiveParty };

export const initialPartyState: PartyState = { kind: "idle" };

const maximumMessages = 200;

export function reducePartyState(state: PartyState, event: PartyStateEvent): PartyState {
  if (event.type === "started") {
    return {
      kind: "active",
      party: {
        partyId: event.partyId,
        tabId: event.tabId,
        tabUrl: event.tabUrl,
        tabTitle: event.tabTitle,
        status: "connecting",
        peers: [],
        messages: [],
        hasVideo: event.hasVideo ?? true,
        notice: "",
      },
    };
  }

  if (event.type === "left") return initialPartyState;
  if (state.kind === "idle") return state;
  if (event.type === "tab-removed") {
    return event.tabId === state.party.tabId ? initialPartyState : state;
  }
  if (event.type === "tab-updated") {
    if (event.tabId !== state.party.tabId) return state;
    return {
      kind: "active",
      party: { ...state.party, tabUrl: event.tabUrl, tabTitle: event.tabTitle },
    };
  }
  if (event.type === "connection") {
    return { kind: "active", party: { ...state.party, status: event.status } };
  }
  if (event.type === "presence") {
    return { kind: "active", party: { ...state.party, peers: event.peers } };
  }
  if (event.type === "chat") {
    return {
      kind: "active",
      party: {
        ...state.party,
        messages: [...state.party.messages, event.entry].slice(-maximumMessages),
      },
    };
  }
  if (event.type === "video") {
    return { kind: "active", party: { ...state.party, hasVideo: event.hasVideo } };
  }
  return { kind: "active", party: { ...state.party, notice: event.notice } };
}

export function partyViewForTab(state: PartyState, tabId: number | null): PartyView {
  if (state.kind === "idle") return { mode: "setup" };
  return state.party.tabId === tabId
    ? { mode: "party", party: state.party }
    : { mode: "away", party: state.party };
}
