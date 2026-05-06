import { describe, expect, it } from "vitest";
import { colorize, detectTruecolor, fg, RESET, visibleLength } from "../../src/core/ansi.js";

describe("ansi", () => {
  it("emits truecolor escape when supported", () => {
    const s = colorize("hi", "good", true);
    expect(s).toContain("\x1b[38;2;134;239;172m");
    expect(s.endsWith(RESET)).toBe(true);
  });

  it("falls back to 256-color", () => {
    const s = colorize("hi", "warn", false);
    expect(s).toContain("\x1b[38;5;");
  });

  it("respects NO_COLOR", () => {
    expect(detectTruecolor({ NO_COLOR: "1" })).toBe(false);
  });

  it("detects COLORTERM=truecolor", () => {
    expect(detectTruecolor({ COLORTERM: "truecolor" })).toBe(true);
  });

  it("counts visible length ignoring escapes", () => {
    expect(visibleLength(colorize("hello", "good", true))).toBe(5);
  });

  it("fg returns 24-bit when truecolor", () => {
    expect(fg({ r: 1, g: 2, b: 3 }, true)).toBe("\x1b[38;2;1;2;3m");
  });
});
