import { defineConfig, presetUno } from "unocss";
import { jellyPartyPreset } from "../../config/unocss";

export default defineConfig({ presets: [presetUno(), jellyPartyPreset] });
