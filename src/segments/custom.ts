import { execSync } from "node:child_process";
import type { Segment } from "./types.js";

export const customSegment: Segment = {
  id: "custom",
  label: "Custom shell command",
  group: "custom",
  cost: "expensive",
  ttl: 5000,
  defaults: { command: "", kind: "muted", timeoutMs: 1500 },
  render(_ctx, opts) {
    const cmd = (opts.command as string) ?? "";
    if (!cmd) return null;
    const timeout = (opts.timeoutMs as number) ?? 1500;
    try {
      const out = execSync(cmd, {
        encoding: "utf8",
        timeout,
        stdio: ["ignore", "pipe", "ignore"]
      }).trim();
      if (!out) return null;
      return { text: out, kind: (opts.kind as never) ?? "muted" };
    } catch {
      return null;
    }
  }
};
