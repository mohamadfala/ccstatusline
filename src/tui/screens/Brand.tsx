import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Config } from "../../core/config.js";
import { LivePreview } from "../components/LivePreview.js";

export function BrandScreen({
  config,
  onChange,
  onBack
}: {
  config: Config;
  onChange: (c: Config) => void;
  onBack: () => void;
}): React.ReactElement {
  const [field, setField] = useState<"glyph" | "label">("glyph");
  const [glyph, setGlyph] = useState(config.brand.glyph);
  const [label, setLabel] = useState(config.brand.label);

  useInput((_, key) => {
    if (key.escape) onBack();
    if (key.tab) setField((f) => (f === "glyph" ? "label" : "glyph"));
  });

  return (
    <Box flexDirection="column">
      <Text dimColor>tab cycles fields · enter commits the field · esc back</Text>
      <Box marginTop={1}>
        <Text>Glyph: </Text>
        {field === "glyph" ? (
          <TextInput
            value={glyph}
            onChange={setGlyph}
            onSubmit={(v) => onChange({ ...config, brand: { ...config.brand, glyph: v } })}
          />
        ) : (
          <Text>{glyph}</Text>
        )}
      </Box>
      <Box>
        <Text>Label: </Text>
        {field === "label" ? (
          <TextInput
            value={label}
            onChange={setLabel}
            onSubmit={(v) => onChange({ ...config, brand: { ...config.brand, label: v } })}
          />
        ) : (
          <Text>{label}</Text>
        )}
      </Box>
      <Box marginTop={1}>
        <LivePreview config={config} />
      </Box>
    </Box>
  );
}
