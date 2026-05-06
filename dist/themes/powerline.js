import { bg, fg, RESET } from "../core/ansi.js";
const ARROW = "";
const KIND_BG = {
    logo: { r: 79, g: 70, b: 229 },
    model: { r: 30, g: 41, b: 59 },
    metric: { r: 31, g: 41, b: 55 },
    good: { r: 6, g: 78, b: 59 },
    warn: { r: 120, g: 53, b: 15 },
    bad: { r: 127, g: 29, b: 29 },
    muted: { r: 31, g: 41, b: 55 },
    accent: { r: 131, g: 24, b: 67 }
};
const TEXT_FG = { r: 245, g: 245, b: 245 };
export const powerlineTheme = {
    id: "powerline",
    name: "Powerline",
    multiline: false,
    format(chunks, tctx) {
        const visible = chunks.filter((c) => c.text || c.kind === "logo");
        let out = "";
        for (let i = 0; i < visible.length; i++) {
            const c = visible[i];
            const text = c.kind === "logo" ? `${tctx.brand.glyph} ${tctx.brand.label}` : c.text;
            const segBg = KIND_BG[c.kind];
            out += `${bg(segBg, tctx.truecolor)}${fg(TEXT_FG, tctx.truecolor)} ${text} `;
            const next = visible[i + 1];
            if (next) {
                const nextBg = KIND_BG[next.kind];
                out += `${bg(nextBg, tctx.truecolor)}${fg(segBg, tctx.truecolor)}${ARROW}`;
            }
            else {
                out += `${RESET}${fg(segBg, tctx.truecolor)}${ARROW}${RESET}`;
            }
        }
        return out;
    }
};
