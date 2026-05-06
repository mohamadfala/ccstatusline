import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
export function Home({ onPick }) {
    const items = [
        { label: "Segments", value: "segments" },
        { label: "Theme", value: "theme" },
        { label: "Brand (glyph + label)", value: "brand" },
        { label: "Live preview", value: "preview" },
        { label: "Save & quit", value: "quit" }
    ];
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { dimColor: true, children: "Use \u2191/\u2193 to navigate, enter to pick, q to save & quit." }), _jsx(Box, { marginTop: 1, children: _jsx(SelectInput, { items: items, onSelect: (i) => onPick(i.value) }) })] }));
}
