import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { saveConfig } from "../core/config.js";
import { Home } from "./screens/Home.js";
import { SegmentsScreen } from "./screens/Segments.js";
import { ThemeScreen } from "./screens/Theme.js";
import { BrandScreen } from "./screens/Brand.js";
import { PreviewScreen } from "./screens/Preview.js";
export function App({ initial }) {
    const { exit } = useApp();
    const [screen, setScreen] = useState("home");
    const [config, setConfig] = useState(initial);
    useInput((input, key) => {
        if (screen === "home" && (key.escape || input === "q")) {
            saveConfig(config);
            exit();
        }
    });
    const back = () => setScreen("home");
    return (_jsxs(Box, { flexDirection: "column", padding: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "\u2B22 ccstatusline \u2014 config" }), _jsxs(Box, { marginTop: 1, children: [screen === "home" && (_jsx(Home, { onPick: (s) => {
                            if (s === "quit") {
                                saveConfig(config);
                                exit();
                            }
                            else {
                                setScreen(s);
                            }
                        } })), screen === "segments" && (_jsx(SegmentsScreen, { config: config, onChange: setConfig, onBack: back })), screen === "theme" && _jsx(ThemeScreen, { config: config, onChange: setConfig, onBack: back }), screen === "brand" && _jsx(BrandScreen, { config: config, onChange: setConfig, onBack: back }), screen === "preview" && _jsx(PreviewScreen, { config: config, onBack: back })] })] }));
}
