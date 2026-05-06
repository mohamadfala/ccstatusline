import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { THEMES } from "../../themes/index.js";
import { LivePreview } from "../components/LivePreview.js";
export function ThemeScreen({ config, onChange, onBack }) {
    const items = THEMES.map((t) => ({
        label: t.name + (t.id === config.theme ? "  ✓" : ""),
        value: t.id
    }));
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { dimColor: true, children: "Pick a theme. Live preview updates as you arrow through." }), _jsx(Box, { marginTop: 1, children: _jsx(SelectInput, { items: items, onHighlight: (i) => onChange({ ...config, theme: i.value }), onSelect: () => onBack() }) }), _jsx(Box, { marginTop: 1, children: _jsx(LivePreview, { config: config }) })] }));
}
