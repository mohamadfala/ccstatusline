import { describe, expect, it } from "vitest";
import { THEMES, THEMES_BY_ID } from "../../src/themes/index.js";

describe("theme registry", () => {
  it("has all 5 themes", () => {
    expect(THEMES).toHaveLength(5);
  });

  it("ids are unique", () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(5);
  });

  it("by-id includes minimalist", () => {
    expect(THEMES_BY_ID["minimalist"].name).toBe("Minimalist");
  });
});
