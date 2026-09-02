/**
 * The store assets we publish, in the exact pixel sizes the extension stores expect.
 *
 * `/press` renders one frame per entry and `scripts/capture-store-assets.ts` screenshots each
 * frame into `static/press/<slug>.png`, so the listings always show the components we ship.
 */
export interface PressShot {
  slug: string;
  width: number;
  height: number;
  /** What the frame is for, shown beside it when a person opens /press. */
  usage: string;
}

export const pressShots = [
  {
    slug: "01-watch-together",
    width: 1280,
    height: 800,
    usage: "Chrome, Edge and Firefox listing screenshot 1",
  },
  {
    slug: "02-start-a-party",
    width: 1280,
    height: 800,
    usage: "Chrome, Edge and Firefox listing screenshot 2",
  },
  {
    slug: "03-chat-beside-the-video",
    width: 1280,
    height: 800,
    usage: "Chrome, Edge and Firefox listing screenshot 3",
  },
  {
    slug: "04-everyone-in-sync",
    width: 1280,
    height: 800,
    usage: "Chrome, Edge and Firefox listing screenshot 4",
  },
  {
    slug: "05-works-where-you-watch",
    width: 1280,
    height: 800,
    usage: "Chrome, Edge and Firefox listing screenshot 5",
  },
  { slug: "promo-small-tile", width: 440, height: 280, usage: "Chrome Web Store small promo tile" },
  { slug: "promo-marquee", width: 1400, height: 560, usage: "Chrome Web Store marquee promo tile" },
  { slug: "store-logo", width: 300, height: 300, usage: "Edge Add-ons store logo" },
] as const satisfies readonly PressShot[];

export type PressShotSlug = (typeof pressShots)[number]["slug"];

export function pressShot(slug: PressShotSlug): PressShot {
  const shot = pressShots.find((candidate) => candidate.slug === slug);
  if (!shot) throw new Error(`Unknown press shot: ${slug}`);
  return shot;
}
