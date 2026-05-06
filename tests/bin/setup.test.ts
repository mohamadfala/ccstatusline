import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { patchSettings } from "../../src/bin/setup.js";

const makeTmp = () => mkdtempSync(join(tmpdir(), "ccsl-setup-"));

describe("patchSettings", () => {
  it("writes a new settings.json when missing", () => {
    const dir = makeTmp();
    const file = join(dir, "settings.json");
    patchSettings({ settingsFile: file, pluginRoot: "/plug" });
    const j = JSON.parse(readFileSync(file, "utf8"));
    expect(j.statusLine.type).toBe("command");
    expect(j.statusLine.command).toContain("/plug/dist/bin/statusline.js");
    rmSync(dir, { recursive: true });
  });

  it("preserves other keys + creates a backup", () => {
    const dir = makeTmp();
    const file = join(dir, "settings.json");
    writeFileSync(file, JSON.stringify({ theme: "dark", env: { FOO: "bar" } }), "utf8");
    const r = patchSettings({ settingsFile: file, pluginRoot: "/plug" });
    expect(r.backup).toBeDefined();
    const j = JSON.parse(readFileSync(file, "utf8"));
    expect(j.theme).toBe("dark");
    expect(j.env.FOO).toBe("bar");
    expect(j.statusLine).toBeDefined();
    rmSync(dir, { recursive: true });
  });

  it("refuses to overwrite a corrupt file", () => {
    const dir = makeTmp();
    const file = join(dir, "settings.json");
    writeFileSync(file, "{not json", "utf8");
    expect(() => patchSettings({ settingsFile: file, pluginRoot: "/plug" })).toThrow(
      /not valid JSON/
    );
    rmSync(dir, { recursive: true });
  });

  it("is idempotent — second run replaces statusLine", () => {
    const dir = makeTmp();
    const file = join(dir, "settings.json");
    patchSettings({ settingsFile: file, pluginRoot: "/plug" });
    patchSettings({ settingsFile: file, pluginRoot: "/plug2" });
    const j = JSON.parse(readFileSync(file, "utf8"));
    expect(j.statusLine.command).toContain("/plug2/dist/bin/statusline.js");
    rmSync(dir, { recursive: true });
  });
});
