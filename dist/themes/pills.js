import { colorize, fg, RESET } from "../core/ansi.js";
const BORDER = {
    logo: { r: 99, g: 102, b: 241 },
    model: { r: 59, g: 130, b: 246 },
    metric: { r: 148, g: 163, b: 184 },
    good: { r: 34, g: 197, b: 94 },
    warn: { r: 245, g: 158, b: 11 },
    bad: { r: 239, g: 68, b: 68 },
    muted: { r: 148, g: 163, b: 184 },
    accent: { r: 236, g: 72, b: 153 }
};
export const pillsTheme = {
    id: "pills",
    name: "Pills",
    multiline: false,
    format(chunks, tctx) {
        return chunks
            .filter((c) => c.text || c.kind === "logo")
            .map((c) => {
            const text = c.kind === "logo" ? `${tctx.brand.glyph} ${tctx.brand.label}` : c.text;
            const border = BORDER[c.kind];
            const left = `${fg(border, tctx.truecolor)}❨${RESET}`;
            const right = `${fg(border, tctx.truecolor)}❩${RESET}`;
            return `${left}${colorize(text, c.kind, tctx.truecolor)}${right}`;
        })
            .join(" ");
    }
};
