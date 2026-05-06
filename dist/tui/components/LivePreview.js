import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { renderStatus } from "../../render.js";
import { parseStdin } from "../../core/context.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = resolve(__dirname, "..", "..", "..", "tests", "fixtures", "sample-stdin.json");
let fixtureCache = null;
function fixture() {
    if (fixtureCache === null) {
        try {
            fixtureCache = readFileSync(FIXTURE_PATH, "utf8");
        }
        catch {
            fixtureCache = "{}";
        }
    }
    return fixtureCache;
}
export function LivePreview({ config }) {
    const [text, setText] = useState("…");
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const ctx = parseStdin(fixture());
            const out = await renderStatus(ctx, config);
            if (!cancelled)
                setText(out);
        })();
        return () => {
            cancelled = true;
        };
    }, [config]);
    return (_jsx(Box, { borderStyle: "round", borderColor: "gray", paddingX: 1, children: _jsx(Text, { children: text }) }));
}
