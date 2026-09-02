import {
  MAX_CHAT_MESSAGES,
  type PartyEntry,
  type PartyDestination,
  type PeerIdentity,
} from "jelly-party-lib";

export type PartyConnectionStatus = "connecting" | "connected" | "disconnected";

interface PartyActivity {
  id: number;
  text: string;
}

export interface ActiveParty {
  partyId: string;
  tabId: number;
  tabUrl: string;
  tabTitle: string;
  selfId: string;
  leaderId: string;
  destinationRevision: number;
  status: PartyConnectionStatus;
  peers: PeerIdentity[];
  messages: PartyEntry[];
  hasMoreHistory: boolean;
  atDestination: boolean;
  hasVideo: boolean;
  accessRequired: boolean;
  playbackBlocked: boolean;
  notice: string;
  activity: PartyActivity | null;
}

export type PartyState = { kind: "idle" } | { kind: "active"; party: ActiveParty };

export type PartyStateEvent =
  | {
      type: "started";
      partyId: string;
      tabId: number;
      tabUrl: string;
      tabTitle: string;
      selfId: string;
      hasVideo?: boolean;
    }
  | { type: "connection"; status: PartyConnectionStatus }
  | { type: "presence"; peers: PeerIdentity[]; leaderId: string }
  | {
      type: "session";
      selfId: string;
      leaderId: string;
      destination: PartyDestination;
      atDestination: boolean;
    }
  | { type: "destination"; destination: PartyDestination; atDestination: boolean }
  | { type: "chat"; entry: PartyEntry }
  | { type: "history"; entries: PartyEntry[]; hasMore: boolean }
  | { type: "video"; hasVideo: boolean; accessRequired?: boolean }
  | { type: "playback-blocked"; blocked: boolean }
  | { type: "notice"; notice: string }
  | { type: "activity"; activity: PartyActivity | null }
  | { type: "tab-destination"; tabId: number; atDestination: boolean }
  | { type: "tab-removed"; tabId: number }
  | { type: "left" };

type PartyView =
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
        selfId: event.selfId,
        leaderId: "",
        destinationRevision: 0,
        status: "connecting",
        peers: [],
        messages: [],
        hasMoreHistory: false,
        atDestination: true,
        hasVideo: event.hasVideo ?? true,
        accessRequired: false,
        playbackBlocked: false,
        notice: "",
        activity: null,
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
        accessRequired: event.atDestination ? state.party.accessRequired : false,
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
    return {
      kind: "active",
      party: { ...state.party, peers: event.peers, leaderId: event.leaderId },
    };
  }
  if (event.type === "session") {
    return {
      kind: "active",
      party: {
        ...state.party,
        selfId: event.selfId,
        leaderId: event.leaderId,
        tabUrl: event.destination.url,
        tabTitle: event.destination.title,
        destinationRevision: event.destination.revision,
        atDestination: event.atDestination,
        hasVideo: event.atDestination && state.party.hasVideo,
        accessRequired: event.atDestination && state.party.accessRequired,
      },
    };
  }
  if (event.type === "destination") {
    return {
      kind: "active",
      party: {
        ...state.party,
        tabUrl: event.destination.url,
        tabTitle: event.destination.title,
        destinationRevision: event.destination.revision,
        atDestination: event.atDestination,
        hasVideo: event.atDestination && state.party.hasVideo,
        accessRequired: event.atDestination && state.party.accessRequired,
        playbackBlocked: false,
      },
    };
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
        messages: mergeHistory(event.entries, state.party.messages),
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
        accessRequired: event.accessRequired ?? false,
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
  if (event.type === "activity") {
    return { kind: "active", party: { ...state.party, activity: event.activity } };
  }
  return { kind: "active", party: { ...state.party, notice: event.notice } };
}

function mergeHistory(older: PartyEntry[], current: PartyEntry[]): PartyEntry[] {
  const byId = new Map<number, PartyEntry>();
  for (const entry of [...older, ...current]) byId.set(entry.id, entry);
  return [...byId.values()].sort((left, right) => left.id - right.id).slice(-MAX_CHAT_MESSAGES);
}

export function partyViewForTab(state: PartyState, tabId: number | null): PartyView {
  if (state.kind === "idle") return { mode: "setup" };
  return state.party.tabId === tabId
    ? { mode: "party", party: state.party }
    : { mode: "away", party: state.party };
}
