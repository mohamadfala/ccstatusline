import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { logoSegment } from "../../src/segments/logo.js";
import { modelSegment } from "../../src/segments/model.js";
import { dirSegment } from "../../src/segments/dir.js";
import { timeSegment } from "../../src/segments/time.js";
import { outputStyleSegment } from "../../src/segments/output-style.js";
import { parseStdin } from "../../src/core/context.js";

const ctx = parseStdin(readFileSync("tests/fixtures/sample-stdin.json", "utf8"));

describe("cheap segments — batch 1", () => {
  it("logo emits empty chunk with logo kind", () => {
    const r = logoSegment.render(ctx, {});
    expect(r).toEqual({ text: "", kind: "logo" });
  });

  it("model returns display name", () => {
    expect(modelSegment.render(ctx, {})).toEqual({ text: "Opus 4.7", kind: "model" });
  });

  it("dir returns basename of cwd", () => {
    expect(dirSegment.render(ctx, {})).toEqual({ text: "myapp", kind: "muted" });
  });

  it("time returns HH:MM", () => {
    const r = timeSegment.render(ctx, {});
    expect(r).not.toBeNull();
    expect((r as { text: string }).text).toMatch(/^\d{2}:\d{2}$/);
  });

  it("output style returns style name", () => {
    expect(outputStyleSegment.render(ctx, {})).toEqual({ text: "default", kind: "muted" });
  });

  it("output style returns null when missing", () => {
    const empty = parseStdin("{}");
    expect(outputStyleSegment.render(empty, {})).toBeNull();
  });
});
