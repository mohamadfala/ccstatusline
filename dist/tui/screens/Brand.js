import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { LivePreview } from "../components/LivePreview.js";
export function BrandScreen({ config, onChange, onBack }) {
    const [field, setField] = useState("glyph");
    const [glyph, setGlyph] = useState(config.brand.glyph);
    const [label, setLabel] = useState(config.brand.label);
    useInput((_, key) => {
        if (key.escape)
            onBack();
        if (key.tab)
            setField((f) => (f === "glyph" ? "label" : "glyph"));
    });
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { dimColor: true, children: "tab cycles fields \u00B7 enter commits the field \u00B7 esc back" }), _jsxs(Box, { marginTop: 1, children: [_jsx(Text, { children: "Glyph: " }), field === "glyph" ? (_jsx(TextInput, { value: glyph, onChange: setGlyph, onSubmit: (v) => onChange({ ...config, brand: { ...config.brand, glyph: v } }) })) : (_jsx(Text, { children: glyph }))] }), _jsxs(Box, { children: [_jsx(Text, { children: "Label: " }), field === "label" ? (_jsx(TextInput, { value: label, onChange: setLabel, onSubmit: (v) => onChange({ ...config, brand: { ...config.brand, label: v } }) })) : (_jsx(Text, { children: label }))] }), _jsx(Box, { marginTop: 1, children: _jsx(LivePreview, { config: config }) })] }));
}
