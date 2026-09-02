/** The three claims the landing page and the store assets both make, kept in one place. */

const LinkIcon = [
  ["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }],
  ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }],
];
const SyncIcon = [
  ["path", { d: "M20 7h-5V2" }],
  ["path", { d: "M4 17h5v5" }],
  ["path", { d: "M5.1 9A8 8 0 0 1 18.4 5.6L20 7" }],
  ["path", { d: "M18.9 15A8 8 0 0 1 5.6 18.4L4 17" }],
];
const MessageIcon = [
  ["path", { d: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" }],
];

export interface Feature {
  title: string;
  // oxlint-disable-next-line typescript/no-explicit-any -- Lucide nodes have heterogeneous attributes.
  icon: any[];
  description: string;
  /** One line for tight surfaces such as the store screenshots. */
  short: string;
}

export const features: Feature[] = [
  {
    title: "Private link. No accounts.",
    icon: LinkIcon,
    description:
      "Every party has a long, unguessable invite link. Share it with your friends and they arrive without profiles or room codes.",
    short: "Private through one unguessable link. No sign-up.",
  },
  {
    title: "One leader. Everyone follows.",
    icon: SyncIcon,
    description:
      "The leader can switch to another video and everyone's party tab follows automatically. Hand leadership to anyone without starting a new party.",
    short: "Change videos together, or hand the lead to a friend.",
  },
  {
    title: "Watch and chat in sync",
    icon: MessageIcon,
    description:
      "Play, pause and seek carry to everyone else. See who joined and chat in the browser sidebar while the video page stays untouched.",
    short: "Shared controls and chat live beside the video.",
  },
];
