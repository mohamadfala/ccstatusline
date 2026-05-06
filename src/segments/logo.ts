import type { Segment } from "./types.js";

export const logoSegment: Segment = {
  id: "logo",
  label: "Brand logo",
  group: "core",
  cost: "cheap",
  render() {
    return { text: "", kind: "logo" };
  }
};
