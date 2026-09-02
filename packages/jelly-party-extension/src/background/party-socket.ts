import type {
  ClientMessage,
  PartyDestinationInput,
  PeerIdentity,
  PlaybackAction,
  ServerMessage,
} from "jelly-party-lib";

interface PartySocketHandlers {
  onMessage(message: ServerMessage): void;
  onOpen(): void;
  onClose(): void;
  onError(message: string): void;
}

export class PartySocket {
  #socket: WebSocket | null = null;

  constructor(
    private readonly url: string,
    private readonly handlers: PartySocketHandlers,
  ) {}

  connect(partyId: string, peer: PeerIdentity, destination: PartyDestinationInput): void {
    this.close();
    const socket = new WebSocket(`${this.url}/party/${encodeURIComponent(partyId)}`);
    this.#socket = socket;
    socket.addEventListener("open", () => {
      if (this.#socket !== socket) return;
      this.send({ type: "join", peer, destination });
      this.handlers.onOpen();
    });
    socket.addEventListener("message", (event) => {
      if (this.#socket !== socket) return;
      try {
        this.handlers.onMessage(JSON.parse(String(event.data)) as ServerMessage);
      } catch {
        this.handlers.onError("The party sent an unreadable message");
      }
    });
    socket.addEventListener("error", () => {
      if (this.#socket === socket) this.handlers.onError("Could not connect to the party");
    });
    socket.addEventListener("close", () => {
      if (this.#socket !== socket) return;
      this.#socket = null;
      this.handlers.onClose();
    });
  }

  chat(text: string): boolean {
    return this.send({ type: "chat", text });
  }

  playback(action: PlaybackAction, timeFromEnd: number, destinationRevision: number): void {
    this.send({ type: "playback", action, timeFromEnd, destinationRevision });
  }

  destination(destination: PartyDestinationInput): boolean {
    return this.send({ type: "destination", destination });
  }

  leader(peerId: string): boolean {
    return this.send({ type: "leader", peerId });
  }

  history(beforeId: number): void {
    this.send({ type: "history", beforeId });
  }

  close(): void {
    const socket = this.#socket;
    this.#socket = null;
    socket?.close();
  }

  private send(message: ClientMessage): boolean {
    if (this.#socket?.readyState !== WebSocket.OPEN) return false;
    this.#socket.send(JSON.stringify(message));
    return true;
  }
}
