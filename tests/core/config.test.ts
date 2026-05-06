import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig, DEFAULT_CONFIG, ConfigSchema } from "../../src/core/config.js";

const makeTmp = () => mkdtempSync(join(tmpdir(), "ccsl-"));

describe("config", () => {
  it("returns defaults when file missing", () => {
    const dir = makeTmp();
    const c = loadConfig(join(dir, "missing.json"));
    expect(c.theme).toBe("minimalist");
    expect(c.brand.glyph).toBe("⬢");
    expect(c.segments).toHaveLength(7);
    rmSync(dir, { recursive: true });
  });

  it("returns defaults when file is corrupt", () => {
    const dir = makeTmp();
    const file = join(dir, "config.json");
    writeFileSync(file, "{not json", "utf8");
    const c = loadConfig(file);
    expect(c).toEqual(DEFAULT_CONFIG);
    rmSync(dir, { recursive: true });
  });

  it("round-trips", () => {
    const dir = makeTmp();
    const file = join(dir, "config.json");
    const next = ConfigSchema.parse({
      ...DEFAULT_CONFIG,
      theme: "pills",
      brand: { glyph: "◆", label: "Acme", color: "red" }
    });
    saveConfig(next, file);
    const loaded = loadConfig(file);
    expect(loaded.theme).toBe("pills");
    expect(loaded.brand.label).toBe("Acme");
    rmSync(dir, { recursive: true });
  });
});
