export type Phase =
  | "extension-needed"
  | "invalid-link"
  | "awaiting-toolbar"
  | "reviewing-invite"
  | "requesting-permission"
  | "navigating"
  | "connecting"
  | "joined"
  | "sidebar-closed"
  | "recoverable-error";

export type Permission = "unknown" | "granted" | "denied";
export type ErrorKind = "permission" | "navigation" | "connection";

export type JoinState = {
  phase: Phase;
  extensionInstalled: boolean;
  permission: Permission;
  sidebar: "open" | "closed";
  tab: "join-page" | "video-page";
  party: "outside" | "connecting" | "joined";
  pendingInvite: boolean;
  error?: ErrorKind;
  note: string;
};

export type JoinAction =
  | { type: "open-valid-link" }
  | { type: "open-invalid-link" }
  | { type: "install-extension" }
  | { type: "click-toolbar" }
  | { type: "continue" }
  | { type: "grant-permission" }
  | { type: "deny-permission" }
  | { type: "video-loaded" }
  | { type: "navigation-failed" }
  | { type: "party-connected" }
  | { type: "connection-failed" }
  | { type: "close-sidebar" }
  | { type: "retry" };

export function initialState(extensionInstalled = false): JoinState {
  return {
    phase: extensionInstalled ? "awaiting-toolbar" : "extension-needed",
    extensionInstalled,
    permission: "unknown",
    sidebar: "closed",
    tab: "join-page",
    party: "outside",
    pendingInvite: true,
    note: extensionInstalled
      ? "The join page asks the peer to click the Jelly Party toolbar action."
      : "The join page offers the correct browser store and preserves the invitation in the URL fragment.",
  };
}

function rejected(state: JoinState, action: JoinAction): JoinState {
  return { ...state, note: `${action.type} is not legal while ${state.phase}.` };
}

export function transition(state: JoinState, action: JoinAction): JoinState {
  if (action.type === "open-valid-link") return initialState(state.extensionInstalled);
  if (action.type === "open-invalid-link") {
    return {
      ...initialState(state.extensionInstalled),
      phase: "invalid-link",
      pendingInvite: false,
      note: "The join page rejects malformed or incomplete invitation data without involving the extension.",
    };
  }

  switch (action.type) {
    case "install-extension":
      if (state.phase !== "extension-needed") return rejected(state, action);
      return {
        ...state,
        phase: "awaiting-toolbar",
        extensionInstalled: true,
        note: "Installation returns to the preserved magic link; the page now points at the toolbar action.",
      };

    case "click-toolbar":
      if (state.phase !== "awaiting-toolbar" && state.phase !== "sidebar-closed") {
        return rejected(state, action);
      }
      return {
        ...state,
        phase: "reviewing-invite",
        sidebar: "open",
        party: "outside",
        error: undefined,
        note: "The browser adapter opens the sidebar and consumes the invitation pending for this tab.",
      };

    case "continue":
      if (state.phase !== "reviewing-invite") return rejected(state, action);
      if (state.permission === "granted") {
        return {
          ...state,
          phase: "navigating",
          note: "Existing origin access skips the browser prompt and navigates the invitation tab.",
        };
      }
      return {
        ...state,
        phase: "requesting-permission",
        note: "The sidebar action directly opens the browser's optional-origin permission prompt.",
      };

    case "grant-permission":
      if (state.phase !== "requesting-permission") return rejected(state, action);
      return {
        ...state,
        phase: "navigating",
        permission: "granted",
        error: undefined,
        note: "Access is scoped to the destination origin; the invitation tab begins navigation.",
      };

    case "deny-permission":
      if (state.phase !== "requesting-permission") return rejected(state, action);
      return {
        ...state,
        phase: "recoverable-error",
        permission: "denied",
        error: "permission",
        note: "The sidebar explains that access was not granted and offers one explicit retry.",
      };

    case "video-loaded":
      if (state.phase !== "navigating") return rejected(state, action);
      return {
        ...state,
        phase: "connecting",
        tab: "video-page",
        party: "connecting",
        error: undefined,
        note: "The permitted page driver is ready; only now does the sidebar connect this peer to the party.",
      };

    case "navigation-failed":
      if (state.phase !== "navigating") return rejected(state, action);
      return {
        ...state,
        phase: "recoverable-error",
        error: "navigation",
        note: "The sidebar keeps the invitation and offers retry instead of stranding the peer on an error page.",
      };

    case "party-connected":
      if (state.phase !== "connecting") return rejected(state, action);
      return {
        ...state,
        phase: "joined",
        party: "joined",
        pendingInvite: false,
        note: "The sidebar shows party chat and playback status; this peer has joined.",
      };

    case "connection-failed":
      if (state.phase !== "connecting") return rejected(state, action);
      return {
        ...state,
        phase: "recoverable-error",
        party: "outside",
        error: "connection",
        note: "The video stays open while the sidebar distinguishes unavailable/expired party from a retryable connection failure.",
      };

    case "close-sidebar":
      if (state.sidebar !== "open") return rejected(state, action);
      return {
        ...state,
        phase: "sidebar-closed",
        sidebar: "closed",
        party: "outside",
        pendingInvite: true,
        error: undefined,
        note: "Closing the sidebar cancels the attempt or leaves the party; the toolbar can reopen the retained tab-scoped invitation.",
      };

    case "retry":
      if (state.phase !== "recoverable-error") return rejected(state, action);
      if (state.error === "permission") {
        return {
          ...state,
          phase: "reviewing-invite",
          error: undefined,
          note: "Retry returns to the explanation before asking for origin access again.",
        };
      }
      if (state.error === "navigation") {
        return {
          ...state,
          phase: "navigating",
          error: undefined,
          note: "Retry navigates the same invitation tab again.",
        };
      }
      return {
        ...state,
        phase: "connecting",
        party: "connecting",
        error: undefined,
        note: "Retry reconnects from the already-loaded video page without requesting origin access again.",
      };
  }
}

export function allowedActions(state: JoinState): JoinAction["type"][] {
  const common: JoinAction["type"][] = ["open-valid-link", "open-invalid-link"];
  const byPhase: Partial<Record<Phase, JoinAction["type"][]>> = {
    "extension-needed": ["install-extension"],
    "awaiting-toolbar": ["click-toolbar"],
    "reviewing-invite": ["continue", "close-sidebar"],
    "requesting-permission": ["grant-permission", "deny-permission", "close-sidebar"],
    navigating: ["video-loaded", "navigation-failed", "close-sidebar"],
    connecting: ["party-connected", "connection-failed", "close-sidebar"],
    joined: ["close-sidebar"],
    "sidebar-closed": ["click-toolbar"],
    "recoverable-error": ["retry", "close-sidebar"],
  };
  return [...(byPhase[state.phase] ?? []), ...common];
}
