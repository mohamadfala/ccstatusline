import { describe, expect, it } from "vitest";
import { SEGMENTS, SEGMENTS_BY_ID } from "../../src/segments/index.js";

describe("segment registry", () => {
  it("contains at least 16 entries", () => {
    expect(SEGMENTS.length).toBeGreaterThanOrEqual(16);
  });

  it("ids are unique", () => {
    const ids = SEGMENTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("expensive segments declare a ttl", () => {
    for (const s of SEGMENTS) {
      if (s.cost === "expensive") expect(s.ttl).toBeGreaterThan(0);
    }
  });

  it("by-id index round-trips", () => {
    expect(SEGMENTS_BY_ID["model"].id).toBe("model");
    expect(SEGMENTS_BY_ID["branch"].id).toBe("branch");
  });
});
