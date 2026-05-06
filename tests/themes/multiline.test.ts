import { describe, expect, it } from "vitest";
import { multilineTheme } from "../../src/themes/multiline.js";

const tctx = {
  terminalWidth: 120,
  truecolor: true,
  brand: { glyph: "⬢", label: "Logisoft", color: "indigo" }
};

describe("multiline theme", () => {
  it("emits two rows when both primary and secondary chunks present", () => {
    const out = multilineTheme.format(
      [
        { text: "", kind: "logo" },
        { text: "Opus", kind: "model" },
        { text: "47%", kind: "good" },
        { text: "main*", kind: "accent" },
        { text: "↑12K ↓34K", kind: "muted" }
      ],
      tctx
    );
    expect(out.split("\n")).toHaveLength(2);
  });

  it("emits single row when only primary chunks present", () => {
    const out = multilineTheme.format([{ text: "Opus", kind: "model" }], tctx);
    expect(out.split("\n")).toHaveLength(1);
  });
});
