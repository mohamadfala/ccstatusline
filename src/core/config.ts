import { z } from "zod";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CONFIG_DIR, CONFIG_FILE } from "./paths.js";

export const BrandSchema = z.object({
  glyph: z.string().default("⬢"),
  label: z.string().default("Logisoft"),
  color: z.string().default("indigo")
});

export const SegmentEntrySchema = z.object({
  id: z.string(),
  options: z.record(z.unknown()).default({})
});

export const ConfigSchema = z.object({
  version: z.literal(1).default(1),
  brand: BrandSchema.default({}),
  theme: z.string().default("minimalist"),
  segments: z.array(SegmentEntrySchema).default([
    { id: "logo", options: {} },
    { id: "model", options: {} },
    { id: "context", options: {} },
    { id: "cost", options: {} },
    { id: "tokens", options: {} },
    { id: "branch", options: {} },
    { id: "dir", options: {} }
  ]),
  refresh: z.object({ intervalSeconds: z.number().int().min(1).default(5) }).default({}),
  cache: z
    .object({
      dir: z.string().nullable().default(null),
      git: z.object({ ttlMs: z.number().int().min(0).default(2000) }).default({}),
      apiHealth: z.object({ ttlMs: z.number().int().min(0).default(30_000) }).default({}),
      version: z.object({ ttlMs: z.number().int().min(0).default(3_600_000) }).default({}),
      battery: z.object({ ttlMs: z.number().int().min(0).default(5_000) }).default({})
    })
    .default({})
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = ConfigSchema.parse({});

export function loadConfig(file = CONFIG_FILE): Config {
  try {
    const raw = readFileSync(file, "utf8");
    const json = JSON.parse(raw);
    return ConfigSchema.parse(json);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_CONFIG;
    process.stderr.write(`[ccstatusline] config load failed, using defaults: ${(err as Error).message}\n`);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Config, file = CONFIG_FILE): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export { CONFIG_DIR, CONFIG_FILE };
