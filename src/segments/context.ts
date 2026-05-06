import type { Segment } from "./types.js";

function bar(pct: number, width = 5): string {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return "▓".repeat(filled) + "░".repeat(width - filled);
}

function compactTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export const contextSegment: Segment = {
  id: "context",
  label: "Context usage",
  group: "core",
  cost: "cheap",
  defaults: { showRaw: true, barWidth: 5 },
  render(ctx, opts) {
    const showRaw = (opts.showRaw as boolean) ?? true;
    const width = (opts.barWidth as number) ?? 5;
    const pct = Math.round(ctx.ctx.pct);
    const kind = pct >= 95 ? "bad" : pct >= 80 ? "warn" : "good";
    const raw = showRaw
      ? ` ${compactTokens(ctx.ctx.used)}/${compactTokens(ctx.ctx.total)}`
      : "";
    return { text: `${bar(pct, width)} ${pct}%${raw}`, kind };
  }
};
