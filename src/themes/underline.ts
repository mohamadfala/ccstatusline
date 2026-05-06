import { colorize, fg, RESET } from "../core/ansi.js";
import type { SegmentKind } from "../segments/types.js";
import type { Theme, ThemeContext } from "./types.js";

function underlineColored(
  text: string,
  kind: SegmentKind,
  truecolor: boolean
): string {
  const colored = colorize(text, kind, truecolor);
  return `\x1b[4m${colored.replace(RESET, "\x1b[24m" + RESET)}`;
}

export const underlineTheme: Theme = {
  id: "underline",
  name: "Accent underlines",
  multiline: false,
  format(chunks, tctx) {
    const sepC = fg({ r: 75, g: 85, b: 99 }, tctx.truecolor);
    const sep = `${sepC} · ${RESET}`;
    return chunks
      .filter((c) => c.text || c.kind === "logo")
      .map((c) => {
        const text = c.kind === "logo" ? `${tctx.brand.glyph} ${tctx.brand.label}` : c.text;
        return underlineColored(text, c.kind, tctx.truecolor);
      })
      .join(sep);
  }
};
