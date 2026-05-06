import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { SEGMENTS } from "../../segments/index.js";
export function SegmentsScreen({ config, onChange, onBack }) {
    const all = SEGMENTS;
    const [cursor, setCursor] = useState(0);
    const enabledIds = new Set(config.segments.map((s) => s.id));
    useInput((input, key) => {
        if (key.escape)
            return onBack();
        if (key.upArrow || input === "k")
            setCursor((c) => Math.max(0, c - 1));
        if (key.downArrow || input === "j")
            setCursor((c) => Math.min(all.length - 1, c + 1));
        if (input === " ") {
            const id = all[cursor].id;
            const next = enabledIds.has(id)
                ? config.segments.filter((s) => s.id !== id)
                : [...config.segments, { id, options: {} }];
            onChange({ ...config, segments: next });
        }
        if (input === "[" || input === "]") {
            const id = all[cursor].id;
            const idx = config.segments.findIndex((s) => s.id === id);
            if (idx === -1)
                return;
            const target = idx + (input === "]" ? 1 : -1);
            if (target < 0 || target >= config.segments.length)
                return;
            const next = [...config.segments];
            [next[idx], next[target]] = [next[target], next[idx]];
            onChange({ ...config, segments: next });
        }
    });
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { dimColor: true, children: "space toggle \u00B7 [ ] reorder enabled \u00B7 esc back" }), _jsx(Box, { marginTop: 1, flexDirection: "column", children: all.map((s, i) => {
                    const on = enabledIds.has(s.id);
                    const indicator = on ? "●" : "○";
                    const arrow = i === cursor ? "▶" : " ";
                    const orderIdx = config.segments.findIndex((e) => e.id === s.id);
                    const order = on ? String(orderIdx + 1) : "";
                    return (_jsxs(Text, { color: i === cursor ? "cyan" : undefined, children: [arrow, " ", indicator, " ", order.padStart(2), " \u00B7 ", s.label, " (", s.id, ")"] }, s.id));
                }) })] }));
}
