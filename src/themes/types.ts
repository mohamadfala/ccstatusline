import type { Chunk } from "../segments/types.js";

export interface BrandConfig {
  glyph: string;
  label: string;
  color: string;
}

export interface ThemeContext {
  terminalWidth: number;
  truecolor: boolean;
  brand: BrandConfig;
}

export interface Theme {
  id: string;
  name: string;
  multiline: boolean;
  format(chunks: Chunk[], tctx: ThemeContext): string;
}
