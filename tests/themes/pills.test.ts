import { describe, expect, it } from "vitest";
import { pillsTheme } from "../../src/themes/pills.js";

const tctx = {
  terminalWidth: 120,
  truecolor: true,
  brand: { glyph: "⬢", label: "Logisoft", color: "indigo" }
};

describe("pills theme", () => {
  it("wraps each chunk in pill brackets", () => {
    const out = pillsTheme.format([{ text: "Opus", kind: "model" }], tctx);
    expect(out).toContain("❨");
    expect(out).toContain("❩");
    expect(out).toContain("Opus");
  });
});
