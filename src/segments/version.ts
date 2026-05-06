import { cached } from "../core/cache.js";
import type { Segment } from "./types.js";

interface VersionCheck {
  current: string;
  latest: string | null;
}

async function fetchLatest(current: string): Promise<VersionCheck> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch(
      "https://registry.npmjs.org/@anthropic-ai/claude-code/latest",
      { signal: ctrl.signal }
    );
    if (!res.ok) return { current, latest: null };
    const j = (await res.json()) as { version?: string };
    return { current, latest: j.version ?? null };
  } catch {
    return { current, latest: null };
  } finally {
    clearTimeout(t);
  }
}

export const versionSegment: Segment = {
  id: "version",
  label: "CC version",
  group: "system",
  cost: "expensive",
  ttl: 3_600_000,
  async render(ctx) {
    const current = ctx.version ?? "?";
    const { value } = await cached("cc-version", this.ttl ?? 3_600_000, async () =>
      fetchLatest(current)
    );
    if (!value) return { text: `✦ v${current}`, kind: "muted" };
    if (value.latest && value.latest !== value.current) {
      return { text: `✦ v${value.current} → ${value.latest}`, kind: "warn" };
    }
    return { text: `✦ v${value.current}`, kind: "muted" };
  }
};
