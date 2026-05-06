import { minimalistTheme } from "./minimalist.js";
import { powerlineTheme } from "./powerline.js";
import { pillsTheme } from "./pills.js";
import { underlineTheme } from "./underline.js";
import { multilineTheme } from "./multiline.js";
import type { Theme } from "./types.js";

export const THEMES: Theme[] = [
  minimalistTheme,
  powerlineTheme,
  pillsTheme,
  underlineTheme,
  multilineTheme
];
export const THEMES_BY_ID: Record<string, Theme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
);
