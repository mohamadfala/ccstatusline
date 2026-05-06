import { describe, expect, it } from "vitest";
import { customSegment } from "../../src/segments/custom.js";
import { parseStdin } from "../../src/core/context.js";

const ctx = parseStdin("{}");

describe("customSegment", () => {
  it("returns null when no command configured", () => {
    expect(customSegment.render(ctx, {})).toBeNull();
  });

  it("runs the configured command and returns its output", () => {
    const r = customSegment.render(ctx, { command: "echo hello" });
    expect(r).toEqual({ text: "hello", kind: "muted" });
  });

  it("returns null when command fails", () => {
    expect(customSegment.render(ctx, { command: "false" })).toBeNull();
  });
});
