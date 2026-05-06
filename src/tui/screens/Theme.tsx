import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { Config } from "../../core/config.js";
import { THEMES } from "../../themes/index.js";
import { LivePreview } from "../components/LivePreview.js";

export function ThemeScreen({
  config,
  onChange,
  onBack
}: {
  config: Config;
  onChange: (c: Config) => void;
  onBack: () => void;
}): React.ReactElement {
  const items = THEMES.map((t) => ({
    label: t.name + (t.id === config.theme ? "  ✓" : ""),
    value: t.id
  }));
  return (
    <Box flexDirection="column">
      <Text dimColor>Pick a theme. Live preview updates as you arrow through.</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onHighlight={(i) => onChange({ ...config, theme: i.value as string })}
          onSelect={() => onBack()}
        />
      </Box>
      <Box marginTop={1}>
        <LivePreview config={config} />
      </Box>
    </Box>
  );
}
