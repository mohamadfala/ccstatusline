import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderStatus } from "../src/render.js";
import { parseStdin } from "../src/core/context.js";
import { ConfigSchema, DEFAULT_CONFIG } from "../src/core/config.js";

const ctx = parseStdin(readFileSync("tests/fixtures/sample-stdin.json", "utf8"));

describe("renderStatus", () => {
  it("renders default config + minimalist theme without throwing", async () => {
    const out = await renderStatus(ctx, DEFAULT_CONFIG);
    expect(out).toContain("Logisoft");
    expect(out).toContain("Opus 4.7");
    expect(out).toContain("47%");
    expect(out).toContain("$0.42");
  });

  it("falls back to minimalist when theme id is unknown", async () => {
    const cfg = ConfigSchema.parse({ ...DEFAULT_CONFIG, theme: "does-not-exist" });
    const out = await renderStatus(ctx, cfg);
    expect(out.length).toBeGreaterThan(0);
  });

  it("produces output for every shipped theme", async () => {
    const ids = ["minimalist", "powerline", "pills", "underline", "multiline"];
    for (const id of ids) {
      const cfg = ConfigSchema.parse({ ...DEFAULT_CONFIG, theme: id });
      const out = await renderStatus(ctx, cfg);
      expect(out).toContain("Logisoft");
    }
  });

  it("never throws on a misbehaving segment", async () => {
    const cfg = ConfigSchema.parse({
      ...DEFAULT_CONFIG,
      segments: [
        { id: "model", options: {} },
        { id: "does-not-exist", options: {} }
      ]
    });
    const out = await renderStatus(ctx, cfg);
    expect(out).toContain("Opus 4.7");
  });
});
