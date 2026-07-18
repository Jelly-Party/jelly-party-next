import type { ClientMessage, PeerIdentity, PlaybackAction, ServerMessage } from "jelly-party-lib";

export interface PartySocketHandlers {
  onMessage(message: ServerMessage): void;
  onOpen(): void;
  onClose(): void;
  onError(message: string): void;
}

export class PartySocket {
  #socket: WebSocket | null = null;
  #keepalive: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly url: string,
    private readonly handlers: PartySocketHandlers,
  ) {}

  connect(partyId: string, peer: PeerIdentity): void {
    this.close();
    const socket = new WebSocket(this.url);
    this.#socket = socket;
    socket.addEventListener("open", () => {
      if (this.#socket !== socket) return;
      this.send({ type: "join", partyId, peer });
      this.#keepalive = setInterval(() => this.send({ type: "ping" }), 20_000);
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
      this.stopKeepalive();
      this.handlers.onClose();
    });
  }

  chat(text: string): void {
    this.send({ type: "chat", text });
  }

  playback(action: PlaybackAction, timeFromEnd: number): void {
    this.send({ type: "playback", action, timeFromEnd });
  }

  close(): void {
    const socket = this.#socket;
    this.#socket = null;
    this.stopKeepalive();
    socket?.close();
  }

  private send(message: ClientMessage): void {
    if (this.#socket?.readyState === WebSocket.OPEN) this.#socket.send(JSON.stringify(message));
  }

  private stopKeepalive(): void {
    if (this.#keepalive !== null) clearInterval(this.#keepalive);
    this.#keepalive = null;
  }
}
