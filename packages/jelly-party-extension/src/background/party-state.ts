import { MAX_CHAT_MESSAGES, type ChatEntry, type PeerIdentity } from "jelly-party-lib";

export type PartyConnectionStatus = "connecting" | "connected" | "disconnected";

export interface ActiveParty {
  partyId: string;
  tabId: number;
  tabUrl: string;
  tabTitle: string;
  status: PartyConnectionStatus;
  peers: PeerIdentity[];
  messages: ChatEntry[];
  hasMoreHistory: boolean;
  atDestination: boolean;
  hasVideo: boolean;
  playbackBlocked: boolean;
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
  | { type: "history"; entries: ChatEntry[]; hasMore: boolean }
  | { type: "video"; hasVideo: boolean }
  | { type: "playback-blocked"; blocked: boolean }
  | { type: "notice"; notice: string }
  | { type: "tab-destination"; tabId: number; atDestination: boolean }
  | { type: "tab-removed"; tabId: number }
  | { type: "left" };

export type PartyView =
  | { mode: "setup" }
  | { mode: "party"; party: ActiveParty }
  | { mode: "away"; party: ActiveParty };

export const initialPartyState: PartyState = { kind: "idle" };

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
        hasMoreHistory: false,
        atDestination: true,
        hasVideo: event.hasVideo ?? true,
        playbackBlocked: false,
        notice: "",
      },
    };
  }

  if (event.type === "left") return initialPartyState;
  if (state.kind === "idle") return state;
  if (event.type === "tab-removed") {
    return event.tabId === state.party.tabId ? initialPartyState : state;
  }
  if (event.type === "tab-destination") {
    if (event.tabId !== state.party.tabId) return state;
    return {
      kind: "active",
      party: {
        ...state.party,
        atDestination: event.atDestination,
        hasVideo: event.atDestination ? state.party.hasVideo : false,
        playbackBlocked: event.atDestination ? state.party.playbackBlocked : false,
      },
    };
  }
  if (event.type === "connection") {
    return {
      kind: "active",
      party: {
        ...state.party,
        status: event.status,
        notice: event.status === "connected" ? "" : state.party.notice,
      },
    };
  }
  if (event.type === "presence") {
    return { kind: "active", party: { ...state.party, peers: event.peers } };
  }
  if (event.type === "chat") {
    return {
      kind: "active",
      party: {
        ...state.party,
        messages: [...state.party.messages, event.entry].slice(-MAX_CHAT_MESSAGES),
      },
    };
  }
  if (event.type === "history") {
    return {
      kind: "active",
      party: {
        ...state.party,
        messages: [...event.entries, ...state.party.messages].slice(-MAX_CHAT_MESSAGES),
        hasMoreHistory: event.hasMore,
      },
    };
  }
  if (event.type === "video") {
    return {
      kind: "active",
      party: {
        ...state.party,
        hasVideo: event.hasVideo,
        playbackBlocked: event.hasVideo ? state.party.playbackBlocked : false,
      },
    };
  }
  if (event.type === "playback-blocked") {
    return {
      kind: "active",
      party: { ...state.party, playbackBlocked: event.blocked },
    };
  }
  return { kind: "active", party: { ...state.party, notice: event.notice } };
}

export function partyViewForTab(state: PartyState, tabId: number | null): PartyView {
  if (state.kind === "idle") return { mode: "setup" };
  return state.party.tabId === tabId
    ? { mode: "party", party: state.party }
    : { mode: "away", party: state.party };
}
