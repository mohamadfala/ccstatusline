import { detectTruecolor, terminalWidth } from "./core/ansi.js";
import { SEGMENTS_BY_ID } from "./segments/index.js";
import { THEMES_BY_ID } from "./themes/index.js";
export async function renderStatus(ctx, config) {
    const chunks = [];
    for (const entry of config.segments) {
        const seg = SEGMENTS_BY_ID[entry.id];
        if (!seg)
            continue;
        try {
            const opts = { ...(seg.defaults ?? {}), ...entry.options };
            const result = await seg.render(ctx, opts);
            if (!result)
                continue;
            if (Array.isArray(result))
                chunks.push(...result);
            else
                chunks.push(result);
        }
        catch (err) {
            if (process.env.CCSL_DEBUG) {
                process.stderr.write(`[ccsl] segment ${seg.id} failed: ${err.message}\n`);
            }
            chunks.push({ text: `⚠ ${seg.id}`, kind: "muted" });
        }
    }
    const theme = THEMES_BY_ID[config.theme] ?? THEMES_BY_ID["minimalist"];
    return theme.format(chunks, {
        terminalWidth: terminalWidth(),
        truecolor: detectTruecolor(),
        brand: config.brand
    });
}
