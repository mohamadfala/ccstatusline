import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { renderStatus } from "../../render.js";
import type { Config } from "../../core/config.js";
import { parseStdin } from "../../core/context.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_PATH = resolve(__dirname, "..", "..", "..", "tests", "fixtures", "sample-stdin.json");

let fixtureCache: string | null = null;
function fixture(): string {
  if (fixtureCache === null) {
    try {
      fixtureCache = readFileSync(FIXTURE_PATH, "utf8");
    } catch {
      fixtureCache = "{}";
    }
  }
  return fixtureCache;
}

export function LivePreview({ config }: { config: Config }): React.ReactElement {
  const [text, setText] = useState<string>("…");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctx = parseStdin(fixture());
      const out = await renderStatus(ctx, config);
      if (!cancelled) setText(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [config]);
  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1}>
      <Text>{text}</Text>
    </Box>
  );
}
