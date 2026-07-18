import type { PlaybackAction } from "./protocol.js";

export function timeFromEnd(duration: number, currentTime: number): number | null {
  if (!finiteDuration(duration) || !Number.isFinite(currentTime)) return null;
  return Math.max(0, duration - Math.max(0, currentTime));
}

export function targetTime(duration: number, positionFromEnd: number): number | null {
  if (!finiteDuration(duration) || !Number.isFinite(positionFromEnd)) return null;
  return Math.max(0, Math.min(duration, duration - Math.max(0, positionFromEnd)));
}

export class RemoteEchoGuard {
  readonly #pending = new Map<PlaybackAction, number>();

  mark(...events: PlaybackAction[]): void {
    for (const event of events) this.#pending.set(event, (this.#pending.get(event) ?? 0) + 1);
  }

  consume(event: PlaybackAction): boolean {
    const count = this.#pending.get(event) ?? 0;
    if (count === 0) return false;
    if (count === 1) this.#pending.delete(event);
    else this.#pending.set(event, count - 1);
    return true;
  }
}

function finiteDuration(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
