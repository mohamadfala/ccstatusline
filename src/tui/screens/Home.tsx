import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

export function Home({ onPick }: { onPick: (s: string) => void }): React.ReactElement {
  const items = [
    { label: "Segments", value: "segments" },
    { label: "Theme", value: "theme" },
    { label: "Brand (glyph + label)", value: "brand" },
    { label: "Live preview", value: "preview" },
    { label: "Save & quit", value: "quit" }
  ];
  return (
    <Box flexDirection="column">
      <Text dimColor>Use ↑/↓ to navigate, enter to pick, q to save & quit.</Text>
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={(i) => onPick(i.value as string)} />
      </Box>
    </Box>
  );
}
