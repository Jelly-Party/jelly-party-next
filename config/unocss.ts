export const jellyPartyPreset = {
  name: "jelly-party",
  theme: {
    colors: {
      "jelly-coral": "#ff9494",
      "jelly-pink": "#ee64f6",
      "jelly-purple": "#9164ff",
      "jelly-mint": "#8bfff4",
      "jelly-ink": "#090b18",
      "jelly-panel": "#111426",
    },
  },
  shortcuts: {
    "jp-container": "mx-auto w-full max-w-6xl px-5 md:px-8",
    "jp-brand":
      "inline-flex items-center gap-3 text-white no-underline focus-visible:outline-3 focus-visible:outline-jelly-mint focus-visible:outline-offset-3",
    "jp-logo": "block shrink-0 object-contain",
    "jp-panel": "rounded-lg border border-white/10 bg-jelly-panel text-slate-100 shadow-xl",
    "jp-button":
      "inline-flex min-h-11 items-center justify-center rounded-lg border border-transparent px-5 py-2.5 text-center font-700 no-underline transition-colors focus-visible:outline-3 focus-visible:outline-jelly-mint focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-45",
    "jp-button-primary": "jp-button bg-jelly-purple text-white hover:bg-[#7c4fe6]",
    "jp-button-secondary":
      "jp-button border border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/8",
    "jp-button-danger":
      "jp-button border border-rose-300/25 bg-transparent text-rose-200 hover:bg-rose-400/10",
    "jp-field":
      "w-full rounded-lg border border-white/15 bg-jelly-ink/80 px-3 py-2.5 text-white outline-none focus:border-jelly-mint focus:ring-2 focus:ring-jelly-mint/20",
    "jp-kicker": "text-xs font-800 tracking-widest text-jelly-mint uppercase",
    "jp-notice": "rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100",
    "jp-link":
      "font-650 text-jelly-mint underline decoration-jelly-mint/40 underline-offset-3 hover:text-white focus-visible:outline-2 focus-visible:outline-jelly-mint focus-visible:outline-offset-3",
  },
};
