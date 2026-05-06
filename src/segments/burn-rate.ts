import type { Segment } from "./types.js";

export const burnRateSegment: Segment = {
  id: "burn",
  label: "Burn rate",
  group: "session",
  cost: "cheap",
  render(ctx) {
    const hours = ctx.cost.durationMs / 3_600_000;
    if (hours < 0.05) return null;
    const rate = ctx.cost.totalUsd / hours;
    return { text: `🔥 $${rate.toFixed(2)}/hr`, kind: "warn" };
  }
};
