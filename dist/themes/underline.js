import { colorize, fg, RESET } from "../core/ansi.js";
function underlineColored(text, kind, truecolor) {
    const colored = colorize(text, kind, truecolor);
    return `\x1b[4m${colored.replace(RESET, "\x1b[24m" + RESET)}`;
}
export const underlineTheme = {
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
