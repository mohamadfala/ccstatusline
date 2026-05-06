import type { Segment } from "./types.js";

export const modelSegment: Segment = {
  id: "model",
  label: "Model",
  group: "core",
  cost: "cheap",
  render(ctx) {
    return { text: ctx.model.displayName, kind: "model" };
  }
};
