import { describe, expect, it } from "vitest";
import { underlineTheme } from "../../src/themes/underline.js";

const tctx = {
  terminalWidth: 120,
  truecolor: true,
  brand: { glyph: "⬢", label: "Logisoft", color: "indigo" }
};

describe("underline theme", () => {
  it("emits underline escape sequences", () => {
    const out = underlineTheme.format([{ text: "Opus", kind: "model" }], tctx);
    expect(out).toContain("\x1b[4m");
    expect(out).toContain("\x1b[24m");
  });
});
