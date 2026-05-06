import { colorize, fg, RESET } from "../core/ansi.js";
const SEP = " │ ";
function renderChunk(c, tctx) {
    if (c.raw)
        return c.raw;
    if (c.kind === "logo") {
        return colorize(`${tctx.brand.glyph} ${tctx.brand.label}`, "logo", tctx.truecolor);
    }
    return colorize(c.text, c.kind, tctx.truecolor);
}
export const minimalistTheme = {
    id: "minimalist",
    name: "Minimalist",
    multiline: false,
    format(chunks, tctx) {
        const sep = `${fg({ r: 55, g: 65, b: 81 }, tctx.truecolor)}${SEP}${RESET}`;
        return chunks
            .filter((c) => c.text || c.kind === "logo")
            .map((c) => renderChunk(c, tctx))
            .join(sep);
    }
};
