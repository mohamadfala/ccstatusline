import type { Segment } from "./types.js";

export const costSegment: Segment = {
  id: "cost",
  label: "Session cost",
  group: "core",
  cost: "cheap",
  render(ctx) {
    const usd = ctx.cost.totalUsd;
    return { text: `$${usd.toFixed(2)}`, kind: "warn" };
  }
};
