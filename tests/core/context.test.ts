import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseStdin } from "../../src/core/context.js";

const fixture = readFileSync("tests/fixtures/sample-stdin.json", "utf8");

describe("parseStdin", () => {
  it("parses sample CC payload", () => {
    const c = parseStdin(fixture);
    expect(c.model.displayName).toBe("Opus 4.7");
    expect(c.cost.totalUsd).toBeCloseTo(0.4234);
    expect(c.ctx.pct).toBe(47);
    expect(c.ctx.inputTokens).toBe(12300);
    expect(c.outputStyle).toBe("default");
    expect(c.cwd).toBe("/Users/dev/projects/myapp");
  });

  it("returns sane defaults for empty input", () => {
    const c = parseStdin("");
    expect(c.model.displayName).toBe("Claude");
    expect(c.ctx.total).toBe(200_000);
    expect(c.cost.totalUsd).toBe(0);
  });

  it("survives malformed JSON", () => {
    const c = parseStdin("not json{");
    expect(c.model.displayName).toBe("Claude");
  });
});
