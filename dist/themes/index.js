import { minimalistTheme } from "./minimalist.js";
import { powerlineTheme } from "./powerline.js";
import { pillsTheme } from "./pills.js";
import { underlineTheme } from "./underline.js";
import { multilineTheme } from "./multiline.js";
export const THEMES = [
    minimalistTheme,
    powerlineTheme,
    pillsTheme,
    underlineTheme,
    multilineTheme
];
export const THEMES_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));
