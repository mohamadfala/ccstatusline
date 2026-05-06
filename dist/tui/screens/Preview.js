import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text, useInput } from "ink";
import { LivePreview } from "../components/LivePreview.js";
export function PreviewScreen({ config, onBack }) {
    useInput((_, key) => {
        if (key.escape || key.return)
            onBack();
    });
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, children: "Full preview" }), _jsx(Box, { marginTop: 1, children: _jsx(LivePreview, { config: config }) }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { dimColor: true, children: "esc or enter to go back" }) })] }));
}
