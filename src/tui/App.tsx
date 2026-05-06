import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { Config } from "../core/config.js";
import { saveConfig } from "../core/config.js";
import { Home } from "./screens/Home.js";
import { SegmentsScreen } from "./screens/Segments.js";
import { ThemeScreen } from "./screens/Theme.js";
import { BrandScreen } from "./screens/Brand.js";
import { PreviewScreen } from "./screens/Preview.js";

type Screen = "home" | "segments" | "theme" | "brand" | "preview";

export function App({ initial }: { initial: Config }): React.ReactElement {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>("home");
  const [config, setConfig] = useState<Config>(initial);

  useInput((input, key) => {
    if (screen === "home" && (key.escape || input === "q")) {
      saveConfig(config);
      exit();
    }
  });

  const back = () => setScreen("home");

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">⬢ ccstatusline — config</Text>
      <Box marginTop={1}>
        {screen === "home" && (
          <Home
            onPick={(s) => {
              if (s === "quit") {
                saveConfig(config);
                exit();
              } else {
                setScreen(s as Screen);
              }
            }}
          />
        )}
        {screen === "segments" && (
          <SegmentsScreen config={config} onChange={setConfig} onBack={back} />
        )}
        {screen === "theme" && <ThemeScreen config={config} onChange={setConfig} onBack={back} />}
        {screen === "brand" && <BrandScreen config={config} onChange={setConfig} onBack={back} />}
        {screen === "preview" && <PreviewScreen config={config} onBack={back} />}
      </Box>
    </Box>
  );
}
