import { describe, expect, it } from "vitest";
import { powerlineTheme } from "../../src/themes/powerline.js";

const tctx = {
  terminalWidth: 120,
  truecolor: true,
  brand: { glyph: "⬢", label: "Logisoft", color: "indigo" }
};

describe("powerline theme", () => {
  it("emits chevron arrows", () => {
    const out = powerlineTheme.format(
      [
        { text: "", kind: "logo" },
        { text: "Opus", kind: "model" }
      ],
      tctx
    );
    expect(out).toContain("");
  });

  it("renders brand from logo chunk", () => {
    const out = powerlineTheme.format([{ text: "", kind: "logo" }], tctx);
    expect(out).toContain("⬢ Logisoft");
  });
});
