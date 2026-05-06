import type { StatusContext } from "../core/context.js";

export type SegmentKind =
  | "logo"
  | "model"
  | "metric"
  | "good"
  | "warn"
  | "bad"
  | "muted"
  | "accent";

export interface Chunk {
  text: string;
  kind: SegmentKind;
  raw?: string;
}

export type SegmentOpts = Record<string, unknown>;

export interface Segment {
  id: string;
  label: string;
  group: "core" | "git" | "session" | "system" | "custom";
  cost: "cheap" | "expensive";
  ttl?: number;
  defaults?: SegmentOpts;
  render(
    ctx: StatusContext,
    opts: SegmentOpts
  ): Chunk | Chunk[] | null | Promise<Chunk | Chunk[] | null>;
}
