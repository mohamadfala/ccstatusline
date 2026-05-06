import { colorize, fg, RESET } from "../core/ansi.js";
import type { Chunk } from "../segments/types.js";
import type { Theme, ThemeContext } from "./types.js";

const PRIMARY_KINDS = new Set(["logo", "model", "good", "warn", "bad"]);

function row(chunks: Chunk[], tctx: ThemeContext): string {
  const sep = `${fg({ r: 55, g: 65, b: 81 }, tctx.truecolor)} │ ${RESET}`;
  return chunks
    .map((c) =>
      c.kind === "logo"
        ? colorize(`${tctx.brand.glyph} ${tctx.brand.label}`, "logo", tctx.truecolor)
        : colorize(c.text, c.kind, tctx.truecolor)
    )
    .join(sep);
}

export const multilineTheme: Theme = {
  id: "multiline",
  name: "Two-line dense",
  multiline: true,
  format(chunks, tctx) {
    const visible = chunks.filter((c) => c.text || c.kind === "logo");
    const top = visible.filter((c) => PRIMARY_KINDS.has(c.kind));
    const bottom = visible.filter((c) => !PRIMARY_KINDS.has(c.kind));
    const lines: string[] = [];
    if (top.length > 0) lines.push(row(top, tctx));
    if (bottom.length > 0) {
      const indent = colorize("└", "muted", tctx.truecolor);
      lines.push(`${indent} ${row(bottom, tctx)}`);
    }
    return lines.join("\n");
  }
};
