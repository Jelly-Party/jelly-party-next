import { defineConfig, presetUno } from "unocss";

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
      "jelly-purple": "#9164ff",
      "jelly-pink": "#ee64f6",
      "jelly-orange": "#ff9494",
    },
  },
});
