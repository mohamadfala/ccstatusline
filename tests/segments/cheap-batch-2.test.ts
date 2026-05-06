import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { contextSegment } from "../../src/segments/context.js";
import { costSegment } from "../../src/segments/cost.js";
import { tokensSegment } from "../../src/segments/tokens.js";
import { elapsedSegment } from "../../src/segments/elapsed.js";
import { burnRateSegment } from "../../src/segments/burn-rate.js";
import { todosSegment } from "../../src/segments/todos.js";
import { parseStdin } from "../../src/core/context.js";

const ctx = parseStdin(readFileSync("tests/fixtures/sample-stdin.json", "utf8"));

describe("cheap segments — batch 2", () => {
  it("context shows bar and percent", () => {
    const r = contextSegment.render(ctx, { showRaw: true, barWidth: 5 });
    expect(r).not.toBeNull();
    const c = r as { text: string; kind: string };
    expect(c.text).toMatch(/47%/);
    expect(c.text).toContain("▓");
    expect(c.kind).toBe("good");
  });

  it("cost formats as USD", () => {
    expect(costSegment.render(ctx, {})).toEqual({ text: "$0.42", kind: "warn" });
  });

  it("tokens compacts to K", () => {
    const r = tokensSegment.render(ctx, {}) as { text: string };
    expect(r.text).toBe("↑12.3K ↓34.5K");
  });

  it("elapsed formats minutes", () => {
    const r = elapsedSegment.render(ctx, {}) as { text: string };
    expect(r.text).toBe("23m");
  });

  it("burn rate computes $/hr", () => {
    const r = burnRateSegment.render(ctx, {}) as { text: string };
    expect(r.text).toMatch(/^🔥 \$\d+\.\d{2}\/hr$/);
  });

  it("todos returns null when no session-id", () => {
    const empty = parseStdin("{}");
    expect(todosSegment.render(empty, {})).toBeNull();
  });
});
