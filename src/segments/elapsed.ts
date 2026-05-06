import type { Segment } from "./types.js";

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h${m % 60}m`;
}

export const elapsedSegment: Segment = {
  id: "elapsed",
  label: "Session duration",
  group: "session",
  cost: "cheap",
  render(ctx) {
    return { text: formatMs(ctx.cost.durationMs), kind: "muted" };
  }
};
