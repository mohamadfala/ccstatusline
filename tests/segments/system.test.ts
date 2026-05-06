import { describe, expect, it, vi } from "vitest";
import { batterySegment } from "../../src/segments/battery.js";
import { apiHealthSegment } from "../../src/segments/api-health.js";
import { versionSegment } from "../../src/segments/version.js";
import { parseStdin } from "../../src/core/context.js";

const ctx = parseStdin(JSON.stringify({ version: "2.1.97" }));

describe("system segments", () => {
  it("battery returns null or a chunk (platform-dependent)", async () => {
    const r = await batterySegment.render(ctx, {});
    if (r === null) {
      expect(r).toBeNull();
    } else {
      const c = r as { text: string; kind: string };
      expect(c.text).toMatch(/^(🔌|🔋) \d+%/);
    }
  });

  it("version segment falls back gracefully when offline", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const r = await versionSegment.render(ctx, {});
    expect(r).not.toBeNull();
    expect((r as { text: string }).text).toContain("v2.1.97");
    fetchSpy.mockRestore();
  });

  it("api-health returns good/bad based on probe", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
    const r = await apiHealthSegment.render(ctx, {});
    expect(r).not.toBeNull();
    expect((r as { kind: string }).kind).toBe("good");
    fetchSpy.mockRestore();
  });
});
