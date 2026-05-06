import { basename } from "node:path";
import type { Segment } from "./types.js";

export const dirSegment: Segment = {
  id: "dir",
  label: "Working directory",
  group: "session",
  cost: "cheap",
  render(ctx) {
    return { text: basename(ctx.cwd), kind: "muted" };
  }
};
