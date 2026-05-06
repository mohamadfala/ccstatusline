import React from "react";
import { Box, Text, useInput } from "ink";
import type { Config } from "../../core/config.js";
import { LivePreview } from "../components/LivePreview.js";

export function PreviewScreen({
  config,
  onBack
}: {
  config: Config;
  onBack: () => void;
}): React.ReactElement {
  useInput((_, key) => {
    if (key.escape || key.return) onBack();
  });
  return (
    <Box flexDirection="column">
      <Text bold>Full preview</Text>
      <Box marginTop={1}>
        <LivePreview config={config} />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>esc or enter to go back</Text>
      </Box>
    </Box>
  );
}
