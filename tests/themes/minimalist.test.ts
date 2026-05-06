import { describe, expect, it } from "vitest";
import { minimalistTheme } from "../../src/themes/minimalist.js";
import type { ThemeContext } from "../../src/themes/types.js";

const tctx: ThemeContext = {
  terminalWidth: 120,
  truecolor: true,
  brand: { glyph: "⬢", label: "Logisoft", color: "indigo" }
};

describe("minimalist theme", () => {
  it("renders logo chunk via brand", () => {
    const out = minimalistTheme.format([{ text: "", kind: "logo" }], tctx);
    expect(out).toContain("⬢ Logisoft");
  });

  it("joins chunks with separators", () => {
    const out = minimalistTheme.format(
      [
        { text: "", kind: "logo" },
        { text: "Opus 4.7", kind: "model" },
        { text: "47%", kind: "good" }
      ],
      tctx
    );
    expect(out).toContain("Opus 4.7");
    expect(out).toContain("47%");
    expect(out).toContain("│");
  });
});
